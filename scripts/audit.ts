#!/usr/bin/env tsx
/**
 * tributary audit — replay a real repo's own history through the real gates.
 *
 * The benchmark (eval/cases.yaml) proves the pipeline on synthetic cases. This
 * answers the question a user actually asks: "would it have caught the merge
 * that broke my build last week?" It walks a repo's first-parent history,
 * replays every merge through `git merge-tree` (the same three-way result a
 * real merge produces), materializes each tree, and runs the actual semantic
 * gate + test gate on it — the same functions the confluence runs, not a copy.
 *
 * Two scans:
 *
 *   merges   `git rev-list --merges --first-parent`: replay P1×P2, then diff
 *            the merged tree's findings against P1's. A merge that git calls
 *            clean but that introduces new gate findings is the
 *            differentiator — a conflict git cannot see.
 *   commits  `git rev-list --no-merges --first-parent`: findings(C) minus
 *            findings(parent) = what the commit introduced. Squash-merge and
 *            rebase repos have no merge commits at all, so this scan is where
 *            their history lives.
 *
 * Honesty rules (same as the benchmark):
 *
 *   - A "caught" means the gate WOULD have refused the merge/commit as it
 *     stood. It is not proof the build broke — that needs the repo's own
 *     tests, which is what the sandbox gate is for. Catches are candidates,
 *     each inspectable.
 *   - Parse findings are reported in a separate `gate-limit` bucket, never as
 *     catches: a file acorn can't read (JSX in .js, Flow, decorators) is the
 *     gate's limitation, not evidence of broken code.
 *   - A merge whose tree carries only pre-existing findings is `blocked`,
 *     not `caught` — the gate would refuse it, but for old sins, not this
 *     merge. That's a real signal (the gate demands a clean baseline) and it
 *     is reported as such.
 *
 * Usage:
 *   npm run audit -- <repo-path-or-url> [options]
 *
 * Options:
 *   --merges <n>    merge commits to replay        (default: 25)
 *   --commits <n>   linear commits to scan         (default: 50)
 *   --export <file> write caught items as cases.yaml-format entries
 *   --json <file>   write the machine-readable report
 *   --full          full clone for remote URLs     (default: --depth 500)
 *   --help
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { stringify as yamlStringify } from "yaml";
import { MemoryFS } from "../src/memory-fs";
import {
	gateScannablePath,
	semanticGateFindings,
	runTestGate,
	type GateFinding,
} from "../src/merge";
import { git, gitStatus, materialize, SCAN_PATHSPEC } from "./git-tree";

// ── args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
	const i = args.indexOf(`--${name}`);
	return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name: string) => args.includes(`--${name}`);
const positional = args.filter(
	(a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")),
);

const REPO = positional[0];
const MERGE_LIMIT = parseInt(flag("merges", "25"), 10);
const COMMIT_LIMIT = parseInt(flag("commits", "50"), 10);
const EXPORT_PATH = flag("export", "");
const JSON_PATH = flag("json", "");

if (has("help") || !REPO) {
	console.log(`tributary audit — replay a real repo's history through the gates

Usage: npm run audit -- <repo-path-or-url> [options]

  --merges <n>    merge commits to replay        (default: 25)
  --commits <n>   linear commits to scan         (default: 50)
  --export <file> write caught items as cases.yaml entries
  --json <file>   write the machine-readable report
  --full          full clone for remote URLs     (default: --depth 500)`);
	process.exit(REPO ? 0 : 1);
}

// ── findings ────────────────────────────────────────────────────────────────

/** Audit finding = gate finding plus the test gate's single reason. */
type Finding = Omit<GateFinding, "kind"> & {
	kind: "parse" | "arity" | "test";
};

async function findingsFor(fs: MemoryFS): Promise<Finding[]> {
	const out: Finding[] = await semanticGateFindings(fs, "/tree");
	const test = await runTestGate(fs, "/tree");
	if (test) out.unshift({ kind: "test", file: "package.json", detail: test });
	return out;
}

const keyOf = (f: Finding) => `${f.kind}|${f.detail}`;

function newFindings(
	current: Finding[],
	baseline: Finding[],
): {
	added: Finding[];
	carried: Finding[];
	carriedReal: number;
	carriedParse: number;
} {
	const base = new Set(baseline.map(keyOf));
	const added = current.filter((f) => !base.has(keyOf(f)));
	const carried = current.filter((f) => base.has(keyOf(f)));
	return {
		added,
		carried,
		carriedReal: carried.filter((f) => f.kind !== "parse").length,
		carriedParse: carried.filter((f) => f.kind === "parse").length,
	};
}

// ── item classification ─────────────────────────────────────────────────────

type Verdict =
	| "land" // merged/clean tree, zero findings — gate green
	| "caught" // NEW arity/test findings — the differentiator
	| "gate-limit" // only NEW parse findings — acorn can't read the file
	| "blocked" // no new findings, but tree carries REAL pre-existing ones
	| "carried-limit" // tree carries only pre-existing PARSE findings
	| "resolver" // git conflicted — routed to the resolver path
	| "clean" // commit: nothing new, nothing carried
	| "carries"; // commit: nothing new, REAL pre-existing findings remain

interface AuditItem {
	sha: string;
	kind: "merge" | "commit";
	subject: string;
	gitVerdict: "clean" | "conflict" | "n/a";
	verdict: Verdict;
	added: Finding[];
	carriedCount: number;
	carriedReal: number;
	carriedParse: number;
	/** Shas needed to reconstruct the case for --export. */
	base?: string;
	p1?: string;
	p2?: string;
	parent?: string;
}

function classify(
	gitVerdict: "clean" | "conflict" | "n/a",
	added: Finding[],
	carriedReal: number,
	carriedParse: number,
	isCommit: boolean,
): Verdict {
	if (gitVerdict === "conflict") return "resolver";
	if (added.some((f) => f.kind !== "parse")) return "caught";
	if (added.some((f) => f.kind === "parse")) return "gate-limit";
	if (carriedReal) return isCommit ? "carries" : "blocked";
	if (carriedParse) return "carried-limit";
	return isCommit ? "clean" : "land";
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
	const isUrl = /^(https?|git|ssh):|^git@/.test(REPO);
	const tmp = mkdtempSync(join(tmpdir(), "tributary-audit-"));
	try {
		const cloneArgs = ["clone", "--quiet", "--bare"];
		if (isUrl && !has("full")) cloneArgs.push("--depth", "500");
		cloneArgs.push(REPO, tmp);
		console.error(`cloning ${REPO} …`);
		const c = spawnSync("git", cloneArgs, { maxBuffer: GIT_MAX });
		if (c.status !== 0) {
			throw new Error(`git clone: ${c.stderr.toString("utf8").trim()}`);
		}

		const repoName =
			basename(REPO.replace(/\.git$/, "").replace(/\/$/, "")) || "repo";
		const items: AuditItem[] = [];
		const started = Date.now();

		// ── merges ────────────────────────────────────────────────────────
		const mergeShas = git(
			tmp,
			"rev-list",
			"--merges",
			"--first-parent",
			`-n${MERGE_LIMIT}`,
			"HEAD",
			...SCAN_PATHSPEC,
		)
			.split("\n")
			.filter(Boolean);

		let octopusSkipped = 0;
		for (const sha of mergeShas) {
			const meta = git(tmp, "show", "-s", "--format=%P%x00%s", sha).trim();
			const [parentsRaw, subject] = meta.split("\0");
			const parents = parentsRaw.split(" ").filter(Boolean);
			if (parents.length !== 2) {
				octopusSkipped++;
				continue;
			}
			const [p1, p2] = parents;
			const mt = gitStatus(tmp, "merge-tree", "--write-tree", p1, p2);

			if (mt.status !== 0) {
				items.push({
					sha,
					kind: "merge",
					subject,
					gitVerdict: "conflict",
					verdict: "resolver",
					added: [],
					carriedCount: 0,
					p1,
					p2,
				});
				continue;
			}

			const mergedTree = mt.stdout.split("\n")[0].trim();
			const [mergedFs, p1Fs] = [
				await materialize(tmp, mergedTree),
				await materialize(tmp, p1),
			];
			const merged = await findingsFor(mergedFs);
			const before = await findingsFor(p1Fs);
			const { added, carried, carriedReal, carriedParse } = newFindings(
				merged,
				before,
			);

			let base: string | undefined;
			try {
				base = git(tmp, "merge-base", p1, p2).split("\n")[0].trim();
			} catch {
				/* shallow history: export for this item is skipped */
			}

			items.push({
				sha,
				kind: "merge",
				subject,
				gitVerdict: "clean",
				verdict: classify("clean", added, carriedReal, carriedParse, false),
				added,
				carriedCount: carried.length,
				carriedReal,
				carriedParse,
				base,
				p1,
				p2,
			});
		}

		// ── linear commits ────────────────────────────────────────────────
		const commitShas = git(
			tmp,
			"rev-list",
			"--no-merges",
			"--first-parent",
			`-n${COMMIT_LIMIT}`,
			"HEAD",
			...SCAN_PATHSPEC,
		)
			.split("\n")
			.filter(Boolean);

		for (const sha of commitShas) {
			const meta = git(tmp, "show", "-s", "--format=%P%x00%s", sha).trim();
			const [parentsRaw, subject] = meta.split("\0");
			const parent = parentsRaw.split(" ").filter(Boolean)[0];
			if (!parent) continue; // root commit: no delta to compute

			const [curFs, prevFs] = [
				await materialize(tmp, sha),
				await materialize(tmp, parent),
			];
			const cur = await findingsFor(curFs);
			const prev = await findingsFor(prevFs);
			const { added, carried, carriedReal, carriedParse } = newFindings(
				cur,
				prev,
			);

			items.push({
				sha,
				kind: "commit",
				subject,
				gitVerdict: "n/a",
				verdict: classify("n/a", added, carriedReal, carriedParse, true),
				added,
				carriedCount: carried.length,
				carriedReal,
				carriedParse,
				parent,
			});
		}

		// ── report ────────────────────────────────────────────────────────
		const merges = items.filter((i) => i.kind === "merge");
		const commits = items.filter((i) => i.kind === "commit");
		const by = (list: AuditItem[], v: Verdict) =>
			list.filter((i) => i.verdict === v);
		const caughtAll = by(items, "caught");

		console.log("");
		console.log(`🌊 tributary audit — ${repoName}`);
		console.log(
			`   ${merges.length} merge(s) replayed · ${commits.length} commit(s) scanned · ${((Date.now() - started) / 1000).toFixed(1)}s`,
		);
		console.log("");

		if (merges.length) {
			console.log("   merges (replayed via git merge-tree)");
			console.log(
				`     caught      ${by(merges, "caught").length}   git merged clean; gate refuses on NEW findings`,
			);
			console.log(
				`     resolver    ${by(merges, "resolver").length}   git conflicted — resolver path`,
			);
			console.log(
				`     landed      ${by(merges, "land").length}   merged tree clean, no findings`,
			);
			console.log(
				`     blocked     ${by(merges, "blocked").length}   merged clean but tree carries pre-existing REAL findings`,
			);
			console.log(
				`     gate-limit  ${by(merges, "gate-limit").length}   only NEW parse findings (acorn cannot read the file)`,
			);
			console.log(
				`     carried-lim ${by(merges, "carried-limit").length}   carries only pre-existing parse findings`,
			);
			if (octopusSkipped)
				console.log(`     skipped     ${octopusSkipped}   octopus merges`);
			console.log("");
		}

		if (commits.length) {
			console.log("   commits (findings delta vs parent)");
			console.log(
				`     caught      ${by(commits, "caught").length}   commit introduces new arity/test findings`,
			);
			console.log(
				`     gate-limit  ${by(commits, "gate-limit").length}   only NEW parse findings`,
			);
			console.log(
				`     carries     ${by(commits, "carries").length}   pre-existing REAL findings, nothing new`,
			);
			console.log(
				`     carried-lim ${by(commits, "carried-limit").length}   carries only pre-existing parse findings`,
			);
			console.log(
				`     clean       ${by(commits, "clean").length}   no findings`,
			);
			console.log("");
		}

		if (caughtAll.length) {
			console.log("   caught — inspect each before believing it:");
			for (const i of caughtAll.slice(0, 20)) {
				console.log(
					`     ${i.sha.slice(0, 9)} ${i.verdict.padEnd(8)} ${i.subject.slice(0, 60)}`,
				);
				for (const f of i.added.slice(0, 3)) {
					console.log(`       ${f.detail}`);
				}
				if (i.added.length > 3)
					console.log(`       … ${i.added.length - 3} more finding(s)`);
			}
			if (caughtAll.length > 20)
				console.log(`     … ${caughtAll.length - 20} more`);
			console.log("");
		}

		console.log(
			"   A 'caught' means the gate would have refused that merge/commit —",
		);
		console.log(
			"   it is a candidate, not proof the build broke. Proving that needs",
		);
		console.log(
			"   the repo's own tests, which is what the sandbox gate is for.",
		);
		console.log("");

		// ── export ────────────────────────────────────────────────────────
		if (EXPORT_PATH) {
			const cases = await exportCases(tmp, repoName, caughtAll);
			writeFileSync(
				EXPORT_PATH,
				`# Exported by tributary audit from ${repoName} — real history, real findings.\n` +
					`# Merge under \`cases:\` in your own eval/cases.yaml.\n` +
					yamlStringify({ cases }, { lineWidth: 0 }),
			);
			console.log(`   → ${cases.length} case(s) exported to ${EXPORT_PATH}`);
		}
		if (JSON_PATH) {
			writeFileSync(
				JSON_PATH,
				JSON.stringify(
					{
						repo: repoName,
						ranAt: new Date().toISOString(),
						durationMs: Date.now() - started,
						summary: {
							merges: merges.length,
							commits: commits.length,
							caught: caughtAll.length,
							resolver: by(items, "resolver").length,
							blocked: by(items, "blocked").length,
							gateLimit: by(items, "gate-limit").length,
						},
						items,
					},
					null,
					2,
				),
			);
			console.log(`   → report written to ${JSON_PATH}`);
		}
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}

/**
 * Reconstruct each caught item as a cases.yaml entry. For a merge: trunk =
 * the merge base's content of files either side touched, task = P2's changed
 * files, concurrent = P1's. For a commit: trunk = parent content of changed +
 * caller files, task = the commit's changed files. Files the case format
 * cannot express (deletions) cause the whole case to be skipped — a case that
 * cannot replay faithfully is worse than no case.
 */
async function exportCases(
	repo: string,
	repoName: string,
	caught: AuditItem[],
): Promise<unknown[]> {
	const cases: unknown[] = [];

	// Full scannable+package.json trees for the shas we need, as path→text maps.
	const treeCache = new Map<string, Record<string, string>>();
	const treeOf = async (sha: string) => {
		let t = treeCache.get(sha);
		if (!t) {
			const fs = await materialize(repo, sha);
			t = {};
			const walk = async (d: string): Promise<void> => {
				for (const name of await fs.promises.readdir(d)) {
					const full = `${d}/${name}`;
					const stat = await fs.promises.stat(full);
					if (stat.isDirectory()) await walk(full);
					else
						t[full.slice("/tree/".length)] = (await fs.promises.readFile(
							full,
							"utf8",
						)) as string;
				}
			};
			await walk("/tree");
			treeCache.set(sha, t);
		}
		return t;
	};

	const changed = (from: string, to: string): string[] =>
		git(repo, "diff", "--name-only", "--diff-filter=AM", from, to)
			.split("\n")
			.filter(Boolean)
			.filter((p) => gateScannablePath(p) || basename(p) === "package.json");

	const deleted = (from: string, to: string): number =>
		git(repo, "diff", "--name-only", "--diff-filter=D", from, to)
			.split("\n")
			.filter(Boolean).length;

	const pick = (
		tree: Record<string, string>,
		paths: string[],
	): Record<string, string> | null => {
		const out: Record<string, string> = {};
		for (const p of paths) {
			if (!(p in tree)) return null; // missing where expected — cannot replay
			out[p] = tree[p];
		}
		return out;
	};

	const callerFiles = (item: AuditItem) => [
		...new Set(item.added.map((f) => f.file)),
	];

	for (const item of caught) {
		try {
			if (item.kind === "merge" && item.base && item.p1 && item.p2) {
				if (deleted(item.base, item.p1) || deleted(item.base, item.p2))
					continue;
				const taskFiles = changed(item.base, item.p2);
				const concFiles = changed(item.base, item.p1);
				const trunkPaths = [
					...new Set([...taskFiles, ...concFiles, ...callerFiles(item)]),
				];
				const [baseT, p1T, p2T] = await Promise.all([
					treeOf(item.base),
					treeOf(item.p1),
					treeOf(item.p2),
				]);
				const trunk = pickSubset(baseT, trunkPaths);
				const task = pick(p2T, taskFiles);
				const concurrent = pick(p1T, concFiles);
				if (!task || !concurrent) continue;
				cases.push({
					id: `audit-${repoName}-${item.sha.slice(0, 9)}`,
					category: "semantic_conflict",
					title: `[real history] ${item.subject}`.slice(0, 120),
					trunk,
					task,
					...(Object.keys(concurrent).length ? { concurrent } : {}),
					expect: "rejected",
					expect_reason_contains:
						item.added.find((f) => f.kind === "arity")?.name ?? "semantic gate",
				});
			} else if (item.kind === "commit" && item.parent) {
				if (deleted(item.parent, item.sha)) continue;
				const taskFiles = changed(item.parent, item.sha);
				const trunkPaths = [...new Set([...taskFiles, ...callerFiles(item)])];
				const [parT, curT] = await Promise.all([
					treeOf(item.parent),
					treeOf(item.sha),
				]);
				const trunk = pickSubset(parT, trunkPaths);
				const task = pick(curT, taskFiles);
				if (!task) continue;
				cases.push({
					id: `audit-${repoName}-${item.sha.slice(0, 9)}`,
					category: "semantic_conflict",
					title: `[real history] ${item.subject}`.slice(0, 120),
					trunk,
					task,
					expect: "rejected",
					expect_reason_contains:
						item.added.find((f) => f.kind === "arity")?.name ?? "semantic gate",
				});
			}
		} catch {
			/* unexportable item — report count covers it */
		}
	}
	return cases;
}

/** trunk tolerates absent files (a side may add them); task/concurrent can't. */
function pickSubset(
	tree: Record<string, string>,
	paths: string[],
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const p of paths) if (p in tree) out[p] = tree[p];
	return out;
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
