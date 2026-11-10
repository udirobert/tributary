#!/usr/bin/env tsx
/**
 * tributary pr-gate — run the semantic gate on a pull request.
 *
 * For a `pull_request` event, `GITHUB_SHA` is the merge commit GitHub already
 * computed — the exact tree the merge would produce. This script runs the
 * real gate (`semanticGateFindings` + `runTestGate`, the same functions the
 * confluence runs) on that tree, then diffs the findings against the PR base
 * so the verdict counts only what THIS PR introduces:
 *
 *   new arity/test findings  -> fail (exit 1): a conflict git cannot see
 *   new parse findings       -> warn (exit 0): a file the gate cannot read
 *   pre-existing findings    -> reported, not counted: not this PR's doing
 *
 * Environment (set by Actions): GITHUB_WORKSPACE (the checkout),
 * GITHUB_BASE_SHA, GITHUB_SHA, GITHUB_STEP_SUMMARY. Locally:
 *
 *   npx tsx scripts/pr-gate.ts <repo> [base] [head]
 */
import { appendFileSync } from "node:fs";
import {
	semanticGateFindings,
	runTestGate,
	type GateFinding,
} from "../src/merge";
import type { MemoryFS } from "../src/memory-fs";
import { git, gitStatus, materialize } from "./git-tree";

const [repoArg, baseArg, headArg] = process.argv.slice(2);
const REPO = repoArg ?? process.env.GITHUB_WORKSPACE ?? process.cwd();
const BASE = baseArg ?? process.env.GITHUB_BASE_SHA ?? "";
const HEAD = headArg ?? process.env.GITHUB_SHA ?? "HEAD";

type Finding = Omit<GateFinding, "kind"> & {
	kind: "parse" | "arity" | "test";
};

async function findingsFor(treeish: string): Promise<Finding[]> {
	const fs: MemoryFS = await materialize(REPO, treeish);
	const out: Finding[] = await semanticGateFindings(fs, "/tree");
	const test = await runTestGate(fs, "/tree");
	if (test) out.unshift({ kind: "test", file: "package.json", detail: test });
	return out;
}

const keyOf = (f: Finding) => `${f.kind}|${f.detail}`;

async function main() {
	// The base may be absent in a shallow checkout — deepen just enough.
	let baseSha = BASE;
	if (BASE) {
		const have = gitStatus(REPO, "cat-file", "-e", `${BASE}^{commit}`);
		if (have.status !== 0) {
			git(REPO, "fetch", "--depth=200", "origin", BASE);
		}
		baseSha = git(REPO, "rev-parse", BASE).trim();
	}

	const headSha = git(REPO, "rev-parse", HEAD).trim();
	const headFindings = await findingsFor(headSha);
	const baseFindings = baseSha ? await findingsFor(baseSha) : [];
	const baseKeys = new Set(baseFindings.map(keyOf));
	const added = headFindings.filter((f) => !baseKeys.has(keyOf(f)));
	const carried = headFindings.length - added.length;

	const newReal = added.filter((f) => f.kind !== "parse");
	const newParse = added.filter((f) => f.kind === "parse");
	const fail = newReal.length > 0;

	const lines: string[] = [];
	lines.push("## Tributary gate");
	lines.push("");
	lines.push(
		fail
			? `**FAIL** — this PR introduces ${newReal.length} finding(s) ` +
					"git's merge cannot see:"
			: "**PASS** — no new gate findings in this PR.",
	);
	lines.push("");
	if (newReal.length) {
		for (const f of newReal.slice(0, 20)) {
			lines.push(`- ❌ \`${f.file}\` — ${f.detail}`);
		}
		if (newReal.length > 20) lines.push(`- … ${newReal.length - 20} more`);
		lines.push("");
	}
	if (newParse.length) {
		lines.push(
			`New files the gate cannot parse (${newParse.length}) — warning only:`,
		);
		for (const f of newParse.slice(0, 10)) lines.push(`- ⚠️ \`${f.file}\``);
		lines.push("");
	}
	lines.push(
		`_${headFindings.length} finding(s) on the merge tree ` +
			`(${carried} pre-existing, ${added.length} new). ` +
			`Base: \`${baseSha.slice(0, 9) || "none"}\` → Head: \`${headSha.slice(0, 9)}\`._`,
	);

	const md = lines.join("\n") + "\n";
	console.log(md);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
	}
	process.exit(fail ? 1 : 0);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
