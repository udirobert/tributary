/**
 * TypeScript coverage harness for the semantic gate.
 *
 * The gate originally scanned only .js/.cjs/.mjs, which meant it was blind to
 * the majority of real agent-edited repos. These cases prove the TS path works
 * and — just as important — that a clean TS tree is not a false positive.
 */
import git from "isomorphic-git";
import { MemoryFS } from "../src/memory-fs";
import { runSemanticGate } from "../src/merge";

const AUTHOR = { name: "Harness", email: "harness@tributary.dev" };

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
	if (cond) console.log(`  ✅ ${name}`);
	else {
		failures++;
		console.log(`  ❌ ${name} ${detail}`);
	}
}

async function buildTree(
	dir: string,
	files: Record<string, string>,
): Promise<MemoryFS> {
	const fs = new MemoryFS();
	await git.init({ fs, dir, defaultBranch: "main" });
	for (const [filepath, content] of Object.entries(files)) {
		await fs.promises.writeFile(`${dir}/${filepath}`, content);
		await git.add({ fs, dir, filepath });
	}
	await git.commit({ fs, dir, message: "base", author: AUTHOR });
	return fs;
}

async function main() {
	console.log("🧪 TypeScript semantic-gate harness\n");

	console.log("Case: .ts signature change breaks a .ts caller");
	const fs1 = await buildTree("/ts-arity", {
		"greet.ts":
			"export function greet(name: string, greeting: string): string {\n" +
			"  return `${greeting} ${name}`;\n}\n",
		"handlers.ts": 'const r = () => greet("world");\n',
	});
	const v1 = await runSemanticGate(fs1, "/ts-arity");
	check("gate rejects", v1 !== null, v1 ?? "returned null");
	check("names the symbol", (v1 ?? "").includes("greet"), v1 ?? "");
	check("names the caller file", (v1 ?? "").includes("handlers.ts"), v1 ?? "");

	console.log("\nCase: interfaces, generics and casts do not false-positive");
	const fs2 = await buildTree("/ts-clean", {
		"a.ts":
			"interface Opts { x: number }\n" +
			"export function f(o: Opts, n: number): void {}\n" +
			"f({ x: 1 }, 2);\n",
		"b.ts":
			"type Id = string;\n" +
			"export const g = (id: Id, count: number): Id => id;\n" +
			'g("x", 3);\n',
	});
	const v2 = await runSemanticGate(fs2, "/ts-clean");
	check("gate passes a clean TS tree", v2 === null, v2 ?? "");

	console.log("\nCase: .tsx component signature change");
	const fs3 = await buildTree("/tsx-arity", {
		"Button.tsx":
			"export function Button(label: string, size: number) {\n" +
			"  return label;\n}\n",
		"App.tsx": 'const el = () => Button("go");\n',
	});
	const v3 = await runSemanticGate(fs3, "/tsx-arity");
	check("gate rejects", v3 !== null, v3 ?? "returned null");
	check("names the symbol", (v3 ?? "").includes("Button"), v3 ?? "");

	console.log("\nCase: mixed .ts and .js tree, cross-language caller");
	const fs4 = await buildTree("/ts-mixed", {
		"api.ts":
			"export function fetchUser(id: number, opts: object): number {\n" +
			"  return id;\n}\n",
		"legacy.js": "const u = () => fetchUser(42);\n",
	});
	const v4 = await runSemanticGate(fs4, "/ts-mixed");
	check("gate rejects across languages", v4 !== null, v4 ?? "returned null");
	check("names the symbol", (v4 ?? "").includes("fetchUser"), v4 ?? "");

	// The cases below come from auditing real history (scripts/audit.ts):
	// each is a false-positive mechanism found in the wild, now a regression
	// test. Removing any of them reopens a way to refuse correct code.

	console.log("\nCase: optional, default and rest params are legal");
	const fs5 = await buildTree("/ts-optional", {
		"api.ts":
			"export function http(method: string, path: string, body?: object) {}\n" +
			'http("GET", "/status");\n' +
			"export function merge(a: number, b = 2, c?: number) {}\n" +
			"merge(1);\nmerge(1, 2);\nmerge(1, 2, 3);\n" +
			"export function collect(...items: number[]) {}\n" +
			"collect();\ncollect(1, 2, 3);\n",
	});
	const v5 = await runSemanticGate(fs5, "/ts-optional");
	check("gate passes optional/default/rest calls", v5 === null, v5 ?? "");

	console.log("\nCase: variadic function using `arguments` is not flagged");
	const fs6 = await buildTree("/ts-variadic", {
		"log.js":
			"function debug() {\n" +
			"  var args = new Array(arguments.length);\n" +
			"  return args;\n" +
			"}\n" +
			"exports.debug = debug;\n",
		"app.js": 'debug("a", 1, 2, 3);\n',
	});
	const v6 = await runSemanticGate(fs6, "/ts-variadic");
	check("gate passes arguments-variadic calls", v6 === null, v6 ?? "");

	console.log("\nCase: same-named local bindings do not collide across files");
	const fs7 = await buildTree("/local-shadow", {
		"helpers.ts":
			"export function read(a: string, b: number, c: number) {}\n" +
			'read("x", 1, 2);\n',
		"merge.ts":
			"const read = async (oid: string, file: string) => file;\n" +
			'const r = read("sha", "f");\n',
	});
	const v7 = await runSemanticGate(fs7, "/local-shadow");
	check("local binding shadows global of same name", v7 === null, v7 ?? "");

	console.log("\nCase: nested declarations stay private to their function");
	const fs8 = await buildTree("/nested-decl", {
		"lib.js":
			"function createDebug(namespace) {\n" +
			"  function debug() { return arguments.length; }\n" +
			"  return debug;\n" +
			"}\n" +
			"exports.createDebug = createDebug;\n",
		"app.js": 'debug("ns");\n',
	});
	const v8 = await runSemanticGate(fs8, "/nested-decl");
	check("nested decl is not a module-scope def", v8 === null, v8 ?? "");

	console.log("\nCase: require-bound names are opaque, not pool guesses");
	const fs9 = await buildTree("/opaque-require", {
		"factory.js":
			"function debug(namespace) { return namespace; }\n" +
			"module.exports = debug;\n",
		"app.js":
			"var debug = require('./factory.js')('http');\n" +
			'debug("booting %s", "app");\n',
	});
	const v9 = await runSemanticGate(fs9, "/opaque-require");
	check(
		"require-bound name is uncheckable, not mismatched",
		v9 === null,
		v9 ?? "",
	);

	console.log("\nCase: generated dirs and minified files are invisible");
	const fs10 = await buildTree("/generated", {
		"dist/bundle.js": "function s(o,u){return o}\ns(1);\n",
		"build/out.js": "function broken(a,b){}\nbroken(1);\n",
		"src/ok.js": "function ok(a) { return a; }\nok(1);\n",
	});
	const v10 = await runSemanticGate(fs10, "/generated");
	check("generated output is not gated", v10 === null, v10 ?? "");

	console.log("\nCase: arity break in required-position still rejects");
	const fs11 = await buildTree("/still-broken", {
		"api.ts":
			"export function f(a: number, b = 2, c?: number) {}\n" +
			"export function g(a: number, b: number, c?: number) {}\n" +
			"g(1);\n",
	});
	const v11 = await runSemanticGate(fs11, "/still-broken");
	check("required param still required", v11 !== null, v11 ?? "passed");

	console.log(
		failures === 0 ? "\nAll cases passed." : `\n${failures} case(s) failed.`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
