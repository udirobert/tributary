import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";

// Workers AI is only available when [ai] binding is configured in wrangler.toml.
// Typed loosely so the module compiles in both local and deployed contexts.
export interface AiBinding {
	run(
		model: string,
		input: { messages: { role: string; content: string }[] },
	): Promise<{ response?: string } | ReadableStream>;
}

const RESOLVER_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// GitLab-Duo-style staged commit author.
const RESOLVER_AUTHOR = {
	name: "Tributary Resolver",
	email: "resolver@tributary.dev",
};

const authFor = (token: string) => () => ({
	username: "x",
	password: token.split("?expires=")[0],
});

// ── conflict-marker parsing ───────────────────────────────────────────────────

/**
 * Pull { ours, theirs } from every conflict hunk in `content`.
 */
function parseConflicts(content: string): { ours: string; theirs: string }[] {
	const hunks: { ours: string; theirs: string }[] = [];
	const lines = content.split("\n");
	let state: "none" | "ours" | "theirs" = "none";
	let ours: string[] = [];
	let theirs: string[] = [];

	for (const line of lines) {
		if (line.startsWith("<<<<<<<")) {
			state = "ours";
			ours = [];
		} else if (line.startsWith("=======") && state === "ours") {
			state = "theirs";
			theirs = [];
		} else if (line.startsWith(">>>>>>>") && state === "theirs") {
			hunks.push({ ours: ours.join("\n"), theirs: theirs.join("\n") });
			state = "none";
		} else if (state === "ours") {
			ours.push(line);
		} else if (state === "theirs") {
			theirs.push(line);
		}
	}
	return hunks;
}

/**
 * Replace every conflict-marker block in `content` with the corresponding
 * entry in `resolutions[]`. Returns the clean text and a count of replacements.
 */
function applyResolutions(
	content: string,
	resolutions: string[],
): { resolved: string; applied: number } {
	let idx = 0;
	let applied = 0;
	const resolved = content.replace(
		/<<<<<<<[^\n]*\n[\s\S]*?=======\n[\s\S]*?>>>>>>>[^\n]*/gm,
		() => {
			const r = resolutions[idx++] ?? resolutions[resolutions.length - 1] ?? "";
			applied++;
			return r;
		},
	);
	return { resolved, applied };
}

// ── AI call ──────────────────────────────────────────────────────────────────

async function aiResolveHunk(
	ai: AiBinding,
	file: string,
	ours: string,
	theirs: string,
): Promise<string | null> {
	const prompt =
		`You are a careful code merger. A git conflict occurred in file: ${file}\n` +
		`Produce a single unified version that preserves the intent of both sides.\n` +
		`Output ONLY the resolved code — no explanation, no conflict markers.\n\n` +
		`<<<<<<< OURS\n${ours}\n=======\n${theirs}\n>>>>>>> THEIRS`;

	try {
		const out = await ai.run(RESOLVER_MODEL, {
			messages: [
				{
					role: "system",
					content:
						"You are a precise code merger. Return only the merged code, nothing else.",
				},
				{ role: "user", content: prompt },
			],
		});
		const text = (out as { response?: string }).response;
		return typeof text === "string" ? text.trim() : null;
	} catch (err) {
		console.warn("[Resolver] AI call failed:", (err as Error).message);
		return null;
	}
}

// ── public API ────────────────────────────────────────────────────────────────

export interface ResolveOpts {
	/** Read-only token for cloning the conflicted repo. */
	readToken?: string;
	/**
	 * Write token minted only after resolution is ready (GitLab-Duo-style staged
	 * commit). Omit to log the resolution without committing — useful in local
	 * `wrangler dev` mode where Artifacts write tokens aren't emulated.
	 */
	writeToken?: string;
	/** Workers AI binding. If absent, falls back to "take theirs" heuristic. */
	ai?: AiBinding;
}

export type ResolveResult =
	| { status: "resolved"; files: string[] }
	| { status: "logged"; files: string[] }
	| { status: "skipped"; files: string[] };

/**
 * Resolve a residual conflict.
 *
 * Staged privileges (GitLab-Duo-style):
 *   - readToken  → clone; always required for a real repo.
 *   - AI binding → per-hunk LLM resolution (falls back to "take theirs").
 *   - writeToken → commit + push; minted only when resolution is approved.
 *
 * When called without creds (demo/test path), the counter still ticks and the
 * resolver logs what it would have done.
 */
export async function resolveConflict(
	agentId: string,
	repoUrl: string,
	conflictedFiles: string[],
	opts?: ResolveOpts,
): Promise<ResolveResult> {
	console.log(
		`[Resolver] Handling residual conflict for ${agentId} — ` +
			`${conflictedFiles.length} file(s): ${conflictedFiles.join(", ")}`,
	);

	// Demo / test path — no real repo available. Counter ticks, we return early.
	if (!repoUrl || !opts?.readToken) {
		console.log(
			`[Resolver] No repo creds for ${agentId} — conflict logged.` +
				` (files: ${conflictedFiles.join(", ")})`,
		);
		return { status: "logged", files: conflictedFiles };
	}

	// ── Stage 1: Clone (read-only) ────────────────────────────────────────────
	const dir = "/resolver-workspace";
	const fs = new MemoryFS();
	console.log(`[Resolver] Cloning ${repoUrl} (read-only) …`);
	await git.init({ fs, dir, defaultBranch: "main" });
	await git.addRemote({ fs, dir, remote: "origin", url: repoUrl });

	try {
		await git.fetch({
			fs,
			http,
			dir,
			remote: "origin",
			ref: "main",
			singleBranch: true,
			depth: 1,
			onAuth: authFor(opts.readToken),
		});
		await git.checkout({ fs, dir, ref: "refs/remotes/origin/main" });
	} catch (err) {
		console.error("[Resolver] Clone failed:", (err as Error).message);
		return { status: "logged", files: conflictedFiles };
	}

	// ── Stage 2: Resolve each file via AI ────────────────────────────────────
	const resolvedFiles: string[] = [];

	for (const file of conflictedFiles) {
		let content: string;
		try {
			content = (await fs.promises.readFile(
				`${dir}/${file}`,
				"utf8",
			)) as string;
		} catch {
			console.warn(`[Resolver] Could not read ${file} — skipping.`);
			continue;
		}

		const hunks = parseConflicts(content);
		if (hunks.length === 0) {
			console.log(
				`[Resolver] ${file}: no conflict markers found — already clean.`,
			);
			resolvedFiles.push(file);
			continue;
		}

		const aiAvailable = !!opts.ai;
		console.log(
			`[Resolver] ${file}: ${hunks.length} hunk(s) — ` +
				`calling ${aiAvailable ? RESOLVER_MODEL : "fallback (no AI binding)"} …`,
		);

		const resolutions: string[] = [];
		for (const hunk of hunks) {
			if (aiAvailable) {
				const r = await aiResolveHunk(opts.ai!, file, hunk.ours, hunk.theirs);
				// AI failed for this hunk — prefer theirs as deterministic fallback.
				resolutions.push(r ?? hunk.theirs);
			} else {
				// No AI binding (local dev): take theirs.
				resolutions.push(hunk.theirs);
			}
		}

		const { resolved, applied } = applyResolutions(content, resolutions);
		console.log(
			`[Resolver] ${file}: resolved ${applied}/${hunks.length} hunk(s)` +
				(aiAvailable ? " via AI" : " via fallback"),
		);

		await fs.promises.writeFile(`${dir}/${file}`, resolved);
		resolvedFiles.push(file);
	}

	if (resolvedFiles.length === 0) {
		console.log("[Resolver] Nothing to commit — all files skipped.");
		return { status: "skipped", files: [] };
	}

	// ── Stage 3: Commit + push (write token minted only now) ─────────────────
	if (!opts.writeToken) {
		console.log(
			`[Resolver] Resolution ready for [${resolvedFiles.join(", ")}] but no write token. ` +
				`Approval required before commit (GitLab-Duo staged-commit model). ` +
				`Mint a token via env.ARTIFACTS.get(repo).createToken('write', 300) ` +
				`after approval, then re-invoke resolveConflict with writeToken set.`,
		);
		return { status: "logged", files: resolvedFiles };
	}

	try {
		for (const file of resolvedFiles) {
			await git.add({ fs, dir, filepath: file });
		}
		const commit = await git.commit({
			fs,
			dir,
			message:
				`resolver: resolve conflict in ${resolvedFiles.join(", ")} ` +
				`(agent: ${agentId}, model: ${opts.ai ? RESOLVER_MODEL : "fallback"})`,
			author: RESOLVER_AUTHOR,
		});
		const push = await git.push({
			fs,
			http,
			dir,
			remote: "origin",
			ref: "main",
			onAuth: authFor(opts.writeToken),
		});

		if (push.ok) {
			console.log(
				`[Resolver] ✅ Committed ${commit} and pushed to ${repoUrl}.`,
			);
			return { status: "resolved", files: resolvedFiles };
		} else {
			console.error("[Resolver] Push rejected:", push.error);
			return { status: "logged", files: resolvedFiles };
		}
	} catch (err) {
		console.error("[Resolver] Commit/push failed:", (err as Error).message);
		return { status: "logged", files: resolvedFiles };
	}
}
