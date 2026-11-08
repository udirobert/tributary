/**
 * The agent that does the work a task describes — Challenge-1 Pattern A made
 * concrete: a goal comes in, a model writes the change, the change runs the
 * containment gauntlet (watershed → confluence → sandbox gate → rapids), and
 * verifiable output comes back. The agent is a client of the same surfaces
 * any external agent uses — registry, artifacts, queue — nothing private.
 *
 * Planning happens through the `ai` binding (Vultr Serverless Inference in
 * Node/Vultr mode, Workers AI under wrangler). When a task arrives with
 * `edits` already supplied, planning is skipped — the manual path for demos
 * and tests.
 */
import type { Env } from "./index";

const TRUNK_NAME = "ejs-trunk";
const TRUNK_SOURCE_URL = "https://github.com/mde/ejs.git";

// Planner model id — a hint only; each binding maps it to its own model
// (Workers AI honors it, the Vultr adapter uses VULTR_INFERENCE_MODEL).
const PLANNER_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const CLAIM_TIMEOUT_MS = 120_000;
const CLAIM_POLL_MS = 1_500;
/** Trunk context sent to the planner, so prompts stay within context. */
const CONTEXT_CHAR_CAP = 30_000;

interface RegistryStub {
	getTask(id: string): Promise<TaskRecord>;
	updateTask(id: string, patch: Partial<TaskRecord>): Promise<unknown>;
	requestClaim(
		agentId: string,
		files: string[],
		ttlSeconds?: number,
	): Promise<{ status: string }>;
	releaseClaim(agentId: string): Promise<unknown>;
}

interface ArtifactsStub {
	importRepo(args: { url?: string; name: string }): Promise<unknown>;
	readTree(args: { repo: string }): Promise<Record<string, string>>;
	forkRepo(args: {
		from: string;
		to: string;
	}): Promise<{ name: string; remote: string; token: string }>;
	commitFiles(args: {
		repo: string;
		files: Record<string, string>;
		message?: string;
	}): Promise<{ commit: string; head: string }>;
}

export interface TaskRecord {
	id: string;
	agentId: string;
	goal: string;
	footprint: string[];
	status: string;
	plan?: { rationale?: string };
	edits?: Record<string, string>;
	/** Pre-edit contents of the touched files (null = newly created). */
	before?: Record<string, string | null>;
	repo?: string;
	commit?: string;
	gate?: unknown;
	resolution?: unknown;
	reason?: string;
	history?: { status: string; at: number; reason?: string }[];
	createdAt: number;
	updatedAt: number;
}

/** A task that has claimed, forked and committed — ready for the confluence. */
export interface PreparedAgentTask {
	taskId: string;
	agentId: string;
	taskRepo: string;
	commit: string;
	files: string[];
	changedFiles: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function registry(env: Env): RegistryStub {
	return env.CLAIM_REGISTRY.get(
		env.CLAIM_REGISTRY.idFromName("global"),
	) as unknown as RegistryStub;
}

function artifacts(env: Env): ArtifactsStub {
	if (env.ARTIFACTS) {
		throw new Error(
			"The built-in agent loop uses the local Artifacts provider — " +
				"drive remote repos through the HTTP surface instead.",
		);
	}
	if (!env.LOCAL_ARTIFACTS) throw new Error("no Artifacts provider bound");
	return env.LOCAL_ARTIFACTS.get(
		env.LOCAL_ARTIFACTS.idFromName("default"),
	) as unknown as ArtifactsStub;
}

/** Ensure the trunk exists; returns its tree (the planner's world). */
async function trunkTree(env: Env): Promise<Record<string, string>> {
	const store = artifacts(env);
	try {
		return await store.readTree({ repo: TRUNK_NAME });
	} catch {
		await store.importRepo({ url: TRUNK_SOURCE_URL, name: TRUNK_NAME });
		return store.readTree({ repo: TRUNK_NAME });
	}
}

/**
 * Turn the goal into a diff. The model sees the goal and the current trunk
 * tree and must return complete new contents for every file it changes.
 */
async function planEdits(
	ai: NonNullable<Env["AI"]>,
	goal: string,
	tree: Record<string, string>,
): Promise<{ edits: Record<string, string>; rationale: string }> {
	const fileBlock = Object.entries(tree)
		.map(([path, content]) => `=== ${path} ===\n${content}`)
		.join("\n")
		.slice(0, CONTEXT_CHAR_CAP);

	const messages: { role: string; content: string }[] = [
		{
			role: "system",
			content:
				"You are an autonomous coding agent. You are given a goal and a " +
				"repository's current files. Respond with ONLY a JSON object of " +
				'the form {"rationale": string, "edits": {"path": "complete new ' +
				'file content"}} — one entry per file you change, each containing ' +
				"the file's full new contents. No prose, no markdown fences.",
		},
		{ role: "user", content: `GOAL: ${goal}\n\nFILES:\n${fileBlock}` },
	];
	// One corrective retry when the model answers with prose instead of JSON.
	for (let attempt = 0; attempt < 2; attempt++) {
		const out = await ai.run(PLANNER_MODEL, { messages });
		const text = (out as { response?: string }).response;
		if (typeof text !== "string" || !text.trim()) {
			throw new Error("planner returned an empty response");
		}
		try {
			return parsePlan(text);
		} catch (err) {
			if (attempt === 1) throw err;
			messages.push(
				{ role: "assistant", content: text },
				{
					role: "user",
					content:
						"That was not valid JSON. Reply with ONLY the JSON object — " +
						"no prose, no markdown fences.",
				},
			);
		}
	}
	throw new Error("planner failed");
}

/** Extract {rationale, edits} from model output; throws a useful error. */
function parsePlan(text: string): {
	edits: Record<string, string>;
	rationale: string;
} {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end <= start) {
		throw new Error("planner returned no JSON object");
	}
	const plan = JSON.parse(text.slice(start, end + 1)) as {
		rationale?: string;
		edits?: Record<string, string>;
	};
	if (
		!plan.edits ||
		typeof plan.edits !== "object" ||
		Object.keys(plan.edits).length === 0 ||
		Object.values(plan.edits).some((c) => typeof c !== "string")
	) {
		throw new Error("planner returned a plan with no usable edits");
	}
	return { edits: plan.edits, rationale: plan.rationale ?? "" };
}

/**
 * Plan → claim → fork → commit, then release the claim. The returned value
 * is everything the confluence needs; callers choose when to enqueue it.
 * Splitting preparation from enqueue lets the demo pack fork every task
 * before the first merge starts, so preset conflicts stay deterministic.
 */
export async function prepareAgentTask(
	env: Env,
	taskId: string,
): Promise<PreparedAgentTask> {
	const reg = registry(env);
	const set = (patch: Partial<TaskRecord>) => reg.updateTask(taskId, patch);
	let claimedAgent: string | null = null;

	try {
		const task = await reg.getTask(taskId);
		if (!task) throw new Error(`task ${taskId} not found`);

		// ── Plan: goal -> concrete edits ──────────────────────────────────
		const tree = await trunkTree(env);
		let edits = task.edits;
		let rationale = "";
		if (!edits || Object.keys(edits).length === 0) {
			if (!env.AI) {
				throw new Error(
					"no AI binding configured — submit the task with explicit " +
						"edits, or set VULTR_INFERENCE_API_KEY / bind Workers AI",
				);
			}
			const plan = await planEdits(env.AI, task.goal, tree);
			edits = plan.edits;
			rationale = plan.rationale;
		}
		const footprint = task.footprint.length
			? task.footprint
			: Object.keys(edits);
		// Pre-edit contents of touched files — the drawer's unified diff.
		const before: Record<string, string | null> = {};
		for (const path of Object.keys(edits)) {
			before[path] = tree[path] ?? null;
		}
		await set({
			status: "claiming",
			plan: { rationale },
			edits,
			before,
			footprint,
		});

		// ── Watershed: claim, and wait when queued ────────────────────────
		const deadline = Date.now() + CLAIM_TIMEOUT_MS;
		let grant = await reg.requestClaim(task.agentId, footprint, 300);
		while (grant.status !== "granted") {
			if (Date.now() > deadline) {
				throw new Error("claim wait timed out — footprint stayed contended");
			}
			await set({ status: "queued" });
			await sleep(CLAIM_POLL_MS);
			grant = await reg.requestClaim(task.agentId, footprint, 300);
		}
		claimedAgent = task.agentId;
		await set({ status: "working" });

		// ── Work: fork, commit ────────────────────────────────────────────
		const repo = `task-${taskId}`;
		await artifacts(env).forkRepo({ from: TRUNK_NAME, to: repo });
		const { commit } = await artifacts(env).commitFiles({
			repo,
			files: edits,
			message: `${task.agentId}: ${task.goal.slice(0, 72)}`,
		});
		return {
			taskId,
			agentId: task.agentId,
			taskRepo: repo,
			commit,
			files: footprint,
			changedFiles: Object.keys(edits),
		};
	} finally {
		if (claimedAgent) {
			await reg.releaseClaim(claimedAgent).catch(() => undefined);
		}
	}
}

/** Hand prepared work to the confluence (the serial merge queue). */
export async function enqueueAgentTask(
	env: Env,
	prepared: PreparedAgentTask,
): Promise<void> {
	await registry(env).updateTask(prepared.taskId, {
		status: "merging",
		repo: prepared.taskRepo,
		commit: prepared.commit,
	});
	await env.MERGE_QUEUE.send({
		agentId: prepared.agentId,
		taskId: prepared.taskId,
		taskRepo: prepared.taskRepo,
		files: prepared.files,
		changedFiles: prepared.changedFiles,
	});
}

/**
 * Drive one task through the pipeline: plan → claim → fork → commit → queue.
 * The confluence takes over from the queue message; failures before that
 * point land on the task as `failed`.
 */
export async function runAgentTask(env: Env, taskId: string): Promise<void> {
	try {
		const prepared = await prepareAgentTask(env, taskId);
		await enqueueAgentTask(env, prepared);
	} catch (err) {
		console.error(`[Agent] task ${taskId} failed:`, err);
		await registry(env)
			.updateTask(taskId, {
				status: "failed",
				reason: (err as Error).message ?? String(err),
			})
			.catch(() => undefined);
	}
}
