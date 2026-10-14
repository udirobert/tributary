/**
 * Local harness for the merge engine (scripts/test-merge.ts).
 *
 * Builds trunk + task histories directly on a MemoryFS repo — no Artifacts
 * transport — and exercises mergeBranches / runTestGate across the four
 * outcomes the queue consumer handles: merged, conflict, already-merged,
 * and test-gate failure.
 */
import git from "isomorphic-git";
import { MemoryFS } from "../src/memory-fs";
import { mergeBranches, runTestGate, runSemanticGate } from "../src/merge";

const AUTHOR = { name: "Harness", email: "harness@tributary.dev" };

let failures = 0;

function check(name: string, cond: boolean, detail = "") {
	if (cond) {
		console.log(`  ✅ ${name}`);
	} else {
		failures++;
		console.log(`  ❌ ${name} ${detail}`);
	}
}

async function writeAndAdd(
	fs: MemoryFS,
	dir: string,
	filepath: string,
	content: string,
) {
	await fs.promises.writeFile(`${dir}/${filepath}`, content);
	await git.add({ fs, dir, filepath });
}

async function setupRepo(dir: string) {
	const fs = new MemoryFS();
	await git.init({ fs, dir, defaultBranch: "main" });
	await writeAndAdd(fs, dir, "a.txt", "base a\n");
	await writeAndAdd(fs, dir, "b.txt", "base b\n");
	await writeAndAdd(
		fs,
		dir,
		"package.json",
		JSON.stringify({ name: "fixture" }),
	);
	await git.commit({ fs, dir, message: "base", author: AUTHOR });
	return fs;
}

async function commitOn(
	fs: MemoryFS,
	dir: string,
	ref: string,
	edits: Record<string, string>,
	message: string,
) {
	await git.checkout({ fs, dir, ref });
	for (const [filepath, content] of Object.entries(edits)) {
		await writeAndAdd(fs, dir, filepath, content);
	}
	return git.commit({ fs, dir, message, author: AUTHOR });
}

async function read(fs: MemoryFS, dir: string, filepath: string) {
	return (await fs.promises.readFile(`${dir}/${filepath}`, "utf8")) as string;
}

async function caseCleanMerge() {
	console.log("\nCase: disjoint changes merge cleanly");
	const dir = "/case-clean";
	const fs = await setupRepo(dir);

	await git.branch({ fs, dir, ref: "task" });
	await commitOn(fs, dir, "task", { "a.txt": "task change\n" }, "task edit a");
	await commitOn(
		fs,
		dir,
		"main",
		{ "b.txt": "trunk change\n" },
		"trunk edit b",
	);

	const outcome = await mergeBranches(fs, dir, "main", "task");
	check(
		"status is merged",
		outcome.status === "merged",
		JSON.stringify(outcome),
	);
	check(
		"both changes present",
		(outcome.status === "merged" &&
			(await read(fs, dir, "a.txt")) === "task change\n" &&
			(await read(fs, dir, "b.txt")) === "trunk change\n") as boolean,
	);
	check("test gate green", (await runTestGate(fs, dir)) === null);
}

async function caseConflict() {
	console.log("\nCase: same-file edits surface as a real conflict");
	const dir = "/case-conflict";
	const fs = await setupRepo(dir);

	await git.branch({ fs, dir, ref: "task" });
	await commitOn(fs, dir, "task", { "a.txt": "task version\n" }, "task edit a");
	await commitOn(
		fs,
		dir,
		"main",
		{ "a.txt": "trunk version\n" },
		"trunk edit a",
	);

	const outcome = await mergeBranches(fs, dir, "main", "task");
	check(
		"status is conflict",
		outcome.status === "conflict",
		JSON.stringify(outcome),
	);
	check(
		"a.txt reported as conflicted",
		outcome.status === "conflict" && outcome.conflictedFiles.includes("a.txt"),
		outcome.status === "conflict" ? outcome.conflictedFiles.join() : "",
	);
}

async function caseAlreadyMerged() {
	console.log("\nCase: re-landing merged work is a no-op");
	const dir = "/case-repeat";
	const fs = await setupRepo(dir);

	await git.branch({ fs, dir, ref: "task" });
	await commitOn(fs, dir, "task", { "a.txt": "task change\n" }, "task edit a");

	const first = await mergeBranches(fs, dir, "main", "task");
	check("first merge lands", first.status === "merged", JSON.stringify(first));

	const second = await mergeBranches(fs, dir, "main", "task");
	check(
		"second merge is already-merged",
		second.status === "already-merged",
		JSON.stringify(second),
	);
}

async function caseGateFailure() {
	console.log(
		"\nCase: broken package.json fails the test gate after a clean merge",
	);
	const dir = "/case-gate";
	const fs = await setupRepo(dir);

	await git.branch({ fs, dir, ref: "task" });
	await commitOn(
		fs,
		dir,
		"task",
		{ "package.json": "{ definitely not json" },
		"task breaks package.json",
	);

	const outcome = await mergeBranches(fs, dir, "main", "task");
	check(
		"merge itself is clean",
		outcome.status === "merged",
		JSON.stringify(outcome),
	);

	const gate = await runTestGate(fs, dir);
	check("test gate rejects", gate !== null, gate ?? "");
}

async function caseSemanticGate() {
	console.log(
		"\nCase: signature change merges clean but fails the semantic gate",
	);
	const dir = "/case-semantic";
	const fs = await setupRepo(dir);

	// trunk: greet(name) defined in one file, called with one arg in another
	await commitOn(
		fs,
		dir,
		"main",
		{
			"greet.js": "exports.greet = (name) => `Hello, ${name}!`;\n",
			"handlers.js": 'const r = () => greet("world");\n',
		},
		"seed greet + caller",
	);

	// task: signature change — textually disjoint from the caller, so git
	// merges it clean and only the semantic gate sees the breakage
	await git.branch({ fs, dir, ref: "task" });
	await commitOn(
		fs,
		dir,
		"task",
		{
			"greet.js":
				"exports.greet = (name, greeting) => `${greeting}, ${name}!`;\n",
		},
		"task changes greet signature",
	);

	const outcome = await mergeBranches(fs, dir, "main", "task");
	check(
		"git merge is clean",
		outcome.status === "merged",
		JSON.stringify(outcome),
	);

	const gate = await runSemanticGate(fs, dir);
	check("semantic gate rejects", gate !== null, gate ?? "");
	check(
		"names the invisible conflict",
		gate !== null && gate.includes("greet") && gate.includes("handlers.js"),
		gate ?? "",
	);
}

async function main() {
	console.log("🌊 Tributary merge-engine harness");
	await caseCleanMerge();
	await caseConflict();
	await caseAlreadyMerged();
	await caseGateFailure();
	await caseSemanticGate();

	console.log(
		failures === 0 ? "\nAll cases passed." : `\n${failures} case(s) failed.`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
