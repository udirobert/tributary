# Tributary — benchmark results

Generated 2026-11-10T13:11:40.594Z by `npm run bench`. Sandbox provider: `local`.
Machine bundle: `eval_results/live-benchmark.json`. Corpus: `eval/cases.yaml`.

## Headline

| Metric | Value |
| --- | --- |
| Cases in corpus | 28 |
| Scored under this provider | 26 |
| Expected verdict matched | **26/26 (100.0%)** |
| **False lands** (should have been refused, landed anyway) | **0** |
| False refusals (should have landed, was refused) | 0 |
| Skipped (provider cannot enforce) | 2 |
| Wall clock | 1.4s |

> **2 case(s) were NOT scored** because the active sandbox provider
> is `local`, which cannot enforce containment. Run with `TRIBUTARY_SANDBOX=docker`
> on a Docker host to score them. They are reported as skipped, never as passed.

- `hostile-01` — requires docker; provider is "local" (no network namespace, so containment cannot be enforced)
- `hostile-02` — requires docker; provider is "local" (no network namespace, so containment cannot be enforced)

The number that matters is **false lands**. A merge control plane's only job is
to keep broken work off the trunk. A false refusal wastes an agent's compute;
a false land ships the bug.

## Conflicts git cannot see

**7/7** semantic conflicts were merged *cleanly by git* and then
refused by the semantic gate. A plain merge queue — the shape most agent
coordination tools ship — lands every one of these, because `git merge` reports
success and the files never conflict textually.

| Case | git verdict | Tributary verdict | Caught by |
| --- | --- | --- | --- |
| `semantic-01` | clean merge | rejected | semantic gate (acorn arity) |
| `semantic-02` | clean merge | rejected | semantic gate (acorn arity) |
| `semantic-03` | clean merge | rejected | semantic gate (acorn arity) |
| `semantic-04` | clean merge | rejected | semantic gate (acorn arity) |
| `semantic-05` | clean merge | rejected | semantic gate (acorn arity) |
| `semantic-06` | clean merge | rejected | semantic gate (acorn arity) |
| `semantic-07` | clean merge | rejected | semantic gate (acorn arity) |

This is the class of breakage that containment alone cannot reach: the code is
safe to execute, it just no longer works. Executing it in a sandbox proves it
runs; it does not prove it is correct.

## By category

| Category | Cases | Matched | False lands |
| --- | --- | --- | --- |
| clean_merge | 5 | 5 | 0 |
| same_line_conflict | 4 | 4 | 0 |
| semantic_conflict | 7 | 7 | 0 |
| footprint_violation | 3 | 3 | 0 |
| verification_failure | 4 | 4 | 0 |
| footprint_storm | 3 | 3 | 0 |
| hostile_probe | 2 | 0 (2 skipped) | 0 |

## Every case

| Case | Expected | Observed | Match | Reason |
| --- | --- | --- | --- | --- |
| `clean-01` Disjoint file edits merge cleanly | landed | landed | ✅ |  |
| `clean-02` New file added, nothing touched | landed | landed | ✅ |  |
| `clean-03` Two new files in different directories | landed | landed | ✅ |  |
| `clean-04` Task edits a file trunk did not touch | landed | landed | ✅ |  |
| `clean-05` Adjacent but non-overlapping lines in one file | landed | landed | ✅ |  |
| `conflict-01` Both sides rewrite the same line | conflict_resolved | conflict_resolved | ✅ | git conflicted on a.txt; resolver retry landed |
| `conflict-02` Both sides rewrite the same line in a source file | conflict_resolved | conflict_resolved | ✅ | git conflicted on src/index.js; resolver retry landed |
| `conflict-03` Conflict in one file, clean edit in another | conflict_resolved | conflict_resolved | ✅ | git conflicted on a.txt; resolver retry landed |
| `conflict-04` Both sides delete and rewrite the same block | conflict_resolved | conflict_resolved | ✅ | git conflicted on config.json; resolver retry landed |
| `semantic-01` Callee gains a parameter, caller unchanged | rejected | rejected | ✅ | semantic gate: greet() called with 1 arg(s) in handlers.js but defined with 2 param(s) — a conflict git cannot see |
| `semantic-02` Callee loses a parameter, caller still passes two | rejected | rejected | ✅ | semantic gate: format() called with 2 arg(s) in report.js but defined with 1 param(s) — a conflict git cannot see |
| `semantic-03` Function declaration gains a parameter, caller in a third file | rejected | rejected | ✅ | semantic gate: clamp() called with 1 arg(s) in a.js but defined with 3 param(s) — a conflict git cannot see |
| `semantic-04` Signature change in a file the task never declared | rejected | rejected | ✅ | semantic gate: fetchUser() called with 1 arg(s) in page.js but defined with 2 param(s) — a conflict git cannot see |
| `semantic-05` TypeScript signature change breaks a .ts caller | rejected | rejected | ✅ | semantic gate: greet() called with 1 arg(s) in handlers.ts but defined with 2 param(s) — a conflict git cannot see |
| `semantic-06` TSX component gains a prop, caller unchanged | rejected | rejected | ✅ | semantic gate: Button() called with 1 arg(s) in App.tsx but defined with 2 param(s) — a conflict git cannot see |
| `semantic-07` TypeScript callee changes, JavaScript caller breaks | rejected | rejected | ✅ | semantic gate: fetchUser() called with 1 arg(s) in legacy.js but defined with 2 param(s) — a conflict git cannot see |
| `footprint-01` Task writes a file it never declared | rejected | rejected | ✅ | changed src/db.js outside its declared footprint |
| `footprint-02` Task edits README outside a code-only footprint | rejected | rejected | ✅ | changed README.md outside its declared footprint |
| `footprint-03` Task declares nothing and writes anyway | rejected | rejected | ✅ | changed src/index.js outside its declared footprint |
| `verify-01` Merged tree fails its own verify script | rejected | rejected | ✅ | sandbox gate (local): sandbox gate: checked 3 file(s), ran node verify.cjs — node verify.cjs exited 1: db.connect() did not return a query client |
| `verify-02` Merged tree does not parse | rejected | rejected | ✅ | sandbox gate (local): sandbox gate: checked 3 file(s) /private/var/folders/70/0d2zqmt917ng4z2hc30v8hvc0000gn/T/tributary-gate-MFrtLp/src/index.js: Unexpected to |
| `verify-03` Merged package.json is invalid JSON | rejected | rejected | ✅ | sandbox gate (local): sandbox gate: checked 2 file(s) package.json invalid: Expected property name or '}' in JSON at position 2 (line 1 column 3) |
| `verify-04` Merged tree throws at verification time | rejected | rejected | ✅ | sandbox gate (local): sandbox gate: checked 3 file(s), ran node verify.cjs — node verify.cjs exited 1: ./src/index.js:1 exports.run = () => { throw new Error('b |
| `watershed-01` Two agents claim the same file, second queues | queued | queued | ✅ | 1 granted, 1 queued (agent-bravo) |
| `watershed-02` Three agents, one shared file, two queue | queued | queued | ✅ | 1 granted, 2 queued (agent-bravo, agent-charlie) |
| `watershed-03` Disjoint claims all grant immediately | landed | landed | ✅ | 3 granted, 0 queued |
| `hostile-01` Merged tree attempts network egress during verification | rejected | skipped | ✅ |  |
| `hostile-02` Merged tree attempts to read a host secret | rejected | skipped | ✅ |  |

## What this measures, and what it does not

**Measured.** Whether the pipeline produces the correct *verdict* for each
labelled scenario: land it, route it to the resolver, refuse it at the
watershed, or refuse it at the gate. Merge, gates, footprint predicate and
claim registry are the real implementations, imported not reimplemented.

**Not measured.** Resolver *quality*. The benchmark resolver is
deterministic (task side preferred) because the case is testing routing and
retry-landing, not prose. An LLM resolver's output quality is a separate
measurement and is not scored here.

**Not measured.** Multi-agent concurrency at scale. The watershed cases
drive the real registry with 2–3 agents; a fleet-scale run is `npm run
simulate`.
