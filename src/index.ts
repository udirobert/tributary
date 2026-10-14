import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";
import { DurableObject } from "cloudflare:workers";

import { resolveConflict } from "./resolver";
import { mergeTaskIntoTrunk } from "./merge";
import { DASHBOARD_HTML } from "./dashboard";
import { LocalArtifacts } from "./artifacts-local";

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
}

const TRUNK_NAME = "ejs-trunk";
const TRUNK_SOURCE = {
	url: "https://github.com/mde/ejs.git",
	branch: "main",
};

/** The offline Artifacts provider, used when the real binding is not bound. */
function localArtifacts(env: Env) {
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
	kind: "claim" | "queued" | "release" | "merge" | "conflict" | "resolver";
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
	private events: RegistryEvent[] = [];
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
			const storedClaims =
				await this.ctx.storage.get<Map<string, Claim>>("claims");
			if (storedClaims) this.claims = storedClaims;
			const storedWaitlist =
				await this.ctx.storage.get<QueuedClaim[]>("waitlist");
			if (storedWaitlist) this.waitlist = storedWaitlist;
			const storedStats =
				await this.ctx.storage.get<typeof this.stats>("stats");
			// Merge over defaults so fields added in later versions start sane.
			if (storedStats) this.stats = { ...this.stats, ...storedStats };
			const storedEvents =
				await this.ctx.storage.get<RegistryEvent[]>("events");
			if (storedEvents) {
				this.events = storedEvents;
				this.eventSeq = storedEvents.reduce((max, e) => Math.max(max, e.id), 0);
			}
		});
	}

	async save() {
		await this.ctx.storage.put("claims", this.claims);
		await this.ctx.storage.put("waitlist", this.waitlist);
		await this.ctx.storage.put("stats", this.stats);
		await this.ctx.storage.put("events", this.events);
	}

	/** Append to the bounded activity log (persisted by the caller's save()). */
	private recordEvent(
		kind: RegistryEvent["kind"],
		detail: string,
		agentId?: string,
	) {
		this.events.push({
			id: ++this.eventSeq,
			at: Date.now(),
			kind,
			agentId,
			detail,
		});
		if (this.events.length > 100) {
			this.events.splice(0, this.events.length - 100);
		}
	}

	private checkOverlap(files: string[], self?: string): string | null {
		const now = Date.now();
		for (const [agentId, claim] of this.claims.entries()) {
			if (claim.expiresAt < now) {
				this.claims.delete(agentId);
			}
		}

		for (const [agentId, claim] of this.claims.entries()) {
			if (agentId === self) continue;
			if (claim.files.some((f) => files.includes(f))) {
				return agentId;
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
		this.claims.set(next.agentId, {
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
				this.waitlist.push({ agentId, files, ttlSeconds });
				this.stats.conflictsPrevented++;
				this.recordEvent(
					"queued",
					`overlaps ${conflictingAgent} on ${files.join(", ")} — queued, not failed`,
					agentId,
				);
			}
			await this.save();
			return { status: "queued", conflictingAgent };
		}

		// Grant — and drop any waitlist entry this agent held from earlier
		// retries, so the dashboard waitlist reflects real pending work.
		this.waitlist = this.waitlist.filter((w) => w.agentId !== agentId);

		this.claims.set(agentId, {
			agentId,
			files,
			expiresAt: Date.now() + ttlSeconds * 1000,
		});
		this.recordEvent("claim", `granted ${files.join(", ")}`, agentId);
		await this.save();
		return { status: "granted" };
	}

	async releaseClaim(agentId: string) {
		const claim = this.claims.get(agentId);
		this.claims.delete(agentId);
		this.promoteWaitlist();

		this.recordEvent(
			"release",
			claim ? `released ${claim.files.join(", ")}` : "released claim",
			agentId,
		);
		await this.save();
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
		await this.save();
	}

	async getStatus() {
		this.checkOverlap([]); // Trigger expiration cleanup
		return {
			activeClaims: Array.from(this.claims.values()),
			waitlist: this.waitlist,
			stats: this.stats,
			// Newest first — the dashboard feed renders this directly.
			events: this.events.slice(-40).reverse(),
		};
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

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
