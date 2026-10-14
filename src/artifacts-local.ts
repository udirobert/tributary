/**
 * Local Artifacts shim.
 *
 * Cloudflare Artifacts is a **remote-only** binding: wrangler has no local
 * simulator for it (`wrangler dev` reports the binding mode as `remote` even
 * with `remote = false`), it requires a Workers **paid** plan, and the free
 * tier fails the startup proxy session with error 10403 — so a Worker that
 * declares the binding will not boot at all without one. See DECISIONS.md.
 *
 * `LocalArtifacts` implements the subset of the Artifacts surface the spike
 * uses — `import`, `fork`, `createToken`, plus the commit/merge hooks the queue
 * consumer needs — on **real `isomorphic-git` repositories** in `MemoryFS`. The
 * default `wrangler.toml` binds it and omits `[[artifacts]]`, so a clean clone
 * runs end-to-end with no Cloudflare account, no network and no paid plan.
 *
 * Model: one shared git object store, where each Artifacts repo is a branch.
 *
 *   ejs-trunk          -> branch `trunk`
 *   task-Agent-Alpha   -> branch `task-Agent-Alpha`
 *
 * Because every repo shares the object database, a fork is a ref write and a
 * "push to trunk" is just the ref advance `git.merge` already performed — which
 * lets us reuse the transport-free `mergeBranches` / `runTestGate` primitives
 * from `src/merge.ts` instead of reimplementing the merge.
 *
 * Honest limits (documented in README/DECISIONS): the trunk is seeded from a
 * deterministic fixture rather than cloning the real upstream; tokens are
 * opaque strings, not scoped Cloudflare tokens; state lives in DO memory and is
 * not persisted; and the whole store is guarded by a single mutex, so merges
 * serialize locally regardless of the queue's `max_concurrency`.
 */
import git from "isomorphic-git";
import { DurableObject } from "cloudflare:workers";
import { MemoryFS } from "./memory-fs";
import {
	mergeBranches,
	runTestGate,
	runSemanticGate,
	type MergeOutcome,
} from "./merge";

const DIR = "/artifacts-store";
const TRUNK_BRANCH = "trunk";
const TOKEN_TTL_SECONDS = 3600;

const AUTHOR = {
	name: "Tributary Local Artifacts",
	email: "artifacts@tributary.local",
};

/**
 * Deterministic trunk fixture. The paths match the footprints the simulation
 * claims, so a claimed file is always a file that really exists on trunk.
 */
const SEED_FILES: Record<string, string> = {
	"package.json":
		JSON.stringify(
			{
				name: "ejs",
				version: "3.1.10",
				description:
					"Deterministic trunk fixture seeded by Tributary's local Artifacts shim.",
			},
			null,
			2,
		) + "\n",
	"README.md":
		"# ejs\n\nDeterministic trunk fixture for the Tributary spike.\n",
	"src/index.js":
		"exports.render = (name) => `<h1>${name}</h1>`;\nexports.version = '3.1.10';\n",
	"src/auth.js":
		"exports.isAuthed = (req) => Boolean(req.headers && req.headers.authorization);\n",
	"src/db.js": "exports.connect = () => ({ query: async () => [] });\n",
	// greet + its caller live in different files so a signature change in
	// greet.js is textually clean for git but semantically breaking for the
	// caller — the class of conflict only the semantic gate can see.
	"src/greet.js": "exports.greet = (name) => `Hello, ${name}!`;\n",
	"src/handlers.js":
		'const { greet } = require("./greet");\n' +
		'exports.handle = (req) => greet("world");\n',
};

export interface LocalRepoCreds {
	name: string;
	remote: string;
	token: string;
}

export class LocalArtifacts extends DurableObject {
	private fs = new MemoryFS();
	private booted = false;

	/** repo name -> branch name inside the shared store */
	private branches = new Map<string, string>();

	/**
	 * Serializes every mutating operation. The DO is single-threaded but our
	 * handlers `await`, so without this two commits could interleave on the
	 * one shared working tree. This is also what makes local merges serial —
	 * the same guarantee `max_concurrency = 1` gives the real queue.
	 */
	private tail: Promise<unknown> = Promise.resolve();

	private run<T>(fn: () => Promise<T>): Promise<T> {
		const next = this.tail.then(fn, fn);
		this.tail = next.then(
			() => undefined,
			() => undefined,
		);
		return next;
	}

	private async boot(): Promise<void> {
		if (this.booted) return;
		await git.init({ fs: this.fs, dir: DIR, defaultBranch: TRUNK_BRANCH });
		// Seed and commit trunk up front so every later `checkout({ ref: trunk })`
		// resolves. Seeding here (rather than an empty commit) keeps the store
		// valid without needing isomorphic-git's empty-commit option.
		await this.writeSeedAndCommit("Import trunk (local shim seed)");
		this.booted = true;
	}

	/** Write the trunk fixture, committing only if it actually changed anything. */
	private async writeSeedAndCommit(message: string): Promise<void> {
		for (const [filepath, content] of Object.entries(SEED_FILES)) {
			await this.fs.promises.writeFile(`${DIR}/${filepath}`, content);
			await git.add({ fs: this.fs, dir: DIR, filepath });
		}
		if (await this.hasStagedChanges()) {
			await git.commit({ fs: this.fs, dir: DIR, message, author: AUTHOR });
		}
	}

	/** True when the workdir/index differs from HEAD in any way. */
	private async hasStagedChanges(): Promise<boolean> {
		const rows = await git.statusMatrix({ fs: this.fs, dir: DIR });
		return rows.some(
			([, head, workdir, stage]) =>
				!(head === 1 && workdir === 1 && stage === 1),
		);
	}

	private branchFor(repo: string): string {
		const branch = this.branches.get(repo);
		if (!branch) {
			throw new Error(
				`ENOENT: no local Artifacts repo "${repo}" (did /import or /fork run?)`,
			);
		}
		return branch;
	}

	private mintToken(repo: string): string {
		// Shape mirrors an Artifacts plaintext token: a secret with an
		// `?expires=` suffix that callers strip before using as a git password.
		return `local-${repo}-${crypto.randomUUID()}?expires=${
			Date.now() + TOKEN_TTL_SECONDS * 1000
		}`;
	}

	/** Mirror of `env.ARTIFACTS.import({ source, target })`. */
	async importRepo(args: {
		url?: string;
		name: string;
	}): Promise<LocalRepoCreds & { seed: string }> {
		return this.run(async () => {
			await this.boot();

			// Re-running the simulation resets trunk to the fixture so the run is
			// repeatable; on a fresh store this is a no-op.
			await git.checkout({
				fs: this.fs,
				dir: DIR,
				ref: TRUNK_BRANCH,
				force: true,
			});
			await this.writeSeedAndCommit(
				`Reset trunk to fixture for ${args.url ?? "fixture"}`,
			);
			const seed = await git.resolveRef({
				fs: this.fs,
				dir: DIR,
				ref: TRUNK_BRANCH,
			});

			this.branches.set(args.name, TRUNK_BRANCH);
			return {
				name: args.name,
				remote: `local://${TRUNK_BRANCH}`,
				token: this.mintToken(args.name),
				seed,
			};
		});
	}

	/** Mirror of `repo.fork(name, opts)`. `from` must be the trunk repo. */
	async forkRepo(args: { from: string; to: string }): Promise<LocalRepoCreds> {
		return this.run(async () => {
			await this.boot();

			// Only trunk is forked in the spike; the fork branch starts at the
			// trunk tip, which is exactly what an Artifacts fork gives you.
			const head = await git.resolveRef({
				fs: this.fs,
				dir: DIR,
				ref: TRUNK_BRANCH,
			});
			await git.writeRef({
				fs: this.fs,
				dir: DIR,
				ref: `refs/heads/${args.to}`,
				value: head,
				force: true,
			});

			this.branches.set(args.to, args.to);
			return {
				name: args.to,
				remote: `local://${args.to}`,
				token: this.mintToken(args.to),
			};
		});
	}

	/** Mirror of `repo.createToken(scope, ttlSeconds)`. */
	async createToken(args: {
		repo: string;
		scope?: string;
		ttlSeconds?: number;
	}): Promise<{ plaintext: string }> {
		this.branchFor(args.repo);
		return { plaintext: this.mintToken(args.repo) };
	}

	/**
	 * Commit a task's changes onto its fork branch. Uses the same
	 * `isomorphic-git` add/commit path the remote flow uses before its push —
	 * only the transport differs (in-process ref instead of smart HTTP).
	 */
	async commitFiles(args: {
		repo: string;
		files: Record<string, string>;
		message?: string;
	}): Promise<{ commit: string; head: string }> {
		return this.run(async () => {
			await this.boot();
			const branch = this.branchFor(args.repo);

			await git.checkout({
				fs: this.fs,
				dir: DIR,
				ref: branch,
				force: true,
			});
			for (const [filepath, content] of Object.entries(args.files)) {
				await this.fs.promises.writeFile(`${DIR}/${filepath}`, content);
				await git.add({ fs: this.fs, dir: DIR, filepath });
			}

			const commit = await git.commit({
				fs: this.fs,
				dir: DIR,
				message: args.message ?? `Agent commit on ${branch}`,
				author: AUTHOR,
			});
			const head = await git.resolveRef({ fs: this.fs, dir: DIR, ref: branch });
			return { commit, head };
		});
	}

	/**
	 * Speculatively land a task branch on trunk, in-process. Reuses the real
	 * three-way merge + test gate from `src/merge.ts`; because the store is
	 * shared, a successful merge has already advanced `trunk` ("the push").
	 */
	async mergeTask(args: {
		task: string;
		resolutions?: Record<string, string>;
		context?: import("./merge").MergeContext;
	}): Promise<MergeOutcome> {
		return this.run(async () => {
			await this.boot();
			const taskBranch = this.branchFor(args.task);
			const preMergeHead = await git.resolveRef({
				fs: this.fs,
				dir: DIR,
				ref: TRUNK_BRANCH,
			});

			const outcome = await mergeBranches(
				this.fs,
				DIR,
				TRUNK_BRANCH,
				taskBranch,
				args.resolutions,
				args.context,
			);
			if (outcome.status === "conflict") return outcome;

			const gateFailure =
				(await runTestGate(this.fs, DIR)) ??
				(await runSemanticGate(this.fs, DIR));

			if (gateFailure || outcome.status === "failed") {
				// Rewind the trunk ref — locally the merge advanced the branch in
				// place before the gate ran, so a failed merge would otherwise
				// leave a red commit sitting on trunk.
				await git.writeRef({
					fs: this.fs,
					dir: DIR,
					ref: `refs/heads/${TRUNK_BRANCH}`,
					value: preMergeHead,
					force: true,
				});
				await git.checkout({
					fs: this.fs,
					dir: DIR,
					ref: TRUNK_BRANCH,
					force: true,
				});
				return {
					status: "failed",
					reason:
						gateFailure ??
						(outcome.status === "failed" ? outcome.reason : "unknown"),
				};
			}

			// `merged` already advanced the trunk branch in place;
			// `already-merged` adds nothing. Both are green.
			return outcome;
		});
	}

	/** Files at a repo's tip (excluding `.git`), for demo/status surfaces. */
	async listFiles(args: { repo: string }): Promise<string[]> {
		return this.run(async () => {
			await this.boot();
			const branch = this.branchFor(args.repo);
			const files: string[] = [];
			const walk = async (dir: string): Promise<void> => {
				for (const name of await this.fs.promises.readdir(dir)) {
					if (name === ".git") continue;
					const full = `${dir}/${name}`;
					const stat = await this.fs.promises.stat(full);
					if (stat.isDirectory()) {
						await walk(full);
					} else {
						files.push(full.slice(DIR.length + 1));
					}
				}
			};
			await git.checkout({
				fs: this.fs,
				dir: DIR,
				ref: branch,
				force: true,
			});
			await walk(DIR);
			void files;
			return files.sort();
		});
	}

	/** Repo names currently known to the store. */
	async listRepos(): Promise<string[]> {
		return [...this.branches.keys()].sort();
	}
}
