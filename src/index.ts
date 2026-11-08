import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";
import { DurableObject } from "cloudflare:workers";

import { resolveConflict } from "./resolver";
import { mergeTaskIntoTrunk } from "./merge";
import { DASHBOARD_HTML } from "./dashboard";
import { LocalArtifacts } from "./artifacts-local";
import {
	enqueueAgentTask,
	prepareAgentTask,
	runAgentTask,
	type TaskRecord,
} from "./agent";

export { LocalArtifacts };

/**
 * Tributary — the coordination Worker.
 *
 * The pipeline is a river. Each agent's change is a **tributary**; the verified
 * main branch is the **trunk**; the stages along the way are named for the
 * water. Stage 1, the **watershed** (`ClaimRegistry`), refuses and queues
 * overlapping footprints before any work starts. Stage 2, the **confluence**
 * (`MERGE_QUEUE`), is the serial place where finished tributaries join the
 * trunk — each landed only when a real three-way merge and the test gate are
 * green. Stage 3, the **rapids** (`resolveConflict`), is the last resort for
 * the residual conflicts that survived both.
 *
 * Infrastructure identifiers keep their original names — `MERGE_QUEUE`,
 * `merge-queue`, `ClaimRegistry` — because they are plumbing, not prose; the
 * river vocabulary lives in comments, log labels, and the docs.
 */
export interface Env {
	// Real Cloudflare Artifacts binding: remote-only, requires a Workers paid
	// plan, and has no local simulator, so it is only declared by configs that
	// target a paid account. Absent in the default (offline) config, where
	// LOCAL_ARTIFACTS serves the same surface instead. See src/artifacts-local.ts.
	ARTIFACTS?: any;
	LOCAL_ARTIFACTS?: DurableObjectNamespace<LocalArtifacts>;
	CLAIM_REGISTRY: DurableObjectNamespace<ClaimRegistry>;
	MERGE_QUEUE: Queue;
	/** Workers AI binding — present when [ai] is configured in wrangler.toml. */
	AI?: import("./resolver").AiBinding;
	/**
	 * Sandboxed gate runner — set by the Node/Vultr runtime
	 * (server/env-node.ts). When present, the merged tree's checks execute
	 * inside an isolated container instead of in-process. Unset under
	 * wrangler, where the in-process gates run as before.
	 */
	SANDBOX_GATE?: import("./merge").SandboxGate;
	/**
	 * Runtime self-description served at GET /config — set by the Node/Vultr
	 * entry so the UI can show which providers are actually live (inference
	 * model, sandbox mode). Absent under wrangler.
	 */
	RUNTIME_INFO?: {
		mode: string;
		sandbox: string;
		ai?: { provider: string; model: string };
	};
}

const TRUNK_NAME = "ejs-trunk";
const TRUNK_SOURCE = {
	url: "https://github.com/mde/ejs.git",
	branch: "main",
};

/** Bound on the persisted event log. Replay reads whatever is retained. */
const EVENT_CAP = 2000;
/** Keep-alive cadence for SSE connections (proxies drop idle streams). */
const HEARTBEAT_MS = 15_000;

/** The offline Artifacts provider, used when the real binding is not bound. */
function localArtifacts(env: Env): any {
	if (!env.LOCAL_ARTIFACTS) {
		throw new Error(
			"No Artifacts provider: bind LOCAL_ARTIFACTS or add the [[artifacts]] binding.",
		);
	}
	return env.LOCAL_ARTIFACTS.get(env.LOCAL_ARTIFACTS.idFromName("default"));
}

interface ArtifactRepoHandle {
	remote?: string;
	info(): Promise<{ remote?: string }>;
	createToken(
		scope: string,
		ttlSeconds: number,
	): Promise<{ plaintext: string }>;
}

async function repoCreds(env: Env, name: string) {
	using repo = (await env.ARTIFACTS.get(name)) as ArtifactRepoHandle;
	const remote = repo.remote ?? (await repo.info()).remote;
	if (!remote) throw new Error(`No git remote for Artifacts repo ${name}`);
	const token = await repo.createToken("write", 3600);
	return { remote, token: token.plaintext };
}

interface Claim {
	agentId: string;
	files: string[];
	expiresAt: number;
}

interface QueuedClaim {
	agentId: string;
	files: string[];
	ttlSeconds: number;
}

/** One entry in the bounded activity log the dashboard renders. */
export interface RegistryEvent {
	id: number;
	at: number;
	kind:
		"claim" | "queued" | "release" | "merge" | "conflict" | "resolver" | "task";
	agentId?: string;
	detail: string;
}

/** Context the confluence hands back when a tributary lands or is rejected. */
export interface MergeResult {
	success: boolean;
	agentId?: string;
	repo?: string;
	commit?: string;
	reason?: string;
}

/**
 * The watershed: partitions the flow so two tributaries never hold the same
 * file at once. Non-overlapping footprints are granted immediately;
 * overlapping ones are queued and promoted when the holder releases.
 */
export class ClaimRegistry extends DurableObject {
	private claims: Map<string, Claim> = new Map();
	private waitlist: QueuedClaim[] = [];
	/**
	 * file -> the agents currently holding it. The overlap check is the hot
	 * path once there are many agents, so it reads this index instead of
	 * scanning every claim's file list: O(files), not O(claims x files).
	 */
	private fileIndex: Map<string, Set<string>> = new Map();
	/** Open SSE connections, keyed by an opaque subscriber id. */
	private subscribers: Map<
		number,
		ReadableStreamDefaultController<Uint8Array>
	> = new Map();
	private heartbeats: Map<number, ReturnType<typeof setInterval>> = new Map();
	private subscriberSeq = 0;
	private encoder = new TextEncoder();
	/** Waitlist insertion order, so promotion stays FIFO across restarts. */
	private waitlistSeq = 0;
	private eventSeq = 0;
	private stats = {
		conflictsPrevented: 0,
		resolverInvocations: 0,
		rejections: 0,
		trunkStatus: "green",
		totalMerges: 0,
		lastMerge: null as null | {
			agentId?: string;
			repo?: string;
			commit?: string;
			at: number;
		},
	};

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.blockConcurrencyWhile(async () => {
			this.initSchema();
			this.loadFromSql();
		});
	}

	private get sql() {
		return this.ctx.storage.sql;
	}

	/**
	 * SQLite schema. Every mutation writes only the rows it changed — the old
	 * `save()` rewrote claims, waitlist, stats and the whole event array on
	 * every claim and release, which is write amplification that grows with
	 * the log.
	 */
	private initSchema() {
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS claims (
				agent_id TEXT PRIMARY KEY,
				files TEXT NOT NULL,
				expires_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS waitlist (
				agent_id TEXT PRIMARY KEY,
				files TEXT NOT NULL,
				ttl_seconds INTEGER NOT NULL,
				seq INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS events (
				id INTEGER PRIMARY KEY,
				at INTEGER NOT NULL,
				kind TEXT NOT NULL,
				agent_id TEXT,
				detail TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS meta (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS tasks (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				goal TEXT NOT NULL,
				footprint TEXT NOT NULL,
				status TEXT NOT NULL,
				plan TEXT,
				edits TEXT,
				before TEXT,
				repo TEXT,
				commit_hash TEXT,
				gate TEXT,
				resolution TEXT,
				reason TEXT,
				history TEXT,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);
		`);
		// Existing databases pick up the new columns idempotently.
		for (const col of ["before", "history"]) {
			try {
				this.sql.exec(`ALTER TABLE tasks ADD COLUMN ${col} TEXT`);
			} catch {
				// already present
			}
		}
	}

	private loadFromSql() {
		for (const row of this.sql.exec(
			"SELECT agent_id, files, expires_at FROM claims",
		)) {
			const claim: Claim = {
				agentId: row.agent_id as string,
				files: JSON.parse(row.files as string) as string[],
				expiresAt: row.expires_at as number,
			};
			this.claims.set(claim.agentId, claim);
			this.indexClaim(claim);
		}
		for (const row of this.sql.exec(
			"SELECT agent_id, files, ttl_seconds, seq FROM waitlist ORDER BY seq",
		)) {
			this.waitlist.push({
				agentId: row.agent_id as string,
				files: JSON.parse(row.files as string) as string[],
				ttlSeconds: row.ttl_seconds as number,
			});
			this.waitlistSeq = Math.max(this.waitlistSeq, row.seq as number);
		}
		// Merge over defaults so fields added in later versions start sane.
		const statsRow = [
			...this.sql.exec("SELECT value FROM meta WHERE key = 'stats'"),
		][0];
		if (statsRow) {
			this.stats = { ...this.stats, ...JSON.parse(statsRow.value as string) };
		}
		const maxEvent = [
			...this.sql.exec("SELECT COALESCE(MAX(id), 0) AS m FROM events"),
		][0];
		this.eventSeq = (maxEvent?.m as number) ?? 0;
	}

	private saveStats() {
		this.sql.exec(
			"INSERT OR REPLACE INTO meta (key, value) VALUES ('stats', ?)",
			JSON.stringify(this.stats),
		);
	}

	private indexClaim(claim: Claim) {
		for (const file of claim.files) {
			let holders = this.fileIndex.get(file);
			if (!holders) {
				holders = new Set();
				this.fileIndex.set(file, holders);
			}
			holders.add(claim.agentId);
		}
	}

	private putClaim(claim: Claim) {
		this.claims.set(claim.agentId, claim);
		this.indexClaim(claim);
		this.sql.exec(
			"INSERT OR REPLACE INTO claims (agent_id, files, expires_at) VALUES (?, ?, ?)",
			claim.agentId,
			JSON.stringify(claim.files),
			claim.expiresAt,
		);
	}

	private dropClaim(agentId: string) {
		const claim = this.claims.get(agentId);
		this.claims.delete(agentId);
		if (claim) {
			for (const file of claim.files) {
				const holders = this.fileIndex.get(file);
				if (!holders) continue;
				holders.delete(agentId);
				if (holders.size === 0) this.fileIndex.delete(file);
			}
		}
		this.sql.exec("DELETE FROM claims WHERE agent_id = ?", agentId);
	}

	private setWaitlistEntry(entry: QueuedClaim & { seq: number }) {
		this.sql.exec(
			"INSERT OR REPLACE INTO waitlist (agent_id, files, ttl_seconds, seq) VALUES (?, ?, ?, ?)",
			entry.agentId,
			JSON.stringify(entry.files),
			entry.ttlSeconds,
			entry.seq,
		);
	}

	private removeWaitlistEntry(agentId: string) {
		this.sql.exec("DELETE FROM waitlist WHERE agent_id = ?", agentId);
	}

	/**
	 * Append one row to the activity log. Append-only: the live feed reads the
	 * last 40 rows, `?replay` reads the whole retained history, and neither
	 * depends on rewriting the log.
	 */
	private recordEvent(
		kind: RegistryEvent["kind"],
		detail: string,
		agentId?: string,
	) {
		const id = ++this.eventSeq;
		this.sql.exec(
			"INSERT INTO events (id, at, kind, agent_id, detail) VALUES (?, ?, ?, ?, ?)",
			id,
			Date.now(),
			kind,
			agentId ?? null,
			detail,
		);
		// Bound the log so a long-lived registry cannot grow without limit.
		if (id > EVENT_CAP) {
			this.sql.exec("DELETE FROM events WHERE id <= ?", id - EVENT_CAP);
		}
	}

	private checkOverlap(files: string[], self?: string): string | null {
		const now = Date.now();
		for (const [agentId, claim] of [...this.claims]) {
			if (claim.expiresAt < now) this.dropClaim(agentId);
		}

		// Index read: only the current holders of these exact files matter.
		for (const file of files) {
			const holders = this.fileIndex.get(file);
			if (!holders) continue;
			for (const agentId of holders) {
				if (agentId !== self) return agentId;
			}
		}
		return null;
	}

	/**
	 * Grant the first waitlisted claim that no longer overlaps. Called after a
	 * release (and after expiry cleanup), so queued agents land automatically
	 * instead of waiting for their client to retry — and the dashboard
	 * waitlist actually drains.
	 */
	private promoteWaitlist() {
		const idx = this.waitlist.findIndex(
			(w) => !this.checkOverlap(w.files, w.agentId),
		);
		if (idx === -1) return;
		const [next] = this.waitlist.splice(idx, 1);
		this.removeWaitlistEntry(next.agentId);
		this.putClaim({
			agentId: next.agentId,
			files: next.files,
			expiresAt: Date.now() + (next.ttlSeconds ?? 300) * 1000,
		});
		this.recordEvent(
			"claim",
			`promoted from waitlist: ${next.files.join(", ")}`,
			next.agentId,
		);
	}

	async requestClaim(
		agentId: string,
		files: string[],
		ttlSeconds: number = 300,
	) {
		const conflictingAgent = this.checkOverlap(files, agentId);
		if (conflictingAgent) {
			// Skip re-queueing an agent that is already waiting (client retries).
			if (!this.waitlist.some((w) => w.agentId === agentId)) {
				const entry = {
					agentId,
					files,
					ttlSeconds,
					seq: ++this.waitlistSeq,
				};
				this.waitlist.push(entry);
				this.setWaitlistEntry(entry);
				this.stats.conflictsPrevented++;
				this.recordEvent(
					"queued",
					`overlaps ${conflictingAgent} on ${files.join(", ")} — queued, not failed`,
					agentId,
				);
			}
			this.saveStats();
			this.broadcastState();
			return { status: "queued", conflictingAgent };
		}

		// Grant — and drop any waitlist entry this agent held from earlier
		// retries, so the dashboard waitlist reflects real pending work.
		if (this.waitlist.some((w) => w.agentId === agentId)) {
			this.waitlist = this.waitlist.filter((w) => w.agentId !== agentId);
			this.removeWaitlistEntry(agentId);
		}

		this.putClaim({
			agentId,
			files,
			expiresAt: Date.now() + ttlSeconds * 1000,
		});
		this.recordEvent("claim", `granted ${files.join(", ")}`, agentId);
		this.saveStats();
		this.broadcastState();
		return { status: "granted" };
	}

	async releaseClaim(agentId: string) {
		const claim = this.claims.get(agentId);
		this.dropClaim(agentId);
		this.promoteWaitlist();

		this.recordEvent(
			"release",
			claim ? `released ${claim.files.join(", ")}` : "released claim",
			agentId,
		);
		this.saveStats();
		this.broadcastState();
		return { status: "released" };
	}

	async recordMergeResult(result: MergeResult) {
		this.stats.totalMerges++;
		if (result.success) {
			this.stats.trunkStatus = "green";
			this.stats.lastMerge = {
				agentId: result.agentId,
				repo: result.repo,
				commit: result.commit,
				at: Date.now(),
			};
			this.recordEvent(
				"merge",
				`landed ${result.repo ?? "task"} on trunk` +
					(result.commit ? ` (${result.commit.slice(0, 8)})` : ""),
				result.agentId,
			);
		} else {
			// Trunk never goes red: the queue rejected the change before it
			// landed. Rejections are normal operation, not trunk damage.
			this.stats.rejections++;
			this.stats.resolverInvocations++;
			this.recordEvent(
				"conflict",
				`${result.repo ?? "task"} did not land: ${result.reason ?? "conflict"}`,
				result.agentId,
			);
			this.recordEvent(
				"resolver",
				`residual conflict for ${result.agentId ?? "agent"} routed to resolver`,
				result.agentId,
			);
		}
		this.saveStats();
		this.broadcastState();
	}

	/** One status frame — the exact body `GET /registry/status` returns. */
	private statusSnapshot() {
		this.checkOverlap([]); // Trigger expiration cleanup
		const events = [
			...this.sql.exec(
				"SELECT id, at, kind, agent_id, detail FROM events ORDER BY id DESC LIMIT 40",
			),
		].map((row) => ({
			id: row.id as number,
			at: row.at as number,
			kind: row.kind as RegistryEvent["kind"],
			agentId: (row.agent_id as string | null) ?? undefined,
			detail: row.detail as string,
		}));
		return {
			activeClaims: Array.from(this.claims.values()),
			waitlist: this.waitlist,
			stats: this.stats,
			// Newest first — the dashboard feed renders this directly.
			events,
			// Recent tasks — the product surface's primary objects.
			tasks: this.listTaskRows(50),
		};
	}

	async getStatus() {
		return this.statusSnapshot();
	}

	/**
	 * Server-sent events: a long-lived response stream the registry pushes to
	 * on every change, so the dashboard never polls. Replaceable by a
	 * hibernating WebSocket if idle cost ever matters — this keeps the DO awake
	 * for the life of the connection.
	 */
	async subscribe(): Promise<Response> {
		const snapshot = this.sseFrame("snapshot", this.statusSnapshot());
		let subId = 0;
		const stream = new ReadableStream<Uint8Array>({
			start: (controller) => {
				subId = ++this.subscriberSeq;
				this.subscribers.set(subId, controller);
				controller.enqueue(this.encoder.encode(snapshot));
				const heartbeat = setInterval(() => {
					try {
						controller.enqueue(this.encoder.encode(": ping\n\n"));
					} catch {
						this.removeSubscriber(subId);
					}
				}, HEARTBEAT_MS);
				this.heartbeats.set(subId, heartbeat);
			},
			cancel: () => this.removeSubscriber(subId),
		});
		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			},
		});
	}

	private sseFrame(event: string, data: unknown) {
		return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
	}

	/** Push current state to every open SSE connection (no-op when idle). */
	private broadcastState() {
		if (this.subscribers.size === 0) return;
		const frame = this.encoder.encode(
			this.sseFrame("update", this.statusSnapshot()),
		);
		for (const [id, controller] of [...this.subscribers]) {
			try {
				controller.enqueue(frame);
			} catch {
				this.removeSubscriber(id);
			}
		}
	}

	private removeSubscriber(id: number) {
		const heartbeat = this.heartbeats.get(id);
		if (heartbeat) {
			clearInterval(heartbeat);
			this.heartbeats.delete(id);
		}
		const controller = this.subscribers.get(id);
		this.subscribers.delete(id);
		try {
			controller?.close();
		} catch {
			// already closed by the client
		}
	}

	// ── tasks ────────────────────────────────────────────────────────────────
	//
	// A task is the product-level entity: a goal dispatched to an agent that
	// flows through the pipeline and carries its artifacts (plan, edits,
	// commit, gate evidence, resolution) as fields the UI renders.

	/** Statuses that move the feed — quiet transitions stay out of the log. */
	private static EVENTFUL_STATUS = new Set([
		"landed",
		"rejected",
		"resolving",
		"failed",
	]);

	async createTask(t: {
		id: string;
		agentId: string;
		goal: string;
		footprint: string[];
		edits?: Record<string, string>;
	}): Promise<TaskRecord> {
		const now = Date.now();
		const task: TaskRecord = {
			id: t.id,
			agentId: t.agentId,
			goal: t.goal,
			footprint: t.footprint,
			status: "planning",
			edits: t.edits,
			createdAt: now,
			updatedAt: now,
		};
		this.sql.exec(
			"INSERT INTO tasks (id, agent_id, goal, footprint, status, edits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			task.id,
			task.agentId,
			task.goal,
			JSON.stringify(task.footprint),
			task.status,
			task.edits ? JSON.stringify(task.edits) : null,
			now,
			now,
		);
		this.recordEvent("task", `dispatched: ${t.goal.slice(0, 96)}`, t.agentId);
		this.broadcastState();
		return task;
	}

	private taskFromRow(row: Record<string, unknown>): TaskRecord {
		const json = (v: unknown) =>
			v == null ? undefined : JSON.parse(v as string);
		return {
			id: row.id as string,
			agentId: row.agent_id as string,
			goal: row.goal as string,
			footprint: json(row.footprint) ?? [],
			status: row.status as string,
			plan: json(row.plan),
			edits: json(row.edits),
			before: json(row.before),
			repo: (row.repo as string) ?? undefined,
			commit: (row.commit_hash as string) ?? undefined,
			gate: json(row.gate),
			resolution: json(row.resolution),
			reason: (row.reason as string) ?? undefined,
			history: json(row.history),
			createdAt: row.created_at as number,
			updatedAt: row.updated_at as number,
		};
	}

	async getTask(id: string): Promise<TaskRecord | null> {
		const row = [...this.sql.exec("SELECT * FROM tasks WHERE id = ?", id)][0];
		return row ? this.taskFromRow(row) : null;
	}

	private listTaskRows(limit = 50): TaskRecord[] {
		return [
			...this.sql.exec(
				"SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
				limit,
			),
		].map((row) => this.taskFromRow(row));
	}

	async listTasks(limit = 50): Promise<TaskRecord[]> {
		return this.listTaskRows(limit);
	}

	async updateTask(
		id: string,
		patch: Partial<TaskRecord>,
	): Promise<TaskRecord | null> {
		const existing = await this.getTask(id);
		if (!existing) return null;
		const next: TaskRecord = {
			...existing,
			...patch,
			updatedAt: Date.now(),
		};
		// Status transitions accumulate a timeline the drawer renders.
		if (next.status !== existing.status) {
			next.history = [
				...(existing.history ?? [
					{ status: existing.status, at: existing.createdAt },
				]),
				{
					status: next.status,
					at: next.updatedAt,
					reason: next.reason,
				},
			];
		}
		this.sql.exec(
			"UPDATE tasks SET status = ?, footprint = ?, plan = ?, edits = ?, before = ?, repo = ?, commit_hash = ?, gate = ?, resolution = ?, reason = ?, history = ?, updated_at = ? WHERE id = ?",
			next.status,
			JSON.stringify(next.footprint),
			next.plan ? JSON.stringify(next.plan) : null,
			next.edits ? JSON.stringify(next.edits) : null,
			next.before ? JSON.stringify(next.before) : null,
			next.repo ?? null,
			next.commit ?? null,
			next.gate ? JSON.stringify(next.gate) : null,
			next.resolution ? JSON.stringify(next.resolution) : null,
			next.reason ?? null,
			next.history ? JSON.stringify(next.history) : null,
			next.updatedAt,
			id,
		);
		if (
			next.status !== existing.status &&
			ClaimRegistry.EVENTFUL_STATUS.has(next.status)
		) {
			this.recordEvent(
				"task",
				`${next.status}${next.reason ? ` — ${next.reason}` : ""}: ${next.goal.slice(0, 72)}`,
				next.agentId,
			);
		}
		this.broadcastState();
		return next;
	}

	/** Full retained event history, oldest first, for the `?replay` timeline. */
	async replay() {
		const events = [
			...this.sql.exec(
				"SELECT id, at, kind, agent_id, detail FROM events ORDER BY id ASC",
			),
		].map((row) => ({
			id: row.id as number,
			at: row.at as number,
			kind: row.kind as RegistryEvent["kind"],
			agentId: (row.agent_id as string | null) ?? undefined,
			detail: row.detail as string,
		}));
		return {
			startedAt: events.length > 0 ? events[0].at : null,
			events,
			stats: this.stats,
		};
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx?: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// The product surface: dispatch a goal to the built-in agent, then
		// watch the task flow through the pipeline. `edits` supplied in the
		// body skip the planning model (manual/demo path).
		if (url.pathname === "/tasks" && request.method === "POST") {
			const body = (await request.json().catch(() => ({}))) as any;
			if (typeof body.goal !== "string" || !body.goal.trim()) {
				return Response.json({ error: "goal is required" }, { status: 400 });
			}
			const id = `t-${crypto.randomUUID().slice(0, 8)}`;
			const stub = env.CLAIM_REGISTRY.get(
				env.CLAIM_REGISTRY.idFromName("global"),
			);
			const task = await stub.createTask({
				id,
				agentId:
					typeof body.agentId === "string" && body.agentId
						? body.agentId
						: `agent-${id.slice(2)}`,
				goal: body.goal,
				footprint: Array.isArray(body.footprint) ? body.footprint : [],
				edits:
					body.edits && typeof body.edits === "object" ? body.edits : undefined,
			});
			const run = runAgentTask(env, id);
			if (ctx?.waitUntil) ctx.waitUntil(run);
			else void run;
			return Response.json(task, { status: 201 });
		}

		if (url.pathname === "/tasks" && request.method === "GET") {
			const stub = env.CLAIM_REGISTRY.get(
				env.CLAIM_REGISTRY.idFromName("global"),
			);
			return Response.json(await stub.listTasks(50));
		}

		if (request.method === "GET" && url.pathname.startsWith("/tasks/")) {
			const stub = env.CLAIM_REGISTRY.get(
				env.CLAIM_REGISTRY.idFromName("global"),
			);
			const task = await stub.getTask(
				decodeURIComponent(url.pathname.slice(7)),
			);
			return task
				? Response.json(task)
				: Response.json({ error: "not found" }, { status: 404 });
		}

		// Which providers are actually live — the UI shows these as badges so
		// the Vultr services in play are explicit, not implied.
		if (request.method === "GET" && url.pathname === "/config") {
			return Response.json(
				env.RUNTIME_INFO ?? {
					mode: "cloudflare-workers",
					sandbox: "in-process",
					ai: env.AI
						? {
								provider: "workers-ai",
								model: "@cf/meta/llama-3.1-8b-instruct-fast",
							}
						: undefined,
				},
			);
		}

		// Repo browser — the verified trees the merges produced, readable by
		// anyone. Local provider only; the remote Artifacts surface is for
		// pipelines, not browsing.
		if (request.method === "GET" && url.pathname === "/repos") {
			if (!env.LOCAL_ARTIFACTS) {
				return Response.json(
					{ error: "repo browser needs the local Artifacts provider" },
					{ status: 501 },
				);
			}
			const store = localArtifacts(env) as unknown as {
				listRepos(): Promise<string[]>;
			};
			return Response.json({ repos: await store.listRepos() });
		}

		if (request.method === "GET" && url.pathname.startsWith("/repos/")) {
			if (!env.LOCAL_ARTIFACTS) {
				return Response.json(
					{ error: "repo browser needs the local Artifacts provider" },
					{ status: 501 },
				);
			}
			const name = decodeURIComponent(url.pathname.slice(7));
			const store = localArtifacts(env) as unknown as {
				readTree(a: { repo: string }): Promise<Record<string, string>>;
			};
			const files = await store.readTree({ repo: name }).catch(() => null);
			return files
				? Response.json({ repo: name, files })
				: Response.json({ error: "not found" }, { status: 404 });
		}

		// Demo pack: three preset tasks that exercise the whole arc without an
		// inference key — a clean landing, a same-line conflict that reaches
		// the rapids, and a db rewrite the executed sandbox verification rejects.
		if (request.method === "POST" && url.pathname === "/demo/pack") {
			const stub = env.CLAIM_REGISTRY.get(
				env.CLAIM_REGISTRY.idFromName("global"),
			);
			const RENDER = "exports.render = (name) => `<h1>${name}</h1>`;\n";
			const pack: { goal: string; edits: Record<string, string> }[] = [
				{
					goal: "bump the package version line to 3.1.11-a",
					edits: { "src/index.js": `${RENDER}exports.version = '3.1.11-a';\n` },
				},
				{
					goal: "bump the package version line to 3.1.11-b",
					edits: { "src/index.js": `${RENDER}exports.version = '3.1.11-b';\n` },
				},
				{
					goal: "rewrite the db connector",
					edits: {
						"src/db.js":
							'exports.connect = () => ({ query: "not-a-function" });\n' +
							"function rows(sql, params) { return []; }\n" +
							'exports.preview = () => rows("select 1");\n',
					},
				},
			];
			const ids: string[] = [];
			for (const [i, p] of pack.entries()) {
				const id = `t-demo-${crypto.randomUUID().slice(0, 6)}-${i}`;
				await stub.createTask({
					id,
					agentId: `agent-demo-${"abc"[i]}`,
					goal: p.goal,
					footprint: [],
					edits: p.edits,
				});
				ids.push(id);
			}

			// Prepare every fork before enqueueing any merge. If task B waits
			// for task A's claim, it still forks the same pre-merge trunk — the
			// confluence then produces the intended same-line conflict instead
			// of accidentally landing B on top of A's already-merged edit.
			const prepared = await Promise.all(
				ids.map(async (id) => {
					try {
						return await prepareAgentTask(env, id);
					} catch (err) {
						await stub
							.updateTask(id, {
								status: "failed",
								reason: (err as Error).message ?? String(err),
							})
							.catch(() => undefined);
						return null;
					}
				}),
			);
			for (const task of prepared) {
				if (!task) continue;
				try {
					await enqueueAgentTask(env, task);
				} catch (err) {
					await stub
						.updateTask(task.taskId, {
							status: "failed",
							reason: (err as Error).message ?? String(err),
						})
						.catch(() => undefined);
				}
			}
			return Response.json({ tasks: ids });
		}

		// Expose Claim Registry via HTTP for the spike/demo
		if (url.pathname.startsWith("/registry/")) {
			// Extract registry ID, default to "global" for the spike
			const id = env.CLAIM_REGISTRY.idFromName("global");
			const stub = env.CLAIM_REGISTRY.get(id);

			if (request.method === "POST" && url.pathname === "/registry/claim") {
				const body = (await request.json().catch(() => ({}))) as any;
				const res = await stub.requestClaim(
					body.agentId,
					body.files,
					body.ttlSeconds,
				);
				return Response.json(res);
			}

			if (request.method === "POST" && url.pathname === "/registry/release") {
				const body = (await request.json().catch(() => ({}))) as any;
				const res = await stub.releaseClaim(body.agentId);
				return Response.json(res);
			}

			if (request.method === "GET" && url.pathname === "/registry/status") {
				const res = await stub.getStatus();
				return Response.json(res);
			}

			// Live stream — the dashboard subscribes here instead of polling.
			if (request.method === "GET" && url.pathname === "/registry/events") {
				return stub.subscribe();
			}

			// Full event history, for the dashboard's `?replay` timeline.
			if (request.method === "GET" && url.pathname === "/registry/replay") {
				return Response.json(await stub.replay());
			}
		}

		if (request.method === "POST" && url.pathname === "/import") {
			if (env.ARTIFACTS) {
				const imported = await env.ARTIFACTS.import({
					source: TRUNK_SOURCE,
					target: { name: TRUNK_NAME },
				});
				return Response.json({
					name: imported.name,
					remote: imported.remote,
					token: imported.token,
					provider: "artifacts",
				});
			}

			const imported = await localArtifacts(env).importRepo({
				url: TRUNK_SOURCE.url,
				name: TRUNK_NAME,
			});
			return Response.json({ ...imported, provider: "local" });
		}

		if (request.method === "POST" && url.pathname === "/fork") {
			const body = (await request.json().catch(() => ({}))) as any;
			const taskName = body.name || "ejs-task-1";

			if (env.ARTIFACTS) {
				using repo = await env.ARTIFACTS.get(TRUNK_NAME);
				const forked = await repo.fork(taskName, {
					description: `Fork for ${taskName}`,
					defaultBranchOnly: true,
				});
				using forkRepo = await env.ARTIFACTS.get(taskName);
				const token = await forkRepo.createToken("write", 3600);
				return Response.json({
					name: forked.name,
					remote: forked.remote,
					token: token.plaintext,
					provider: "artifacts",
				});
			}

			const forked = await localArtifacts(env).forkRepo({
				from: TRUNK_NAME,
				to: taskName,
			});
			return Response.json({ ...forked, provider: "local" });
		}

		if (request.method === "POST" && url.pathname === "/commit") {
			const body = (await request.json().catch(() => ({}))) as any;
			const { repoName, remote, token, agentId, files, changedFiles, edits } =
				body;

			// The files the agent actually wrote: `edits` maps path -> content.
			// When omitted we keep the spike's original single-file behaviour.
			const changes: Record<string, string> =
				edits && typeof edits === "object" && Object.keys(edits).length > 0
					? edits
					: { "spike.txt": `Hello from spike at ${Date.now()}` };
			const message = `Agent commit from ${agentId ?? "agent-1"}`;

			let commit: string | undefined;
			if (env.ARTIFACTS) {
				const tokenSecret = token.split("?expires=")[0];
				const dir = "/workspace";
				const fs = new MemoryFS();
				await git.init({ fs, dir, defaultBranch: "main" });
				await git.addRemote({ fs, dir, remote: "origin", url: remote });
				await git.fetch({
					fs,
					http,
					dir,
					ref: "main",
					depth: 1,
					onAuth: () => ({ username: "x", password: tokenSecret }),
				});
				for (const [filepath, content] of Object.entries(changes)) {
					await fs.promises.writeFile(`${dir}/${filepath}`, content);
					await git.add({ fs, dir, filepath });
				}
				commit = await git.commit({
					fs,
					dir,
					message,
					author: { name: "Agent", email: "agent@tributary.dev" },
				});
				const push = await git.push({
					fs,
					http,
					dir,
					url: remote,
					ref: "main",
					onAuth: () => ({ username: "x", password: tokenSecret }),
				});
				if (!push.ok) {
					return Response.json(
						{ error: `push rejected: ${push.error ?? "unknown"}` },
						{ status: 502 },
					);
				}
			} else {
				const result = await localArtifacts(env).commitFiles({
					repo: repoName,
					files: changes,
					message,
				});
				commit = result.commit;
			}

			// Hand the finished tributary to the confluence (the serial merge
			// queue). We forward the agent's declared footprint and the files it
			// actually changed so the confluence can detect footprint violations
			// (i.e. an agent that touched a file it didn't declare) and route
			// those to the rapids as residual conflicts.
			const changedList =
				Array.isArray(changedFiles) && changedFiles.length > 0
					? changedFiles
					: Object.keys(changes);
			await env.MERGE_QUEUE.send({
				agentId: agentId ?? "agent-1",
				taskRepo: repoName,
				token: token,
				files: Array.isArray(files) ? files : [],
				changedFiles: changedList,
			});

			return Response.json({
				commit,
				queued: true,
				changedFiles: changedList,
				provider: env.ARTIFACTS ? "artifacts" : "local",
			});
		}

		if (request.method === "GET" && url.pathname === "/") {
			return new Response(DASHBOARD_HTML, {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}

		// Demo hook: simulate a footprint-violating task end-to-end without
		// requiring a real second Artifacts repo. We skip the queue and hand
		// the violation straight to the resolver so the dashboard's
		// "resolver runs" counter ticks up on demand.
		if (request.method === "POST" && url.pathname === "/demo/conflict") {
			const id2 = env.CLAIM_REGISTRY.idFromName("global");
			const stub2 = env.CLAIM_REGISTRY.get(id2);
			await stub2.recordMergeResult({
				success: false,
				agentId: "agent-misbehave",
				repo: "demo-fault-repo",
				reason: "wrote src/auth.js outside its declared footprint",
			});
			await resolveConflict("agent-misbehave", "", ["src/auth.js"], {
				ai: env.AI,
			});
			return Response.json({ routed: "resolver", kind: "footprint-violation" });
		}

		return Response.json(
			{ message: "Welcome to Tributary Spike" },
			{ status: 404 },
		);
	},

	/** The confluence: land finished tributaries on the trunk, one at a time. */
	async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
		const id = env.CLAIM_REGISTRY.idFromName("global");
		const stub = env.CLAIM_REGISTRY.get(id);

		for (const message of batch.messages) {
			const task = message.body;
			console.log(
				`[Confluence] Processing task from ${task.agentId} (repo: ${task.taskRepo})`,
			);

			// Footprint-violation pre-filter.
			//
			// The ClaimRegistry already prevents two tasks from holding overlapping
			// claims at the SAME time, so most merges from the queue are clean.
			// The only residual conflicts come from one of three places:
			//   1. A claim was released/expired and another task picked up the file.
			//   2. The same file was touched before either agent claimed it (TOCTOU).
			//   3. The agent pushed a file outside its declared footprint.
			//
			// Case 3 is rejected before we spend a merge on it: work outside the
			// declared footprint routes straight to the resolver. Cases 1–2 are
			// left for the real three-way merge below to surface as actual git
			// conflicts.
			const declared = Array.isArray(task.files) ? task.files : [];
			const changed = Array.isArray(task.changedFiles)
				? task.changedFiles
				: task.changedFiles
					? [task.changedFiles]
					: ["spike.txt"];
			const outOfFootprint = changed.filter(
				(f: string) =>
					!declared.some((d: string) => d === f || d.endsWith(`/${f}`)),
			);

			if (outOfFootprint.length > 0) {
				console.log(
					`[Confluence] ❌ Footprint violation from ${task.agentId}: ` +
						`changed ${outOfFootprint.join(", ")} outside declared ` +
						`footprint ${declared.join(", ") || "(none)"}. Routing to the rapids.`,
				);
				await stub.recordMergeResult({
					success: false,
					agentId: task.agentId,
					repo: task.taskRepo,
					reason: `changed ${outOfFootprint.join(", ")} outside its declared footprint`,
				});
				if (task.taskId) {
					await stub.updateTask(task.taskId, {
						status: "rejected",
						reason: `changed ${outOfFootprint.join(", ")} outside its declared footprint`,
					});
				}
				await resolveConflict(task.agentId, task.taskRepo, outOfFootprint, {
					ai: env.AI,
				});
				continue;
			}

			// Real speculative merge: three-way merge onto trunk, run the test
			// gate, advance trunk only when green. Local mode merges in-process on
			// the shim's shared git store; the Artifacts path fetches over smart
			// HTTP. Both share the same merge + gate primitives from ./merge.
			let outcome;
			if (env.ARTIFACTS) {
				try {
					const [trunk, taskCreds] = await Promise.all([
						repoCreds(env, TRUNK_NAME),
						repoCreds(env, task.taskRepo),
					]);
					outcome = await mergeTaskIntoTrunk({
						trunk,
						task: {
							remote: taskCreds.remote,
							token: task.token ?? taskCreds.token,
						},
						resolutions: task.resolutions,
						gate: env.SANDBOX_GATE,
						context: {
							agentId: task.agentId,
							footprint: task.files,
							resolved: Boolean(task.resolutions),
						},
					});
				} catch (err) {
					console.error(
						`[Confluence] Merge attempt errored for ${task.taskRepo}:`,
						err,
					);
					outcome = {
						status: "failed" as const,
						reason: (err as Error).message,
					};
				}
			} else {
				try {
					outcome = await localArtifacts(env).mergeTask({
						task: task.taskRepo,
						resolutions: task.resolutions,
						gate: env.SANDBOX_GATE,
						context: {
							agentId: task.agentId,
							footprint: task.files,
							resolved: Boolean(task.resolutions),
						},
					});
				} catch (err) {
					console.error(
						`[Confluence] Local merge errored for ${task.taskRepo}:`,
						err,
					);
					outcome = {
						status: "failed" as const,
						reason: (err as Error).message,
					};
				}
			}

			if (outcome.status === "merged" || outcome.status === "already-merged") {
				console.log(
					`[Confluence] ✅ Landed ${task.taskRepo} on trunk ` +
						`(${outcome.status === "merged" ? outcome.commit : "no-op"})`,
				);
				await stub.recordMergeResult({
					success: true,
					agentId: task.agentId,
					repo: task.taskRepo,
					commit: outcome.status === "merged" ? outcome.commit : undefined,
				});
				if (task.taskId) {
					await stub.updateTask(task.taskId, {
						status: "landed",
						repo: task.taskRepo,
						commit: outcome.status === "merged" ? outcome.commit : undefined,
						gate: outcome.gate,
					});
				}
			} else {
				const reason =
					outcome.status === "conflict"
						? `conflict in ${outcome.conflictedFiles.join(", ")}`
						: outcome.reason;
				console.log(
					`[Confluence] ❌ ${task.agentId} did not land: ${reason}. ` +
						`Routing to the rapids.`,
				);
				await stub.recordMergeResult({
					success: false,
					agentId: task.agentId,
					repo: task.taskRepo,
					reason,
				});
				if (task.taskId) {
					await stub.updateTask(task.taskId, {
						status: "resolving",
						reason,
						gate: "gate" in outcome ? outcome.gate : undefined,
					});
				}
				const resolution = await resolveConflict(
					task.agentId,
					task.taskRepo,
					// Conflicts carry real conflicted paths; gate failures pass the
					// task's changed files so the resolver has something to reason
					// about instead of an empty list.
					outcome.status === "conflict" ? outcome.conflictedFiles : changed,
					{
						ai: env.AI,
						sides: outcome.status === "conflict" ? outcome.sides : undefined,
					},
				);
				// A resolved task re-enters the queue once with the resolution
				// attached; the merge engine applies it as a merge driver and the
				// test gate re-verifies before trunk moves. resolverRetry caps it
				// at one attempt so a still-conflicting task can't loop.
				if (task.taskId) {
					const retrying =
						resolution.status === "resolved" &&
						resolution.contents &&
						!task.resolverRetry;
					await stub.updateTask(task.taskId, {
						resolution: {
							status: resolution.status,
							files: resolution.files,
							via: "via" in resolution ? resolution.via : undefined,
						},
						status: retrying ? "merging" : "rejected",
					});
				}
				if (
					resolution.status === "resolved" &&
					resolution.contents &&
					!task.resolverRetry
				) {
					console.log(
						`[Confluence] Resolver produced a resolution for ${task.taskRepo} — re-queuing merge.`,
					);
					await env.MERGE_QUEUE.send({
						...task,
						resolverRetry: true,
						resolutions: resolution.contents,
					});
				}
			}
		}
	},
};
