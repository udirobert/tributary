# JUDGES.md — Tributary in five minutes

Everything a reviewer needs, in the order they need it. Each claim links to the
artifact that proves it and the command that reproduces it.

---

## What this is

**Tributary is a merge control plane for agent swarms.** Many AI agents edit one
repo; Tributary schedules their work before it starts, integrates it serially,
and proves the merged tree before the trunk moves.

**One line:** many agents, one trunk, zero blast radius.

**The thesis:** conflicts are a scheduling problem first and a negotiation
problem last.

---

## The three stages

| Stage                      | What it does                                                                                                                                     | Where it lives                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Watershed** (prevent)    | Agents declare a file footprint before working. Overlapping claims queue instead of colliding; TTLs free crashed agents.                         | `src/index.ts` → `ClaimRegistry`         |
| **Confluence** (integrate) | Each task gets a forked repo and a short-lived write token. A serial queue merges it three-way, then runs the gate. Trunk moves only when green. | `src/merge.ts`, `src/artifacts-local.ts` |
| **Rapids** (negotiate)     | Only residual conflicts reach the LLM resolver. Last resort, not the core path.                                                                  | `src/resolver.ts`                        |

---

## The number to look at

```
npm run bench
```

25 labelled cases, 23 scored under the local provider, **23/23 correct verdicts,
0 false lands**. Full output: [`eval_results/BENCHMARK-RESULTS.md`](../eval_results/BENCHMARK-RESULTS.md).
Machine bundle: [`eval_results/live-benchmark.json`](../eval_results/live-benchmark.json).

The metric that matters is **false lands** — work that should have been refused
but reached the trunk. A false refusal wastes an agent's compute. A false land
ships the bug.

---

## The differentiator: conflicts git cannot see

**4 of 4** semantic-conflict cases were merged _cleanly by git_ and then refused
by the semantic gate.

A signature changes in one file; the caller in another file was never updated.
The two files never touch textually, so `git merge` reports success and a plain
merge queue lands broken code. Tributary's acorn arity gate catches it.

| Case          | git verdict | Tributary verdict |
| ------------- | ----------- | ----------------- |
| `semantic-01` | clean merge | rejected          |
| `semantic-02` | clean merge | rejected          |
| `semantic-03` | clean merge | rejected          |
| `semantic-04` | clean merge | rejected          |

**Why this matters for containment.** Sandboxing proves code is _safe to run_.
It does not prove the code is _correct_. A fleet of sandboxed agents can each
execute safely and still land a trunk that no longer works. That is the gap
Tributary closes, and it is the gap a single-run sandbox cannot reach.

---

## Containment

Every merge's gate runs in a throwaway container, never in the control plane:

```
--network none · read-only mount · --cap-drop ALL · no-new-privileges
uid 65534 · 256MB / 0.5 CPU / 64 pids · destroyed after every run
```

`server/sandbox.ts`. Five hostile probes run through the same boundary at
`POST /containment/lab`:

| Probe                       | Observed                               |
| --------------------------- | -------------------------------------- |
| Fork bomb                   | killed at 8,008 ms (pids capped at 64) |
| Infinite loop               | timed out at 8,012 ms                  |
| Network egress              | `EGRESS_BLOCKED · EAI_AGAIN`           |
| Secret read (`/etc/shadow`) | `SECRET_READ_BLOCKED · EACCES`         |
| Read-only write             | `WRITE_BLOCKED · EROFS`                |

Verified on the deployed Vultr VM. `/config` reports `sandbox: "docker"`.

**Honest note on the benchmark:** the two containment cases are marked
`requires: docker` and are reported as **skipped, never passed**, when the
benchmark runs on a machine without Docker. The `local` provider is a child
process with an empty environment — it has no network namespace, so it cannot
enforce egress isolation. Scoring it would be a lie. See the skip block at the
top of `BENCHMARK-RESULTS.md`.

---

## Vultr services

| Service                  | How it is used                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloud Compute VM**     | Runs the whole control plane: Node HTTP server, SQLite claim registry, git store, Docker daemon for gate containers. `deploy/setup-vultr.sh` provisions it.                       |
| **Serverless Inference** | `vultr/glm-5.3-flash` via `server/vultr-ai.ts`, an OpenAI-compatible adapter presenting the `ai.run()` surface the planner and resolver expect. `/config` reports the live model. |
| **Docker**               | The gate boundary. Sibling containers on the same VM, never inside the app process.                                                                                               |

---

## Reproduce it

```sh
npm install
npm test          # merge engine + node env + sandbox gate harnesses
npm run bench     # the 25-case labelled benchmark
npm run dev:node  # the Vultr runtime, no Cloudflare account needed
npm run simulate  # 5 concurrent agents, self-checking, exits non-zero on failure
```

Public deployment: `https://tributary.persidian.com` — `/config` reports
`mode: "node/vultr"`, `sandbox: "docker"`, `ai.provider: "vultr"`.

---

## Known limits, and what closes them

Stated plainly, because a limit with a fix is engineering and a limit without
one is a gap.

| Limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Status                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Resolver output is whole-file, not per-hunk                                                                                                                                                                                                                                                                                                                                                                                                                               | Known. Fine for the fixture; a real tree wants hunk granularity.                                                   |
| Semantic gate is scope-limited — name-matched arity, bare-identifier calls only. Scans `.js`/`.cjs`/`.mjs`/`.ts`/`.tsx`/`.mts`/`.cts` (optional/default/rest params, `arguments`-variadic, local-binding shadowing and `require()`-opaque names all honored; `dist/`/`build/`/`vendor/`/`.min.*`/`.d.*` excluded). Does not follow `x.f()` member calls, aliased imports, or dynamic dispatch; non-erasable TS (`enum`, `import =`, `declare`) reports as a parse finding | Known. The production shape is the repo's own toolchain (`tsc`, `eslint`, the test suite) inside the same sandbox. |
| `env.ARTIFACTS` (real Cloudflare Artifacts) is unexercised — needs a Workers Paid plan                                                                                                                                                                                                                                                                                                                                                                                    | Known. The default config runs the offline shim; adding the binding switches with no source changes.               |
| Node mode is single-process — singleton DOs, in-process queue drain                                                                                                                                                                                                                                                                                                                                                                                                       | Correct for one VM control plane, not a distributed deployment.                                                    |
| `verify.mjs` (ESM) is not yet supported by the gate                                                                                                                                                                                                                                                                                                                                                                                                                       | Supported — `vm.SourceTextModule` with `vm.Script` fallback handles ESM verification scripts.                      |
| Containment cases unscored without Docker                                                                                                                                                                                                                                                                                                                                                                                                                                 | Reported as skipped, never passed. Run on a Docker host to score them.                                             |

---

## What is deliberately not here

- **No pull requests.** The unit of work is a change with a declared footprint.
- **No LLM in the decision path.** The model plans and resolves; it never decides whether a merge lands. Gates decide.
- **No claim that a sandbox proves correctness.** It proves safety. The semantic gate is a separate, narrower proof, and the benchmark measures it separately.
