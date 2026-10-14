import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";
import { DurableObject } from "cloudflare:workers";

import { resolveConflict } from "./resolver";
import { mergeTaskIntoTrunk } from "./merge";
import { DASHBOARD_HTML } from "./dashboard";

export interface Env {
	ARTIFACTS: any;
	CLAIM_REGISTRY: DurableObjectNamespace<ClaimRegistry>;
	MERGE_QUEUE: Queue;
}

const TRUNK_NAME = "ejs-trunk";

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
}

export class ClaimRegistry extends DurableObject {
	private claims: Map<string, Claim> = new Map();
	private waitlist: QueuedClaim[] = [];
	private stats = {
		conflictsPrevented: 0,
		resolverInvocations: 0,
		trunkStatus: "green",
		totalMerges: 0,
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
			if (storedStats) this.stats = storedStats;
		});
	}

	async save() {
		await this.ctx.storage.put("claims", this.claims);
		await this.ctx.storage.put("waitlist", this.waitlist);
		await this.ctx.storage.put("stats", this.stats);
	}

	private checkOverlap(files: string[]): string | null {
		const now = Date.now();
		for (const [agentId, claim] of this.claims.entries()) {
			if (claim.expiresAt < now) {
				this.claims.delete(agentId);
			}
		}

		for (const [agentId, claim] of this.claims.entries()) {
			if (claim.files.some((f) => files.includes(f))) {
				return agentId;
			}
		}
		return null;
	}

	async requestClaim(
		agentId: string,
		files: string[],
		ttlSeconds: number = 300,
	) {
		const conflictingAgent = this.checkOverlap(files);
		if (conflictingAgent) {
			this.waitlist.push({ agentId, files });
			this.stats.conflictsPrevented++;
			await this.save();
			return { status: "queued", conflictingAgent };
		}

		this.claims.set(agentId, {
			agentId,
			files,
			expiresAt: Date.now() + ttlSeconds * 1000,
		});
		await this.save();
		return { status: "granted" };
	}

	async releaseClaim(agentId: string) {
		this.claims.delete(agentId);

		// In a real system we'd process the waitlist here and notify waiting agents
		// For the spike, we just remove the claim.
		await this.save();
		return { status: "released" };
	}

	async recordMergeResult(success: boolean) {
		this.stats.totalMerges++;
		if (success) {
			this.stats.trunkStatus = "green";
		} else {
			this.stats.trunkStatus = "red";
			this.stats.resolverInvocations++;
		}
		await this.save();
	}

	async getStatus() {
		this.checkOverlap([]); // Trigger expiration cleanup
		return {
			activeClaims: Array.from(this.claims.values()),
			waitlist: this.waitlist,
			stats: this.stats,
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
			const imported = await env.ARTIFACTS.import({
				source: { url: "https://github.com/mde/ejs.git", branch: "main" },
				target: { name: TRUNK_NAME },
			});
			return Response.json({
				name: imported.name,
				remote: imported.remote,
				token: imported.token,
			});
		}

		if (request.method === "POST" && url.pathname === "/fork") {
			const body = (await request.json().catch(() => ({}))) as any;
			const taskName = body.name || "ejs-task-1";
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
			});
		}

		if (request.method === "POST" && url.pathname === "/commit") {
			const body = (await request.json().catch(() => ({}))) as any;
			const { repoName, remote, token, agentId, files, changedFiles } = body;
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
			await fs.promises.writeFile(
				`${dir}/spike.txt`,
				`Hello from spike at ${Date.now()}`,
			);
			await git.add({ fs, dir, filepath: "spike.txt" });
			const commit = await git.commit({
				fs,
				dir,
				message: "Spike commit",
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

			// Trigger merge queue. We forward the agent's declared footprint and
			// the files it actually changed so the queue consumer can detect
			// footprint violations (i.e. an agent that touched a file it didn't
			// declare) and route those to the resolver as residual conflicts.
			await env.MERGE_QUEUE.send({
				agentId: agentId ?? "agent-1",
				taskRepo: repoName,
				token: token,
				files: Array.isArray(files) ? files : [],
				changedFiles: Array.isArray(changedFiles)
					? changedFiles
					: ["spike.txt"],
			});

			return Response.json({ commit, push, queued: true });
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
			await stub2.recordMergeResult(false);
			await resolveConflict("agent-misbehave", "demo-fault-repo", [
				"src/auth.js",
			]);
			return Response.json({ routed: "resolver", kind: "footprint-violation" });
		}

		return Response.json(
			{ message: "Welcome to Tributary Spike" },
			{ status: 404 },
		);
	},

	async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
		const id = env.CLAIM_REGISTRY.idFromName("global");
		const stub = env.CLAIM_REGISTRY.get(id);

		for (const message of batch.messages) {
			const task = message.body;
			console.log(
				`[MergeQueue] Processing task from ${task.agentId} (repo: ${task.taskRepo})`,
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
					`[MergeQueue] ❌ Footprint violation from ${task.agentId}: ` +
						`changed ${outOfFootprint.join(", ")} outside declared ` +
						`footprint ${declared.join(", ") || "(none)"}. Routing to resolver.`,
				);
				await stub.recordMergeResult(false);
				await resolveConflict(task.agentId, task.taskRepo, outOfFootprint);
				continue;
			}

			// Real speculative merge: fetch trunk + task heads, three-way merge,
			// test gate, push the advanced trunk only when green.
			let outcome;
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
				});
			} catch (err) {
				console.error(
					`[MergeQueue] Merge attempt errored for ${task.taskRepo}:`,
					err,
				);
				outcome = {
					status: "failed" as const,
					reason: (err as Error).message,
				};
			}

			if (outcome.status === "merged" || outcome.status === "already-merged") {
				console.log(
					`[MergeQueue] ✅ Landed ${task.taskRepo} on trunk ` +
						`(${outcome.status === "merged" ? outcome.commit : "no-op"})`,
				);
				await stub.recordMergeResult(true);
			} else {
				const reason =
					outcome.status === "conflict"
						? `conflict in ${outcome.conflictedFiles.join(", ")}`
						: outcome.reason;
				console.log(
					`[MergeQueue] ❌ ${task.agentId} did not land: ${reason}. ` +
						`Routing to resolver.`,
				);
				await stub.recordMergeResult(false);
				await resolveConflict(
					task.agentId,
					task.taskRepo,
					outcome.status === "conflict" ? outcome.conflictedFiles : [],
				);
			}
		}
	},
};
