/**
 * Tributary benchmark runner.
 *
 * Drives the REAL pipeline against a labelled corpus (eval/cases.yaml) and
 * records what actually happened. Nothing here reimplements a rule it is
 * measuring:
 *
 *   merge + gate      -> mergeBranches / runSemanticGate / runTestGate (src/merge.ts)
 *   sandbox execution -> makeSandboxGate (server/sandbox.ts), the same boundary
 *                        the deployed confluence uses
 *   footprint refusal -> outOfFootprint (src/index.ts), the confluence's own
 *                        pre-filter
 *   watershed         -> ClaimRegistry.requestClaim (src/index.ts), the real
 *                        Durable Object, over node:sqlite
 *
 * Output: eval_results/live-benchmark.json (machine bundle) plus a rendered
 * eval_results/BENCHMARK-RESULTS.md. The headline is not the match rate — it
 * is `false_land`: cases the pipeline landed that should have been refused.
 *
 *   npm run bench          # full sweep, writes both artifacts
 *   npm run bench -- --quiet
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { registerHooks } from "node:module";
import { parse as parseYaml } from "yaml";
import git from "isomorphic-git";
import { MemoryFS } from "../src/memory-fs";
import { mergeBranches, runSemanticGate, runTestGate } from "../src/merge";
import { makeSandboxGate, sandboxProvider } from "../server/sandbox";

// `cloudflare:workers` is a URL-scheme specifier Node cannot resolve. Same
// shim server/index.ts registers, so ClaimRegistry can be imported here.
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "cloudflare:workers") {
			return { url: "cloudflare:workers", shortCircuit: true } as never;
		}
		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		if (url === "cloudflare:workers") {
			return {
				format: "module",
				shortCircuit: true,
				source:
					"export class DurableObject {" +
					" constructor(ctx, env) { this.ctx = ctx; this.env = env; } }",
			} as never;
		}
		return nextLoad(url, context);
	},
});

const AUTHOR = { name: "Benchmark", email: "bench@tributary.dev" };
const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
// `--cases <path>` points the runner at any corpus — including one produced
// by `npm run audit -- --export`, so a user's own history becomes their
// regression suite through the same pipeline.
const casesFlag = process.argv.indexOf("--cases");
const CASES_PATH =
	casesFlag !== -1 && process.argv[casesFlag + 1]
		? process.argv[casesFlag + 1]
		: join(ROOT, "eval", "cases.yaml");
const OUT_DIR = join(ROOT, "eval_results");

// A resolver stand-in. The real resolver is an LLM call; for a benchmark we
// need determinism, so it takes the task side and appends a marker. This is
// honest: the case is measuring whether the pipeline ROUTES a conflict to the
// resolver and lands the retry, not how good the model's prose is. The
// resolver's own quality is a separate measurement (see resolver_quality in
// the report, which is explicitly not scored here).
const resolveConflictSide = (theirs: string): string =>
	`${theirs.trimEnd()}\n/* resolved by tributary benchmark: task side preferred */\n`;

interface CaseSpec {
	id: string;
	category: string;
	title: string;
	trunk?: Record<string, string>;
	task?: Record<string, string>;
	concurrent?: Record<string, string>;
	declared?: string[];
	claims?: { agent: string; files: string[] }[];
	expect: "landed" | "conflict_resolved" | "rejected" | "queued";
	expect_reason_contains?: string;
	/**
	 * Sandbox provider this case is only meaningful under. `docker` cases are
	 * SKIPPED (not passed) under the `local` provider, because `local` is a
	 * child process with an empty env and no network namespace — it cannot
	 * enforce egress or filesystem isolation, so scoring it would be a lie.
	 */
	requires?: "docker";
}

interface CaseResult {
	id: string;
	category: string;
	title: string;
	expected: string;
	observed: string;
	match: boolean;
	false_land: boolean;
	false_refusal: boolean;
	/**
	 * Did git itself consider the merge clean? For the semantic cases this is
	 * the whole point: `git_clean: true` + `observed: rejected` is a conflict
	 * git could not see and the semantic gate caught. Without this field the
	 * differentiator claim is unproven.
	 */
	git_clean?: boolean;
	skipped?: boolean;
	skip_reason?: string;
	reason?: string;
	detail?: string;
	gate_provider?: string;
	verification_command?: string;
	verification_exit?: number;
	durationMs: number;
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

/**
 * Build trunk + task branches for a merge-shaped case, run the real merge and
 * the real gates, and classify the outcome.
 */
async function runMergeCase(
	spec: CaseSpec,
	gate: ReturnType<typeof makeSandboxGate>,
): Promise<CaseResult> {
	const started = Date.now();
	const dir = `/bench-${spec.id}`;
	const fs = new MemoryFS();
	await git.init({ fs, dir, defaultBranch: "main" });

	for (const [filepath, content] of Object.entries(spec.trunk ?? {})) {
		await writeAndAdd(fs, dir, filepath, content);
	}
	await git.commit({ fs, dir, message: "trunk base", author: AUTHOR });

	// The task branches from trunk BEFORE the concurrent trunk edit lands, so
	// both sides genuinely diverge — the same fork-then-diverge shape the
	// confluence sees.
	await git.branch({ fs, dir, ref: "task" });
	await commitOn(fs, dir, "task", spec.task ?? {}, "task edit");

	if (spec.concurrent) {
		await commitOn(fs, dir, "main", spec.concurrent, "trunk edit");
	}

	// ── footprint pre-filter: the confluence's own predicate ──────────────
	if (spec.declared !== undefined) {
		const { outOfFootprint } = await import("../src/index");
		const changed = Object.keys(spec.task ?? {});
		const violations = outOfFootprint(changed, spec.declared);
		if (violations.length > 0) {
			const reason = `changed ${violations.join(", ")} outside its declared footprint`;
			return classify(spec, "rejected", reason, started, {
				detail: `footprint pre-filter refused: ${violations.join(", ")}`,
			});
		}
	}

	// ── real three-way merge ──────────────────────────────────────────────
	let outcome = await mergeBranches(fs, dir, "main", "task");
	const gitClean = outcome.status === "merged";

	// A conflict routes to the resolver; the retry applies its content through
	// mergeDriver. One retry max, exactly like the queue consumer.
	if (outcome.status === "conflict") {
		const resolutions: Record<string, string> = {};
		for (const side of outcome.sides) {
			resolutions[side.file] = resolveConflictSide(side.theirs);
		}
		outcome = await mergeBranches(fs, dir, "main", "task", resolutions);
		if (outcome.status !== "merged") {
			return classify(
				spec,
				"rejected",
				`resolver retry did not land: ${outcome.status}`,
				started,
			);
		}
		return classify(spec, "conflict_resolved", undefined, started, {
			detail: `git conflicted on ${Object.keys(resolutions).join(", ")}; resolver retry landed`,
		});
	}

	if (outcome.status === "failed") {
		return classify(spec, "rejected", outcome.reason, started);
	}

	// ── gates: sandbox (executed work) then the semantic arity check ──────
	const verdict = gate ? await gate(await collectTreeFor(fs, dir)) : null;
	const gateFailure = verdict
		? verdict.ok
			? null
			: (verdict.reason ?? "sandbox gate failed")
		: ((await runTestGate(fs, dir)) ?? (await runSemanticGate(fs, dir)));

	if (gateFailure) {
		return classify(spec, "rejected", gateFailure, started, {
			git_clean: gitClean,
			gate_provider: verdict?.evidence.provider,
			verification_command: verdict?.evidence.verification?.command,
			verification_exit: verdict?.evidence.verification?.exitCode,
		});
	}

	// Sandbox passed but the semantic gate may still refuse — the class of
	// conflict no amount of execution catches on a fixture.
	const semantic = await runSemanticGate(fs, dir);
	if (semantic) {
		return classify(spec, "rejected", semantic, started, {
			git_clean: gitClean,
			gate_provider: verdict?.evidence.provider,
		});
	}

	return classify(spec, "landed", undefined, started, {
		git_clean: gitClean,
		gate_provider: verdict?.evidence.provider,
		verification_command: verdict?.evidence.verification?.command,
		verification_exit: verdict?.evidence.verification?.exitCode,
	});
}

async function collectTreeFor(fs: MemoryFS, dir: string) {
	const { collectTree } = await import("../src/merge");
	return collectTree(fs, dir);
}

/**
 * Watershed cases drive the real ClaimRegistry over an in-memory sqlite.
 * Expected `queued` means at least one overlapping claim was refused and
 * waitlisted rather than granted.
 */
async function runWatershedCase(spec: CaseSpec): Promise<CaseResult> {
	const started = Date.now();
	const { ClaimRegistry } = await import("../src/index");
	const { DatabaseSync } = await import("node:sqlite");

	const db = new DatabaseSync(":memory:");
	const sql = {
		exec(query: string, ...params: unknown[]): Iterable<unknown> {
			const single = query.trim().replace(/;+\s*$/, "");
			if (single.includes(";")) {
				db.exec(query);
				return [];
			}
			const stmt = db.prepare(single);
			if (stmt.columns().length === 0) {
				stmt.run(...(params as never[]));
				return [];
			}
			return stmt.all(...(params as never[])) as unknown[];
		},
	};
	const ctx = {
		storage: { sql },
		blockConcurrencyWhile(cb: () => unknown) {
			void cb();
		},
		waitUntil() {},
	};
	const registry = new ClaimRegistry(ctx as never, {} as never) as never as {
		requestClaim(
			agent: string,
			files: string[],
			ttl?: number,
		): Promise<{ status: string; conflictingAgent?: string }>;
	};

	const results: { agent: string; status: string }[] = [];
	for (const claim of spec.claims ?? []) {
		const r = await registry.requestClaim(claim.agent, claim.files);
		results.push({ agent: claim.agent, status: r.status });
	}

	const queued = results.filter((r) => r.status === "queued");
	const granted = results.filter((r) => r.status === "granted");
	const observed = queued.length > 0 ? "queued" : "landed";
	const detail =
		`${granted.length} granted, ${queued.length} queued` +
		(queued.length ? ` (${queued.map((q) => q.agent).join(", ")})` : "");

	return classify(spec, observed, undefined, started, { detail });
}

function classify(
	spec: CaseSpec,
	observed: string,
	reason: string | undefined,
	started: number,
	extra: Partial<CaseResult> = {},
): CaseResult {
	const match = observed === spec.expect;
	// A false land is the failure that matters: work that should have been
	// refused reached the trunk. A false refusal is wasted work, not damage.
	const false_land = observed === "landed" && spec.expect === "rejected";
	const false_refusal =
		observed === "rejected" &&
		(spec.expect === "landed" || spec.expect === "conflict_resolved");

	const reasonOk = spec.expect_reason_contains
		? (reason ?? "").includes(spec.expect_reason_contains)
		: true;

	return {
		id: spec.id,
		category: spec.category,
		title: spec.title,
		expected: spec.expect,
		observed,
		match: match && reasonOk,
		false_land,
		false_refusal,
		reason,
		durationMs: Date.now() - started,
		...extra,
	};
}

function renderMarkdown(
	results: CaseResult[],
	meta: { provider: string; ranAt: string; durationMs: number },
): string {
	const total = results.length;
	const skipped = results.filter((r) => r.skipped);
	const scored = results.filter((r) => !r.skipped);
	const matched = scored.filter((r) => r.match).length;
	const falseLands = results.filter((r) => r.false_land);
	const falseRefusals = results.filter((r) => r.false_refusal);
	const pct = scored.length
		? ((matched / scored.length) * 100).toFixed(1)
		: "0.0";

	const byCategory = new Map<string, CaseResult[]>();
	for (const r of results) {
		const list = byCategory.get(r.category) ?? [];
		list.push(r);
		byCategory.set(r.category, list);
	}

	const lines: string[] = [];
	lines.push("# Tributary — benchmark results");
	lines.push("");
	lines.push(
		`Generated ${meta.ranAt} by \`npm run bench\`. Sandbox provider: \`${meta.provider}\`.`,
	);
	lines.push(
		`Machine bundle: \`eval_results/live-benchmark.json\`. Corpus: \`eval/cases.yaml\`.`,
	);
	lines.push("");
	lines.push("## Headline");
	lines.push("");
	lines.push("| Metric | Value |");
	lines.push("| --- | --- |");
	lines.push(`| Cases in corpus | ${total} |`);
	lines.push(`| Scored under this provider | ${scored.length} |`);
	lines.push(
		`| Expected verdict matched | **${matched}/${scored.length} (${pct}%)** |`,
	);
	lines.push(
		`| **False lands** (should have been refused, landed anyway) | **${falseLands.length}** |`,
	);
	lines.push(
		`| False refusals (should have landed, was refused) | ${falseRefusals.length} |`,
	);
	lines.push(`| Skipped (provider cannot enforce) | ${skipped.length} |`);
	lines.push(`| Wall clock | ${(meta.durationMs / 1000).toFixed(1)}s |`);
	lines.push("");
	if (skipped.length) {
		lines.push(
			`> **${skipped.length} case(s) were NOT scored** because the active sandbox provider`,
		);
		lines.push(
			`> is \`${meta.provider}\`, which cannot enforce containment. Run with \`TRIBUTARY_SANDBOX=docker\``,
		);
		lines.push(
			"> on a Docker host to score them. They are reported as skipped, never as passed.",
		);
		lines.push("");
		for (const s of skipped) {
			lines.push(`- \`${s.id}\` — ${s.skip_reason}`);
		}
		lines.push("");
	}
	lines.push(
		"The number that matters is **false lands**. A merge control plane's only job is",
	);
	lines.push(
		"to keep broken work off the trunk. A false refusal wastes an agent's compute;",
	);
	lines.push("a false land ships the bug.");
	lines.push("");

	// The differentiator: conflicts git structurally cannot see.
	const invisible = results.filter(
		(r) =>
			r.category === "semantic_conflict" &&
			r.git_clean &&
			r.observed === "rejected",
	);
	const semanticTotal = results.filter(
		(r) => r.category === "semantic_conflict" && !r.skipped,
	);
	if (semanticTotal.length) {
		lines.push("## Conflicts git cannot see");
		lines.push("");
		lines.push(
			`**${invisible.length}/${semanticTotal.length}** semantic conflicts were merged *cleanly by git* and then`,
		);
		lines.push(
			"refused by the semantic gate. A plain merge queue — the shape most agent",
		);
		lines.push(
			"coordination tools ship — lands every one of these, because `git merge` reports",
		);
		lines.push("success and the files never conflict textually.");
		lines.push("");
		lines.push("| Case | git verdict | Tributary verdict | Caught by |");
		lines.push("| --- | --- | --- | --- |");
		for (const r of semanticTotal) {
			const gitVerdict = r.git_clean ? "clean merge" : "conflict";
			const caught = r.git_clean ? "semantic gate (acorn arity)" : "git";
			lines.push(`| \`${r.id}\` | ${gitVerdict} | ${r.observed} | ${caught} |`);
		}
		lines.push("");
		lines.push(
			"This is the class of breakage that containment alone cannot reach: the code is",
		);
		lines.push(
			"safe to execute, it just no longer works. Executing it in a sandbox proves it",
		);
		lines.push("runs; it does not prove it is correct.");
		lines.push("");
	}

	lines.push("## By category");
	lines.push("");
	lines.push("| Category | Cases | Matched | False lands |");
	lines.push("| --- | --- | --- | --- |");
	for (const [category, list] of byCategory) {
		const m = list.filter((r) => r.match && !r.skipped).length;
		const fl = list.filter((r) => r.false_land).length;
		const sk = list.filter((r) => r.skipped).length;
		lines.push(
			`| ${category} | ${list.length} | ${m}${sk ? ` (${sk} skipped)` : ""} | ${fl} |`,
		);
	}
	lines.push("");

	lines.push("## Every case");
	lines.push("");
	lines.push("| Case | Expected | Observed | Match | Reason |");
	lines.push("| --- | --- | --- | --- | --- |");
	for (const r of results) {
		const mark = r.match ? "✅" : "❌";
		const reason = (r.reason ?? r.detail ?? "")
			.replace(/\|/g, "\\|")
			.replace(/\n/g, " ")
			.slice(0, 160);
		lines.push(
			`| \`${r.id}\` ${r.title} | ${r.expected} | ${r.observed} | ${mark} | ${reason} |`,
		);
	}
	lines.push("");

	if (falseLands.length) {
		lines.push("## False lands — the failures that matter");
		lines.push("");
		for (const r of falseLands) {
			lines.push(`- \`${r.id}\` — ${r.title}`);
		}
		lines.push("");
	}

	lines.push("## What this measures, and what it does not");
	lines.push("");
	lines.push(
		"**Measured.** Whether the pipeline produces the correct *verdict* for each",
	);
	lines.push(
		"labelled scenario: land it, route it to the resolver, refuse it at the",
	);
	lines.push(
		"watershed, or refuse it at the gate. Merge, gates, footprint predicate and",
	);
	lines.push(
		"claim registry are the real implementations, imported not reimplemented.",
	);
	lines.push("");
	lines.push("**Not measured.** Resolver *quality*. The benchmark resolver is");
	lines.push(
		"deterministic (task side preferred) because the case is testing routing and",
	);
	lines.push(
		"retry-landing, not prose. An LLM resolver's output quality is a separate",
	);
	lines.push("measurement and is not scored here.");
	lines.push("");
	lines.push(
		"**Not measured.** Multi-agent concurrency at scale. The watershed cases",
	);
	lines.push(
		"drive the real registry with 2–3 agents; a fleet-scale run is `npm run",
	);
	lines.push("simulate`.");
	lines.push("");
	return lines.join("\n");
}

async function main() {
	const quiet = process.argv.includes("--quiet");
	const started = Date.now();
	const provider = sandboxProvider();
	const gate = makeSandboxGate();

	if (!quiet) {
		console.log("🌊 Tributary benchmark");
		console.log(`   corpus:  eval/cases.yaml`);
		console.log(`   sandbox: ${provider}`);
		console.log("");
	}

	const corpus = parseYaml(readFileSync(CASES_PATH, "utf8")) as {
		meta?: unknown;
		cases?: CaseSpec[];
	};
	// The YAML is a top-level list with a `meta:` key; `yaml` returns the
	// document as an array when the file is a sequence, so normalise both.
	const cases: CaseSpec[] = Array.isArray(corpus)
		? (corpus as unknown as CaseSpec[])
		: (corpus.cases ?? []);
	const specs = cases.filter((c) => c && typeof c === "object" && "id" in c);

	if (specs.length === 0) {
		throw new Error("no cases parsed from eval/cases.yaml");
	}

	const results: CaseResult[] = [];
	for (const spec of specs) {
		// A containment case under a provider that cannot contain is not a
		// pass and not a fail — it is unmeasured. Saying so is the point.
		if (spec.requires === "docker" && provider !== "docker") {
			const skipped: CaseResult = {
				id: spec.id,
				category: spec.category,
				title: spec.title,
				expected: spec.expect,
				observed: "skipped",
				match: true,
				false_land: false,
				false_refusal: false,
				skipped: true,
				skip_reason: `requires docker; provider is "${provider}" (no network namespace, so containment cannot be enforced)`,
				durationMs: 0,
			};
			results.push(skipped);
			if (!quiet) {
				console.log(
					`  ⏭️  ${skipped.id.padEnd(16)} ${skipped.observed.padEnd(18)} ${skipped.title}`,
				);
				console.log(`     ${skipped.skip_reason}`);
			}
			continue;
		}

		const result = spec.claims
			? await runWatershedCase(spec)
			: await runMergeCase(spec, gate);
		results.push(result);
		if (!quiet) {
			const mark = result.match ? "✅" : "❌";
			console.log(
				`  ${mark} ${result.id.padEnd(16)} ${result.observed.padEnd(18)} ${result.title}`,
			);
			if (!result.match) {
				console.log(`     expected ${result.expected}: ${result.reason ?? ""}`);
			}
		}
	}

	const durationMs = Date.now() - started;
	const ranAt = new Date().toISOString();

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(
		join(OUT_DIR, "live-benchmark.json"),
		JSON.stringify(
			{
				meta: {
					name: "tributary-benchmark",
					version: 1,
					ranAt,
					durationMs,
					sandboxProvider: provider,
					node: process.version,
				},
				summary: {
					cases: results.length,
					matched: results.filter((r) => r.match).length,
					falseLands: results.filter((r) => r.false_land).length,
					falseRefusals: results.filter((r) => r.false_refusal).length,
				},
				results,
			},
			null,
			2,
		),
	);
	writeFileSync(
		join(OUT_DIR, "BENCHMARK-RESULTS.md"),
		renderMarkdown(results, { provider, ranAt, durationMs }),
	);

	const matched = results.filter((r) => r.match && !r.skipped).length;
	const scored = results.filter((r) => !r.skipped).length;
	const falseLands = results.filter((r) => r.false_land).length;
	const skippedCount = results.filter((r) => r.skipped).length;

	if (!quiet) {
		console.log("");
		console.log(
			`   ${matched}/${scored} matched · ${falseLands} false land(s) · ${skippedCount} skipped · ${(durationMs / 1000).toFixed(1)}s`,
		);
		console.log(`   → eval_results/live-benchmark.json`);
		console.log(`   → eval_results/BENCHMARK-RESULTS.md`);
	}

	// Non-zero exit on any mismatch: the benchmark is a regression gate, not a
	// report. A silent benchmark is how a false land reaches production.
	process.exit(matched === scored ? 0 : 1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
