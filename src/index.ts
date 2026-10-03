import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";
import { DurableObject } from "cloudflare:workers";

import { resolveConflict } from "./resolver";

export interface Env {
	ARTIFACTS: any;
	CLAIM_REGISTRY: DurableObjectNamespace<ClaimRegistry>;
	MERGE_QUEUE: Queue;
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
				target: { name: "ejs-trunk" },
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
			using repo = await env.ARTIFACTS.get("ejs-trunk");
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
			const { repoName, remote, token } = body;
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

			// Trigger merge queue
			await env.MERGE_QUEUE.send({
				agentId: "agent-1",
				taskRepo: repoName,
				token: token,
			});

			return Response.json({ commit, push, queued: true });
		}

		if (request.method === "GET" && url.pathname === "/") {
			const id = env.CLAIM_REGISTRY.idFromName("global");
			const stub = env.CLAIM_REGISTRY.get(id);
			const status = await stub.getStatus();
			const html = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Tributary Dashboard</title>
					<style>
						body { font-family: system-ui; padding: 2rem; background: #fafafa; }
						.card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem; }
						.green { color: #059669; font-weight: bold; }
						.red { color: #dc2626; font-weight: bold; }
					</style>
				</head>
				<body>
					<h1>🌊 Tributary Live Dashboard</h1>
					<div class="card">
						<h2>Trunk Status: <span class="${status.stats.trunkStatus}">${status.stats.trunkStatus.toUpperCase()}</span></h2>
						<p>Total Merges: ${status.stats.totalMerges}</p>
					</div>
					<div class="card">
						<h2>Coordination Layer</h2>
						<p>Active Claims: ${status.activeClaims.length}</p>
						<p>Waitlist (Queue Depth): ${status.waitlist.length}</p>
					</div>
					<div class="card">
						<h2>Conflict Metrics</h2>
						<p>Conflicts Prevented (Claim overlapping): ${status.stats.conflictsPrevented}</p>
						<p>Residual Conflicts (Reached Resolver): ${status.stats.resolverInvocations}</p>
					</div>
				</body>
				</html>
			`;
			return new Response(html, { headers: { "Content-Type": "text/html" } });
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

			// Simulated Sandbox Merge & Test execution
			const success = Math.random() > 0.1;

			if (success) {
				console.log(
					`[MergeQueue] ✅ Merged and tests passed for ${task.agentId}`,
				);
				await stub.recordMergeResult(true);
			} else {
				console.log(
					`[MergeQueue] ❌ Tests failed or conflict for ${task.agentId}. Sending to resolver.`,
				);
				await stub.recordMergeResult(false);
				await resolveConflict(task.agentId, task.taskRepo, [
					"simulated/file.ts",
				]);
			}
		}
	},
};
