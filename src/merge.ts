import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { parse } from "acorn";
import { MemoryFS, type FsLike } from "./memory-fs";

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
	| { status: "merged"; commit: string; gate?: GateEvidence }
	| { status: "already-merged"; gate?: GateEvidence }
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
	| { status: "failed"; reason: string; gate?: GateEvidence };

/**
 * Evidence a gate run leaves behind, surfaced in the task record and the UI.
 * For the Docker sandbox this is the containment boundary made legible:
 * what the environment could not do (no network, no capabilities, read-only,
 * capped resources, destroyed after) plus what it actually observed.
 */
export interface GateEvidence {
	provider: string;
	spec?: Record<string, string>;
	output: string;
	stdout?: string;
	stderr?: string;
	exitCode: number;
	durationMs: number;
	timedOut?: boolean;
	/**
	 * The repo's own verification command run inside the sandbox —
	 * `verify.cjs`/`verify.js` or `npm test`. This is the executed-work proof:
	 * stdout/stderr/exit code from the merged tree itself, separate from the
	 * gate harness's own syntax/package checks.
	 */
	verification?: {
		command: string;
		exitCode: number;
		durationMs: number;
		timedOut: boolean;
		skipped?: boolean;
		reason?: string;
		stdout: string;
		stderr: string;
	};
}

/** A gate run's verdict plus the evidence it produced. */
export interface SandboxGateResult {
	ok: boolean;
	reason?: string;
	evidence: GateEvidence;
}

export interface RemoteRepo {
	remote: string;
	token: string;
}

/**
 * Sandboxed gate runner: receives the merged tree's files (path -> content)
 * and returns a verdict plus evidence. The Node/Vultr runtime runs this in
 * a throwaway container (server/sandbox.ts) so agent-influenced code never
 * executes in the control-plane process. When absent, the in-process
 * `runTestGate` stands in — the Workers deployment has no container runtime.
 */
export type SandboxGate = (
	files: Record<string, string>,
) => Promise<SandboxGateResult>;

/**
 * Materialize the checked-out tree at `dir` into a path -> content map —
 * what a sandboxed gate receives. Skips `.git` and `node_modules`.
 */
export async function collectTree(
	fs: FsLike,
	dir: string,
): Promise<Record<string, string>> {
	const files: Record<string, string> = {};
	const walk = async (d: string): Promise<void> => {
		for (const name of await fs.promises.readdir(d)) {
			if (name === ".git" || name === "node_modules") continue;
			const full = `${d}/${name}`;
			const stat = await fs.promises.stat(full);
			if (stat.isDirectory()) {
				await walk(full);
			} else {
				files[full.slice(dir.length + 1)] = (await fs.promises.readFile(
					full,
					"utf8",
				)) as string;
			}
		}
	};
	await walk(dir);
	return files;
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
	fs: FsLike,
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
	fs: FsLike,
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

interface Node {
	type: string;
	[key: string]: unknown;
}

/** One arity fact discovered in a file, in source order. */
interface ArityOp {
	name: string;
	/** Lowest legal arg count — position of the last required param. */
	min: number;
	/** Highest legal arg count — param total, or Infinity when a rest exists. */
	max: number;
	/** `function f(…) {}` — recorded only while the name is still unseen. */
	ifAbsent: boolean;
	/**
	 * File-local binding (`const f = () => …`, local `function f`): visible
	 * only to calls in the same file, where it shadows the global pool. This
	 * is what keeps a common name like `read` from colliding across files
	 * that each define their own.
	 */
	local?: boolean;
}

/** Per-file scan result; `ok: false` carries the parser's message. */
interface SourceAnalysis {
	ok: boolean;
	message?: string;
	ops: ArityOp[];
	calls: { name: string; argc: number }[];
}

/**
 * The legal arg-count window for a parameter list.
 *
 * `min` is the position of the last param a caller cannot legally omit:
 * everything after it must be optional (`?`), defaulted (`=`) or a rest
 * element — so `f(a, b = 1, c)` still requires 3 args, because `c` has to be
 * supplied even though `b` does not. `max` is the param count, or Infinity
 * when a rest element absorbs extras.
 *
 * `src`/`stripped` exist for TypeScript: `b?: string` strips to `b`, erasing
 * the marker — but stripping is position-preserving, so the original source
 * at the param's end offset still carries the `?`.
 */
/**
 * Does this function read `arguments`? If so it is variadic by design — its
 * declared param count is a hint, not a contract, and any call argc is legal
 * above `min`. Nested non-arrow functions bind their own `arguments`, so the
 * scan stops at them; arrows share the enclosing one.
 */
function usesArguments(fn: Node): boolean {
	let found = false;
	const walk = (n: unknown): void => {
		if (found || !n || typeof n !== "object") return;
		if (Array.isArray(n)) {
			for (const c of n) walk(c);
			return;
		}
		const node = n as Node;
		if (typeof node.type !== "string") return;
		if (node.type === "Identifier" && node.name === "arguments") {
			found = true;
			return;
		}
		if (
			node.type === "FunctionDeclaration" ||
			node.type === "FunctionExpression"
		) {
			return;
		}
		for (const v of Object.values(node)) walk(v);
	};
	for (const v of Object.values((fn.body as Node) ?? {})) walk(v);
	return found;
}

function paramRange(
	fnNode: Node,
	src: string,
	stripped: boolean,
): { min: number; max: number } {
	const params = fnNode.params as Node[];
	let min = 0;
	let rest = false;
	params.forEach((p, i) => {
		if (p.type === "RestElement") {
			rest = true;
			return;
		}
		const isDefault = p.type === "AssignmentPattern";
		const end = (p as { end?: number }).end;
		const isOptional =
			stripped && typeof end === "number" && /^\s*\?/.test(src.slice(end));
		if (!isDefault && !isOptional) min = i + 1;
	});
	return {
		min,
		max: rest || usesArguments(fnNode) ? Infinity : params.length,
	};
}

/**
 * Is this initializer an opaque function source — a `require()` call
 * (possibly chained: `require('m')('ns')`), a member access (`x = a.b`,
 * borrowing a function), or a call result from a member
 * (`x = a.b()`)? The variable's arity lives wherever that module bound it,
 * so the gate treats the name as uncheckable rather than letting it collide
 * with a same-named def elsewhere in the pool.
 */
function isOpaqueInit(node: Node): boolean {
	if (!node || typeof node.type !== "string") return false;
	if (node.type === "AwaitExpression") {
		return isOpaqueInit(node.argument as Node);
	}
	if (node.type === "MemberExpression") return true;
	if (node.type === "CallExpression") {
		let callee = node.callee as Node;
		while (callee && callee.type === "CallExpression") {
			callee = callee.callee as Node;
		}
		return (
			(callee?.type === "Identifier" && callee.name === "require") ||
			callee?.type === "MemberExpression"
		);
	}
	return false;
}

const paramRangeOf = (
	node: Node,
	src: string,
	stripped: boolean,
): { min: number; max: number } | null => {
	if (!node || typeof node.type !== "string") return null;
	if (
		node.type === "ArrowFunctionExpression" ||
		node.type === "FunctionExpression" ||
		node.type === "FunctionDeclaration"
	) {
		return paramRange(node, src, stripped);
	}
	if (node.type === "AwaitExpression") {
		return paramRangeOf(node.argument as Node, src, stripped);
	}
	return null;
};

/**
 * Source extensions the semantic gate scans. `.ts`/`.tsx`/`.mts`/`.cts` are
 * included because most agent-edited repos are TypeScript; a gate that only
 * sees JavaScript misses the majority of real trees.
 */
export const SCANNABLE = /\.(mjs|cjs|js|mts|cts|ts|tsx)$/;

/**
 * Pure TypeScript declaration files (`.d.ts` and CJS/ESM variants): type
 * surface only — no runtime code, no call sites, nothing the arity check can
 * act on. Scanning them only produces parse noise (they use non-erasable
 * constructs like `declare module` that stripping cannot remove).
 */
const DECLARATION_ONLY = /\.d\.(ts|cts|mts)$/;

/**
 * Directories whose contents are generated artifacts rather than source:
 * build output, framework output and vendored dependencies. The gate skips
 * them — a bundled prelude (webpack/browserify helpers like `s(o,u)`, called
 * variadically by construction) is arity noise, and a stale dist/ is
 * regenerated rather than edited. `.min.*` files are skipped for the same
 * reason.
 */
const GENERATED_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	"out",
	"coverage",
	".next",
	".nuxt",
	".output",
	".turbo",
	".vercel",
	"vendor",
]);
const MINIFIED = /\.min\.(mjs|cjs|js)$/;

/**
 * The gate's visibility predicate: scannable extension, not minified, and
 * not under a generated directory. Shared with the audit tooling so it
 * materializes exactly the files the gate will read.
 */
export function gateScannablePath(path: string): boolean {
	const segments = path.split("/");
	const base = segments[segments.length - 1];
	return (
		SCANNABLE.test(base) &&
		!DECLARATION_ONLY.test(base) &&
		!MINIFIED.test(base) &&
		!segments.slice(0, -1).some((seg) => GENERATED_DIRS.has(seg))
	);
}

/**
 * Strip TypeScript syntax so acorn can parse the result.
 *
 * We do not use the TypeScript compiler API: this repo pins TS 7, the native
 * port, which ships no JS API (`ts.createSourceFile` is undefined). Node's
 * built-in `stripTypeScriptTypes` erases annotations, interfaces, type aliases
 * and `as` casts while preserving every runtime construct — which is exactly
 * what an arity check needs, and it keeps the gate dependency-free and
 * Worker-compatible (no Node fs, no tsc).
 *
 * Returns null when the source is plain JS or when stripping is unavailable,
 * so the caller falls through to parsing the original text.
 */
function stripTypes(src: string, file: string): string | null {
	if (!/\.(mts|cts|ts|tsx)$/.test(file)) return null;
	try {
		// `process.getBuiltinModule` is the Workers-safe way to reach a Node
		// builtin: it is typed, needs no `require`, and is simply absent under
		// Wrangler — where the gate degrades to JS-only rather than failing.
		const mod = process.getBuiltinModule?.("node:module") as
			{ stripTypeScriptTypes?: (code: string) => string } | undefined;
		const strip = mod?.stripTypeScriptTypes;
		if (typeof strip !== "function") return null;
		return strip(src);
	} catch {
		return null;
	}
}

/**
 * Parse as an ES module, falling back to script mode.
 *
 * Order matters: module first, because a file using `import`/`export` cannot
 * parse as a script at all. A CommonJS file parses fine as a module too, so
 * the fallback only matters for the rare script-only construct (e.g. a bare
 * `with` statement or top-level `return`).
 */
function parseWithFallback(code: string): Node {
	try {
		return parse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
			allowHashBang: true,
		}) as unknown as Node;
	} catch (moduleErr) {
		try {
			return parse(code, {
				ecmaVersion: "latest",
				sourceType: "script",
				allowHashBang: true,
			}) as unknown as Node;
		} catch {
			// Report the module-mode error: it is the more informative of the two
			// for modern code, and it is what the caller sees as "does not parse".
			throw moduleErr;
		}
	}
}

/**
 * Parse and scan one file in isolation — no shared state, so the result can be
 * cached and replayed later without depending on which files preceded it.
 */
function parseSource(src: string, file = "input.js"): SourceAnalysis {
	const ops: ArityOp[] = [];
	const calls: { name: string; argc: number }[] = [];

	// TypeScript is stripped first so the same AST walk covers both
	// languages; the walker below sees only runtime constructs. `isStripped`
	// tells paramRange it may recover `?` optionals from the original src.
	const strippedCode = stripTypes(src, file);
	const isStripped = strippedCode !== null;
	const code = strippedCode ?? src;

	let ast: Node;
	try {
		// Try module first, then script. A file may legitimately be either, and
		// parsing as `script` alone rejects every ESM file — which silently
		// excluded most real repos from the gate. `sourceType` is a parse mode,
		// not a runtime claim: `export` is still detected by the walker below.
		ast = parseWithFallback(code);
	} catch (err) {
		// Cached like any other result: a file that does not parse must keep
		// failing the gate on every later merge, not silently pass.
		return { ok: false, message: (err as Error).message, ops, calls };
	}

	// inModuleScope is true only for statements the module actually exports to
	// callers: direct children of Program (or of a top-level export wrapper).
	// A `function` nested inside another is private to it — recording it as a
	// def would let an inner helper (e.g. the variadic `debug` inside
	// createDebug) collide with a top-level name in a different file.
	const visit = (node: Node, parent?: Node, inModuleScope = false) => {
		if (!node || typeof node.type !== "string") return;
		// const f = (…) => … / let g = function (…) {} / var h = async (…) => …
		// A file-local binding: visible to calls in this file (where it shadows
		// any global of the same name), and to the global pool only when the
		// declaration itself is exported.
		if (node.type === "VariableDeclaration" && inModuleScope) {
			const isExported = parent?.type === "ExportNamedDeclaration";
			for (const decl of node.declarations as Node[]) {
				const id = decl.id as Node | null;
				if (!id || id.type !== "Identifier") continue;
				const name = id.name as string;
				const range = paramRangeOf(decl.init as Node, src, isStripped);
				if (!range) {
					// `x = require('m')(…)` / `x = a.b` — the variable holds an
					// imported or borrowed function whose arity lives in another
					// module we may not see. Record an opaque local ({0..∞}):
					// it shadows the global pool so this file's `x(...)` calls
					// are never checked against an unrelated same-named def.
					if (isOpaqueInit(decl.init as Node)) {
						ops.push({
							name,
							min: 0,
							max: Infinity,
							ifAbsent: true,
							local: true,
						});
					}
					continue;
				}
				ops.push({ name, ...range, ifAbsent: true, local: true });
				if (isExported) {
					ops.push({ name, ...range, ifAbsent: false });
				}
			}
		}
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
				const range = paramRangeOf(node.right as Node, src, isStripped);
				if (range !== null) {
					// Unconditional: an export assignment overwrites a prior arity.
					ops.push({
						name: prop.name as string,
						min: range.min,
						max: range.max,
						ifAbsent: false,
					});
				}
			}
		}
		// function f(…) {} at module scope — a local binding for this file's
		// calls, and a conditional entry in the global pool: a declaration
		// never clobbers a name an earlier file (or earlier line) defined.
		if (node.type === "FunctionDeclaration" && inModuleScope) {
			const id = node.id as Node | null;
			if (id?.type === "Identifier") {
				const range = paramRange(node, src, isStripped);
				ops.push({
					name: id.name as string,
					min: range.min,
					max: range.max,
					ifAbsent: true,
					local: true,
				});
				ops.push({
					name: id.name as string,
					min: range.min,
					max: range.max,
					ifAbsent: true,
				});
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
			});
		}
		// Children of Program are module-scope; so are the declaration inside a
		// top-level `export`/`export default`. Everything deeper — function
		// bodies, blocks, classes — is not.
		const childScope =
			node.type === "Program" ||
			(inModuleScope &&
				(node.type === "ExportNamedDeclaration" ||
					node.type === "ExportDefaultDeclaration"));
		for (const value of Object.values(node)) {
			if (Array.isArray(value)) {
				for (const child of value) {
					if (child && typeof child === "object" && "type" in child) {
						visit(child as Node, node, childScope);
					}
				}
			} else if (value && typeof value === "object" && "type" in value) {
				visit(value as Node, node, childScope);
			}
		}
	};

	visit(ast);
	return { ok: true, ops, calls };
}

/** Cheap synchronous content hash — no crypto, no dependency. */
function hashSource(src: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < src.length; i++) {
		h ^= src.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return `${h >>> 0}:${src.length}`;
}

/**
 * Content-addressed cache of per-file scans.
 *
 * The key is the file's own text, never its path, so the same bytes are only
 * ever parsed once — across merges, forks and renames. This is safe because a
 * scan depends on nothing but the source (see `parseSource`): the merged tree
 * is largely identical merge to merge, and acorn `parse` is the expensive part
 * of the gate. FIFO-bounded so a long-lived isolate cannot grow without limit;
 * an eviction is a miss, never a wrong answer.
 */
const SOURCE_CACHE_MAX = 1000;
const SOURCE_CACHE = new Map<string, SourceAnalysis>();

function analyzeSource(src: string, file = "input.js"): SourceAnalysis {
	const key = hashSource(src);
	const hit = SOURCE_CACHE.get(key);
	if (hit) return hit;

	const result = parseSource(src, file);
	if (SOURCE_CACHE.size >= SOURCE_CACHE_MAX) {
		// Map preserves insertion order, so the first key is the oldest.
		const oldest = SOURCE_CACHE.keys().next().value;
		if (oldest !== undefined) SOURCE_CACHE.delete(oldest);
	}
	SOURCE_CACHE.set(key, result);
	return result;
}

/**
 * One reason the semantic gate would refuse a tree.
 *
 * `runSemanticGate` reports a single reason string; the audit tool needs every
 * finding so it can diff a commit's findings against its parent's and count
 * only what the commit introduced. `kind` separates the two failure modes:
 * `parse` (a scannable file the parser rejected — on real repos this is often
 * a gate limitation, e.g. JSX in a .js file) from `arity` (the differentiator
 * the gate exists for).
 */
export interface GateFinding {
	kind: "parse" | "arity";
	/** Repo-relative file the finding was observed in. */
	file: string;
	/** The gate's reason string — the same text `runSemanticGate` reports. */
	detail: string;
	/** Callee name for arity findings; lets callers dedupe across trees. */
	name?: string;
	argc?: number;
	/** The callee's legal arg-count window. */
	min?: number;
	max?: number;
}

/**
 * Every reason the semantic gate would refuse this tree, in gate order.
 *
 * Order mirrors `runSemanticGate` exactly: parse failures dominate (a tree
 * that doesn't parse never reaches the arity check), then arity mismatches in
 * file/call order. `runSemanticGate` is this function's first finding.
 */
export async function semanticGateFindings(
	fs: FsLike,
	dir: string,
): Promise<GateFinding[]> {
	const files: string[] = [];
	const walk = async (d: string): Promise<void> => {
		for (const name of await fs.promises.readdir(d)) {
			if (name === ".git" || GENERATED_DIRS.has(name)) continue;
			const full = `${d}/${name}`;
			const stat = await fs.promises.stat(full);
			if (stat.isDirectory()) await walk(full);
			else if (gateScannablePath(full.slice(dir.length + 1))) files.push(full);
		}
	};
	await walk(dir);

	const parseFindings: GateFinding[] = [];
	const defs = new Map<string, { min: number; max: number }>();
	// Same-file bindings — `const f = () => …`, local `function f` — which
	// shadow the global pool for that file's calls only.
	const localDefs = new Map<
		string,
		Map<string, { min: number; max: number }>
	>();
	const calls: { name: string; argc: number; file: string }[] = [];

	for (const file of files) {
		const rel = file.slice(dir.length + 1);
		const src = (await fs.promises.readFile(file, "utf8")) as string;
		const analysis = analyzeSource(src, rel);
		if (!analysis.ok) {
			parseFindings.push({
				kind: "parse",
				file: rel,
				detail: `semantic gate: ${rel} does not parse (${analysis.message})`,
			});
			continue;
		}
		// Replay the file's ops in source order so both write semantics
		// survive: exports overwrite, declarations only fill a gap, and
		// locals never enter the global pool at all.
		for (const op of analysis.ops) {
			if (op.local) {
				let local = localDefs.get(rel);
				if (!local) localDefs.set(rel, (local = new Map()));
				local.set(op.name, { min: op.min, max: op.max });
				continue;
			}
			if (!op.ifAbsent || !defs.has(op.name))
				defs.set(op.name, { min: op.min, max: op.max });
		}
		for (const call of analysis.calls) {
			calls.push({ name: call.name, argc: call.argc, file: rel });
		}
	}

	if (parseFindings.length) return parseFindings;

	// A call resolves against its own file's bindings first — a local `read`
	// is never confused with someone else's exported `read`.
	const resolveRange = (name: string, file: string) =>
		localDefs.get(file)?.get(name) ?? defs.get(name);

	return calls
		.filter((call) => {
			const range = resolveRange(call.name, call.file);
			return (
				range !== undefined && (call.argc < range.min || call.argc > range.max)
			);
		})
		.map((call) => {
			const range = resolveRange(call.name, call.file) as {
				min: number;
				max: number;
			};
			const window =
				range.min === range.max
					? `${range.min}`
					: `${range.min}–${range.max === Infinity ? "∞" : range.max}`;
			return {
				kind: "arity" as const,
				file: call.file,
				name: call.name,
				argc: call.argc,
				min: range.min,
				max: range.max,
				detail:
					`semantic gate: ${call.name}() called with ${call.argc} arg(s) ` +
					`in ${call.file} but defined with ${window} param(s) — ` +
					`a conflict git cannot see`,
			};
		});
}

/**
 * Semantic gate: parses every scannable file in the merged tree with a real
 * parser (acorn — no Node fs, so it runs in a Worker where tsc can't),
 * collects function arities, and rejects when a bare-identifier call passes
 * the wrong arg count. A file that doesn't parse also fails — the merged tree
 * must be real code. Returns the first finding's reason, or null if clean.
 *
 * Stand-in for the production shape (repo's own checks — tsc, eslint, test
 * suite — run in a Cloudflare Sandbox). Limitations: whole-file symbol
 * matching, bare calls only (no `x.f()` member checks).
 */
export async function runSemanticGate(
	fs: FsLike,
	dir: string,
): Promise<string | null> {
	const findings = await semanticGateFindings(fs, dir);
	return findings[0]?.detail ?? null;
}

/**
 * Spike stand-in for the Sandbox test run: if the merged tree carries a
 * package.json it must still parse. Returns a failure reason or null.
 */
export async function runTestGate(
	fs: FsLike,
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
	/**
	 * Sandboxed gate runner (Node/Vultr mode). When present, it replaces the
	 * in-process fixture gate; the semantic gate always runs in-process.
	 */
	gate?: SandboxGate;
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

	const verdict = opts.gate
		? await opts.gate(await collectTree(fs, dir))
		: null;
	const gateFailure =
		(verdict
			? verdict.ok
				? null
				: (verdict.reason ?? "sandbox gate failed")
			: await runTestGate(fs, dir)) ?? (await runSemanticGate(fs, dir));
	if (gateFailure) {
		return {
			status: "failed",
			reason: gateFailure,
			gate: verdict?.evidence,
		};
	}

	// Already-merged work adds nothing to trunk — skip the push.
	if (outcome.status === "already-merged") {
		return { ...outcome, gate: verdict?.evidence };
	}

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

	return { ...outcome, gate: verdict?.evidence };
}
