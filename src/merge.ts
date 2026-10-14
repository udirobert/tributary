import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { parse } from "acorn";
import { MemoryFS } from "./memory-fs";

/**
 * The confluence's instrument: a real three-way merge with a test gate. A
 * finished tributary joins the trunk only when the merge is clean and the gate
 * is green — otherwise the merge engine reports the conflict (or hands it to
 * the rapids) and the trunk never moves. Nothing lands halfway.
 */
export interface ConflictSide {
	file: string;
	ours: string;
	theirs: string;
}

export type MergeOutcome =
	| { status: "merged"; commit: string }
	| { status: "already-merged" }
	| {
			status: "conflict";
			conflictedFiles: string[];
			/**
			 * Each side's full file content at both heads, captured before the
			 * aborted-merge workspace is discarded. The task repo itself never
			 * carries conflict markers (we merge with abortOnConflict), so
			 * without this the resolver has nothing to resolve.
			 */
			sides: ConflictSide[];
	  }
	| { status: "failed"; reason: string };

export interface RemoteRepo {
	remote: string;
	token: string;
}

// Author identity for landed merges — the confluence stamps its own name on
// every commit it lands on the trunk.
const MERGE_AUTHOR = {
	name: "Tributary Confluence",
	email: "confluence@tributary.dev",
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
/** Provenance stamped into the merge commit message as git trailers. */
export interface MergeContext {
	agentId?: string;
	footprint?: string[];
	resolved?: boolean;
}

export async function mergeBranches(
	fs: MemoryFS,
	dir: string,
	ours: string,
	theirs: string,
	resolutions?: Record<string, string>,
	context?: MergeContext,
): Promise<MergeOutcome> {
	await git.checkout({ fs, dir, ref: ours });

	// Provenance travels with the commit ("the why travels with the commit"),
	// addressing the context-preservation criterion — readable via git log.
	const trailers = [
		context?.agentId ? `Tributary-Agent: ${context.agentId}` : "",
		context?.footprint?.length
			? `Tributary-Footprint: ${context.footprint.join(", ")}`
			: "",
		context?.resolved ? "Tributary-Resolved: true" : "",
	]
		.filter(Boolean)
		.join("\n");

	try {
		const result = await git.merge({
			fs,
			dir,
			ours,
			theirs,
			author: MERGE_AUTHOR,
			message:
				`confluence: land ${theirs} on the trunk via Tributary` +
				(trailers ? `\n\n${trailers}` : ""),
			abortOnConflict: true,
			// Resolver output rides the queue message and is applied here, as a
			// merge driver: the resolution becomes the merged text for its file,
			// producing a real merge commit the test gate then verifies. Editing
			// the task branch and re-merging can't work — the merge base never
			// moves, so any content ≠ ours would conflict again. Files the
			// resolver didn't cover still report as real conflicts.
			mergeDriver: resolutions
				? ({ path }) => {
						// The driver receives the basename ("index.js"), while
						// resolutions are keyed by repo-relative path ("src/index.js").
						const mergedText =
							resolutions[path] ??
							Object.keys(resolutions)
								.filter((k) => k.endsWith(`/${path}`))
								.map((k) => resolutions[k])[0];
						return mergedText !== undefined
							? { cleanMerge: true, mergedText }
							: { cleanMerge: false, mergedText: "" };
					}
				: undefined,
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
			const conflictedFiles = data?.filepaths ?? [];
			return {
				status: "conflict",
				conflictedFiles,
				sides: await readConflictSides(fs, dir, ours, theirs, conflictedFiles),
			};
		}
		throw err;
	}
}

/** Each conflicted file's content at both heads — the resolver's raw material. */
async function readConflictSides(
	fs: MemoryFS,
	dir: string,
	ours: string,
	theirs: string,
	files: string[],
): Promise<ConflictSide[]> {
	const [oursOid, theirsOid] = await Promise.all([
		git.resolveRef({ fs, dir, ref: ours }),
		git.resolveRef({ fs, dir, ref: theirs }),
	]);
	const read = async (oid: string, file: string) => {
		try {
			const { blob } = await git.readBlob({ fs, dir, oid, filepath: file });
			return new TextDecoder().decode(blob);
		} catch {
			return "";
		}
	};
	return Promise.all(
		files.map(async (file) => ({
			file,
			ours: await read(oursOid, file),
			theirs: await read(theirsOid, file),
		})),
	);
}

/**
 * Semantic gate: catches the class of conflict `git merge` can't see — a
 * signature change in one file breaking a caller in another. Parses every
 * .js file in the merged tree with a real JS parser (acorn — no Node fs, so
 * it runs in a Worker where tsc can't), collects exported function arities,
 * and rejects when a bare-identifier call passes the wrong arg count. A file
 * that doesn't parse also fails — the merged tree must be real code.
 *
 * Stand-in for the production shape (repo's own checks — tsc, eslint, test
 * suite — run in a Cloudflare Sandbox). Limitations: whole-file symbol
 * matching, .js only, bare calls only (no `x.f()` member checks).
 */
export async function runSemanticGate(
	fs: MemoryFS,
	dir: string,
): Promise<string | null> {
	const files: string[] = [];
	const walk = async (d: string): Promise<void> => {
		for (const name of await fs.promises.readdir(d)) {
			if (name === ".git" || name === "node_modules") continue;
			const full = `${d}/${name}`;
			const stat = await fs.promises.stat(full);
			if (stat.isDirectory()) await walk(full);
			else if (/\.(mjs|cjs|js)$/.test(name)) files.push(full);
		}
	};
	await walk(dir);

	interface Node {
		type: string;
		[key: string]: unknown;
	}
	const defs = new Map<string, number>();
	const calls: { name: string; argc: number; file: string }[] = [];

	const arityOf = (node: Node): number | null => {
		if (
			node.type === "ArrowFunctionExpression" ||
			node.type === "FunctionExpression"
		) {
			return (node.params as Node[]).filter((p) => p.type !== "RestElement")
				.length;
		}
		if (node.type === "AwaitExpression") {
			return arityOf(node.argument as Node);
		}
		return null;
	};

	const visit = (node: Node, file: string) => {
		if (!node || typeof node.type !== "string") return;
		// exports.f = (...) => … / module.exports.f = function (…) {}
		if (
			node.type === "AssignmentExpression" &&
			(node.left as Node).type === "MemberExpression"
		) {
			const left = node.left as Node;
			const obj = left.object as Node;
			const prop = left.property as Node;
			const isExports =
				(obj.type === "Identifier" &&
					(obj.name === "exports" || obj.name === "module")) ||
				(obj.type === "MemberExpression" &&
					(obj.object as Node).type === "Identifier" &&
					(obj.object as Node).name === "module" &&
					(obj.property as Node).name === "exports");
			if (isExports && prop.type === "Identifier") {
				const arity = arityOf(node.right as Node);
				if (arity !== null) defs.set(prop.name as string, arity);
			}
		}
		// function f(…) {} — top-level declaration (may be exported later)
		if (node.type === "FunctionDeclaration") {
			const id = node.id as Node | null;
			if (id?.type === "Identifier" && !defs.has(id.name as string)) {
				defs.set(id.name as string, (node.params as Node[]).length);
			}
		}
		// f(arg, …) — bare identifier call site
		if (
			node.type === "CallExpression" &&
			(node.callee as Node).type === "Identifier" &&
			!(node.arguments as Node[]).some((a) => a.type === "SpreadElement")
		) {
			calls.push({
				name: (node.callee as Node).name as string,
				argc: (node.arguments as Node[]).length,
				file,
			});
		}
		for (const value of Object.values(node)) {
			if (Array.isArray(value)) {
				for (const child of value) {
					if (child && typeof child === "object" && "type" in child) {
						visit(child as Node, file);
					}
				}
			} else if (value && typeof value === "object" && "type" in value) {
				visit(value as Node, file);
			}
		}
	};

	for (const file of files) {
		const rel = file.slice(dir.length + 1);
		const src = (await fs.promises.readFile(file, "utf8")) as string;
		let ast: Node;
		try {
			ast = parse(src, {
				ecmaVersion: "latest",
				sourceType: "script",
			}) as unknown as Node;
		} catch (err) {
			return `semantic gate: ${rel} does not parse (${(err as Error).message})`;
		}
		visit(ast, rel);
	}

	for (const call of calls) {
		const arity = defs.get(call.name);
		if (arity !== undefined && arity !== call.argc) {
			return (
				`semantic gate: ${call.name}() called with ${call.argc} arg(s) ` +
				`in ${call.file} but defined with ${arity} param(s) — ` +
				`a conflict git cannot see`
			);
		}
	}
	return null;
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
 * Speculatively land a finished tributary on the trunk: fetch both heads into
 * an in-memory repo, three-way merge, run the test gate, push the advanced
 * trunk. Trunk only moves on a clean, gate-green merge — the confluence doing
 * its work, one task at a time.
 */
export async function mergeTaskIntoTrunk(opts: {
	trunk: RemoteRepo;
	task: RemoteRepo;
	/** Resolver-provided content per file, applied via mergeDriver on retry. */
	resolutions?: Record<string, string>;
	/** Provenance stamped into the merge commit message. */
	context?: MergeContext;
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
		opts.resolutions,
		opts.context,
	);
	if (outcome.status === "conflict") return outcome;

	const gateFailure =
		(await runTestGate(fs, dir)) ?? (await runSemanticGate(fs, dir));
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
