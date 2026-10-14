import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";

export type MergeOutcome =
	| { status: "merged"; commit: string }
	| { status: "already-merged" }
	| { status: "conflict"; conflictedFiles: string[] }
	| { status: "failed"; reason: string };

export interface RemoteRepo {
	remote: string;
	token: string;
}

const MERGE_AUTHOR = {
	name: "Tributary Merge Queue",
	email: "merge-queue@tributary.dev",
};

const BRANCH = "main";

// The merge base is the trunk tip at fork time, which sits within a few
// commits of both heads on the serial queue. 100 keeps fetches shallow while
// comfortably reaching it.
const FETCH_DEPTH = 100;

// Artifacts plaintext tokens may carry an `?expires=` suffix; git auth needs the secret only.
const tokenSecret = (token: string) => token.split("?expires=")[0];
const authFor = (token: string) => () => ({
	username: "x",
	password: tokenSecret(token),
});

/**
 * Three-way merge `theirs` into `ours` on an fs where both refs already exist
 * locally. Kept free of the Artifacts transport so it can be exercised in a
 * plain Node test harness.
 */
export async function mergeBranches(
	fs: MemoryFS,
	dir: string,
	ours: string,
	theirs: string,
): Promise<MergeOutcome> {
	await git.checkout({ fs, dir, ref: ours });

	try {
		const result = await git.merge({
			fs,
			dir,
			ours,
			theirs,
			author: MERGE_AUTHOR,
			message: `merge: land ${theirs} via Tributary`,
			abortOnConflict: true,
		});
		if (result.alreadyMerged) return { status: "already-merged" };
		// git.merge advances the ref but leaves the workdir stale; force a
		// checkout so the test gate (and any resolver inspection) sees the
		// merged tree, not the pre-merge one.
		await git.checkout({ fs, dir, ref: ours, force: true });
		return { status: "merged", commit: result.oid ?? "" };
	} catch (err) {
		if ((err as { code?: string })?.code === "MergeConflictError") {
			const data = (err as { data?: { filepaths?: string[] } }).data;
			return {
				status: "conflict",
				conflictedFiles: data?.filepaths ?? [],
			};
		}
		throw err;
	}
}

/**
 * Spike stand-in for the Sandbox test run: if the merged tree carries a
 * package.json it must still parse. Returns a failure reason or null.
 */
export async function runTestGate(
	fs: MemoryFS,
	dir: string,
): Promise<string | null> {
	let raw: string;
	try {
		raw = (await fs.promises.readFile(`${dir}/package.json`, "utf8")) as string;
	} catch {
		return null; // No package.json — nothing to gate on.
	}

	try {
		JSON.parse(raw);
		return null;
	} catch (err) {
		return `test gate: merged package.json is invalid (${(err as Error).message})`;
	}
}

/**
 * Speculatively land a finished task repo on trunk: fetch both heads into an
 * in-memory repo, three-way merge, run the test gate, push the advanced
 * trunk. Trunk only moves on a clean, gate-green merge.
 */
export async function mergeTaskIntoTrunk(opts: {
	trunk: RemoteRepo;
	task: RemoteRepo;
}): Promise<MergeOutcome> {
	const dir = "/merge-workspace";
	const fs = new MemoryFS();

	await git.init({ fs, dir, defaultBranch: BRANCH });
	await git.addRemote({ fs, dir, remote: "trunk", url: opts.trunk.remote });
	await git.addRemote({ fs, dir, remote: "task", url: opts.task.remote });

	const fetchOpts = {
		fs,
		http,
		dir,
		ref: BRANCH,
		singleBranch: true,
		depth: FETCH_DEPTH,
	};
	await Promise.all([
		git.fetch({
			...fetchOpts,
			remote: "trunk",
			onAuth: authFor(opts.trunk.token),
		}),
		git.fetch({
			...fetchOpts,
			remote: "task",
			onAuth: authFor(opts.task.token),
		}),
	]);

	await git.branch({
		fs,
		dir,
		ref: BRANCH,
		object: `refs/remotes/trunk/${BRANCH}`,
		checkout: true,
	});

	const outcome = await mergeBranches(
		fs,
		dir,
		BRANCH,
		`refs/remotes/task/${BRANCH}`,
	);
	if (outcome.status === "conflict") return outcome;

	const gateFailure = await runTestGate(fs, dir);
	if (gateFailure) return { status: "failed", reason: gateFailure };

	// Already-merged work adds nothing to trunk — skip the push.
	if (outcome.status === "already-merged") return outcome;

	const push = await git.push({
		fs,
		http,
		dir,
		remote: "trunk",
		ref: BRANCH,
		onAuth: authFor(opts.trunk.token),
	});
	if (!push.ok) {
		return {
			status: "failed",
			reason: `trunk push rejected: ${push.error ?? "unknown"}`,
		};
	}

	return outcome;
}
