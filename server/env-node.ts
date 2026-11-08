/**
 * Builds the `Env` binding object for Node/Vultr mode. Every Workers binding
 * the Worker module touches gets a same-shape, Vultr-side implementation:
 *
 *   CLAIM_REGISTRY   -> singleton ClaimRegistry instance; ctx.storage.sql is
 *                       node:sqlite (file-backed, like DO storage)
 *   LOCAL_ARTIFACTS  -> singleton LocalArtifacts instance on its MemoryFS
 *   MERGE_QUEUE      -> in-process serial drain (the max_concurrency = 1
 *                       semantics the confluence depends on)
 *   AI               -> Vultr Serverless Inference, when
 *                       VULTR_INFERENCE_API_KEY is set
 *   SANDBOX_GATE     -> Docker-isolated test gate (server/sandbox.ts)
 *
 * `wrangler dev`/`wrangler deploy` never import this file — the Cloudflare
 * deployment keeps its real bindings unchanged.
 */
import { DatabaseSync } from "node:sqlite";
import { makeSandboxGate, sandboxProvider } from "./sandbox";
import { vultrInference } from "./vultr-ai";

interface WorkerModule {
	fetch(request: Request, env: unknown): Promise<Response>;
	queue(batch: { messages: { body: unknown }[] }, env: unknown): Promise<void>;
}

export function buildEnv(
	worker: WorkerModule,
	classes: {
		ClaimRegistry: new (ctx: unknown, env: unknown) => object;
		LocalArtifacts: new (ctx: unknown, env: unknown) => object;
	},
) {
	const env: Record<string, unknown> = {};

	// ── ClaimRegistry: DurableObjectState ctx over node:sqlite ───────────
	const dbPath = process.env.TRIBUTARY_DB ?? ".tributary-state.db";
	const db = new DatabaseSync(dbPath);
	const sql = {
		exec(query: string, ...params: unknown[]): Iterable<unknown> {
			const single = query.trim().replace(/;+\s*$/, "");
			// initSchema is the only multi-statement exec; run it directly.
			if (single.includes(";")) {
				db.exec(query);
				return [];
			}
			const stmt = db.prepare(single);
			if (stmt.columns().length === 0) {
				stmt.run(...(params as never[]));
				return [];
			}
			return stmt.all(...(params as never[])) as unknown[];
		},
	};
	const ctx = {
		storage: { sql },
		// The shim's exec is synchronous, so the callback completes inline.
		blockConcurrencyWhile(cb: () => unknown) {
			void cb();
		},
		waitUntil() {},
	};

	let registry: object | undefined;
	env.CLAIM_REGISTRY = {
		idFromName: () => "global",
		get: () => (registry ??= new classes.ClaimRegistry(ctx, env)),
	};

	let artifacts: object | undefined;
	env.LOCAL_ARTIFACTS = {
		idFromName: () => "default",
		get: () => (artifacts ??= new classes.LocalArtifacts(ctx, env)),
	};

	// ── MERGE_QUEUE: serial in-process drain ─────────────────────────────
	let tail: Promise<void> = Promise.resolve();
	env.MERGE_QUEUE = {
		send(body: unknown) {
			const run = tail.then(() => worker.queue({ messages: [{ body }] }, env));
			tail = run.then(
				() => undefined,
				(err) => console.error("[Queue] drain failed:", err),
			);
			// Queue.send resolves once the message is accepted, not after the
			// consumer finishes. Returning `run` deadlocks resolver retries,
			// which are sent from inside the queue handler itself.
			return Promise.resolve();
		},
	};

	// ── AI: Vultr Serverless Inference (primary for the rapids) ─────────
	if (process.env.VULTR_INFERENCE_API_KEY) {
		env.AI = vultrInference();
	}

	// ── SANDBOX_GATE: merged tree checks run in an isolated container ────
	const gate = makeSandboxGate();
	if (gate) env.SANDBOX_GATE = gate;

	// ── RUNTIME_INFO: provider self-description for GET /config ─────────
	env.RUNTIME_INFO = {
		mode: "node/vultr",
		sandbox: sandboxProvider(),
		ai: process.env.VULTR_INFERENCE_API_KEY
			? {
					provider: "vultr",
					model: process.env.VULTR_INFERENCE_MODEL ?? "vultr/glm-5.3-flash",
				}
			: undefined,
	};

	return env;
}
