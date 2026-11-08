/**
 * Sandbox gate regression harness.
 *
 * Exercises server/sandbox.ts in `local` provider mode (no Docker required):
 * the merged tree is materialized to a temp dir, the gate compiles the JS,
 * validates package.json, then executes the repo's verification command and
 * returns structured stdout/stderr/exit-code evidence.
 */
import { makeSandboxGate } from "../server/sandbox";

process.env.TRIBUTARY_SANDBOX = "local";

let failures = 0;

function check(name: string, cond: boolean, detail = "") {
	if (cond) {
		console.log(`  ✅ ${name}`);
	} else {
		failures++;
		console.log(`  ❌ ${name} ${detail}`);
	}
}

const PKG = JSON.stringify({ name: "fixture", version: "0.0.0" });

async function main() {
	console.log("🧪 Tributary sandbox-gate harness\n");
	const gate = makeSandboxGate();
	if (!gate) throw new Error("expected a sandbox gate in local mode");

	console.log("Case: verify.cjs executes and returns evidence");
	const ok = await gate({
		"package.json": PKG,
		"src/index.js": "exports.x = 1;\n",
		"verify.cjs": "console.log('verify ok');\n",
	});
	check("gate passes", ok.ok, JSON.stringify(ok));
	check(
		"verification command recorded",
		ok.evidence.verification?.command === "node verify.cjs",
		JSON.stringify(ok.evidence.verification),
	);
	check(
		"verification exit code is zero",
		ok.evidence.verification?.exitCode === 0,
		JSON.stringify(ok.evidence.verification),
	);
	check(
		"verification stdout captured",
		(ok.evidence.verification?.stdout ?? "").includes("verify ok"),
		JSON.stringify(ok.evidence.verification),
	);
	check(
		"outer exit code is zero",
		ok.evidence.exitCode === 0,
		JSON.stringify(ok.evidence),
	);

	console.log("\nCase: failing verify.cjs rejects with exit code + stderr");
	const bad = await gate({
		"package.json": PKG,
		"src/index.js": "exports.x = 1;\n",
		"verify.cjs":
			'console.log("before boom");\nconsole.error("verify boom");\nprocess.exit(3);\n',
	});
	check("gate rejects", !bad.ok, JSON.stringify(bad));
	check(
		"outer exit code is non-zero",
		bad.evidence.exitCode === 1,
		JSON.stringify(bad.evidence),
	);
	check(
		"verification exit code preserved",
		bad.evidence.verification?.exitCode === 3,
		JSON.stringify(bad.evidence.verification),
	);
	check(
		"verification stderr captured",
		(bad.evidence.verification?.stderr ?? "").includes("verify boom"),
		JSON.stringify(bad.evidence.verification),
	);

	console.log("\nCase: syntax failure skips verification");
	const syntax = await gate({
		"package.json": PKG,
		"broken.js": "exports.x = {{{\n",
		"verify.cjs": "console.log('should not run');\n",
	});
	check("gate rejects", !syntax.ok, JSON.stringify(syntax));
	check(
		"syntax error reported",
		(syntax.evidence.output ?? "").includes("does not parse"),
		syntax.evidence.output,
	);
	check(
		"verification not run after syntax failure",
		syntax.evidence.verification === undefined,
		JSON.stringify(syntax.evidence.verification),
	);

	console.log(
		failures === 0 ? "\nAll cases passed." : `\n${failures} case(s) failed.`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
