# Tributary

A coordination layer for thousands of agents working on one codebase — built for
Cloudflare's "Build the next GitHub" challenge (Oct 2026).

**Thesis: conflicts are a scheduling problem first and a negotiation problem
last.** Tributary inverts the PR model: there are no pull requests. The unit of
work is a _change with a declared footprint_, continuously integrated through
three stages:

1. **Claim (prevent).** Before starting, an agent declares the files it intends
   to touch. A Durable Object claim registry grants non-overlapping claims,
   queues overlapping ones, and expires claims via TTL so crashed agents never
   hold locks.
2. **Land (integrate).** Each task works in its own forked Cloudflare Artifacts
   repo with a short-lived write token. Finished changes enter a sequential
   speculative merge queue (rebase onto trunk, run tests, advance a verified
   trunk only when green).
3. **Negotiate (resolve).** Only changes that clear stages 1–2 and still
   conflict reach an LLM resolver agent — a last resort, not the core path.

## Architecture

| Piece            | Cloudflare primitive                      | Role                                                                                                                                                           |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClaimRegistry`  | Durable Object (`src/index.ts`)           | File-level footprint locks, waitlist, TTLs, live stats                                                                                                         |
| Task repos       | Artifacts (`env.ARTIFACTS`)               | Import trunk, fork per task, scoped `write` tokens with TTL                                                                                                    |
| `LocalArtifacts` | Durable Object (`src/artifacts-local.ts`) | Offline stand-in for the Artifacts surface above — import / fork / token / commit / merge on one shared `MemoryFS` git store. What the **default config** runs |
| `MERGE_QUEUE`    | Workers Queue (`max_concurrency = 1`)     | Serializes speculative merges onto trunk                                                                                                                       |
| Merge engine     | `src/merge.ts`                            | Three-way `isomorphic-git` merge + test gate; trunk only moves when green                                                                                      |
| Resolver         | `src/resolver.ts` + Workers AI            | Real LLM resolution via `@cf/meta/llama-3.1-8b-instruct-fast`; per-hunk AI call; GitLab-Duo staged-commit model (write token minted only on approval)          |
| Dashboard        | Worker `GET /` (`src/dashboard.ts`)       | Auto-refreshing console: trunk state, counters, claim table, waitlist, feed                                                                                    |
| `tributary` CLI  | `scripts/tributary.ts`                    | Agent-facing surface: `claim / fork / commit / release / run` in one script                                                                                    |

### HTTP surface (spike)

- `GET /` — live dashboard (auto-refreshes every 1.5s)
- `POST /import` — import upstream repo into Artifacts as trunk (`ejs-trunk`)
- `POST /fork` — fork trunk into a task repo, mint a 1h write token
- `POST /commit` — commit + push to a task repo via `isomorphic-git` on an
  in-memory FS, then enqueue a merge
- `POST /registry/claim` · `POST /registry/release` · `GET /registry/status`
- `POST /demo/conflict` — triggers a footprint-violation → resolver beat
  for the demo (no second Artifacts repo required)

## Run it

Prerequisites: Node ≥ 20. **No Cloudflare account is required** — the default
`wrangler.toml` runs fully offline against the in-worker Artifacts shim
(`src/artifacts-local.ts`). Cloudflare Artifacts itself is a remote-only
binding: it has no local simulator and requires a Workers **paid** plan, so a
Worker that declares it will not boot on a free account (see DECISIONS.md).

```sh
npm install        # also wires lint-staged/husky hooks + the TS6 lint shim
npm run dev        # terminal 1: wrangler dev at http://127.0.0.1:8787
npm run simulate   # terminal 2: spawn 4 concurrent agents at the endpoints
npm run test:merge # optional: runs the merge-engine harness locally (4 cases)
open http://127.0.0.1:8787/   # live dashboard
```

`npm run simulate` checks the pipeline rather than only printing logs: all
four agents must get a claim, an overlapping claim must be refused and
queued, and every task must pass through the serial merge queue — it exits
non-zero otherwise.

The run shows the claim registry granting non-overlapping agents immediately
and queueing overlapping ones (the queued claim is promoted automatically when
the holder releases), then the merge queue consuming tasks one at a time. Each
task is a real three-way `isomorphic-git` merge that only advances trunk when
the merge and the test gate both pass; two agents editing the same line of
`src/index.js` surfaces as a real conflict and is routed to the resolver.

The loop closes: the resolver gets both sides of each conflicted file
(captured at merge time — `abortOnConflict` means conflict markers never reach
the task repo), produces resolved content, and the task re-enters the queue
once with that resolution attached. The retry merge applies it through
isomorphic-git's `mergeDriver`, producing a real merge commit the same test
gate re-verifies before trunk moves. You can watch the whole arc —
queued → promoted → conflict → resolved → landed — in the event feed.

### Workers AI is the one remote binding

`wrangler.toml` ships an optional `[ai]` binding, used only by the resolver.
AI bindings always run remotely — `wrangler dev` reports the mode as `remote`
and warns that they may incur charges even locally — but the resolver degrades
gracefully: if the model call fails it falls back to a deterministic
"yield to trunk" resolution (the conflicting file keeps trunk's version; the
task's other files still land). For a strictly offline run, delete the `[ai]`
block; nothing else changes.

### Drive it as an agent

`scripts/tributary.ts` exposes the lifecycle so a real agent — or a human — can
run it without hand-rolled HTTP:

```sh
npm run tributary -- --help
npm run tributary -- claim src/auth.ts
npm run tributary -- status
npm run tributary -- run src/auth.ts src/db.ts
```

### Running against real Artifacts (paid plan)

Add the block below to `wrangler.toml` and drop the `LOCAL_ARTIFACTS` binding
and its `v2` migration. `src/index.ts` prefers `env.ARTIFACTS` automatically —
no source changes:

```toml
[[artifacts]]
binding = "ARTIFACTS"
namespace = "default"
remote = true
```

## Current status

What works end-to-end:

- ✅ Import / fork / tokenized-push pipeline, exercised end-to-end via
  `npm run simulate` (default offline provider: `src/artifacts-local.ts`)
- ✅ Claim registry DO with overlap detection, waitlist, TTL, metrics
- ✅ Queue-driven merge pipeline (`max_concurrency = 1`)
- ✅ **Real** three-way merge engine (`src/merge.ts`) with four outcomes
  (merged / already-merged / conflict / failed) and a real test gate
- ✅ Queue consumer pre-filters footprint violations before spending a merge
- ✅ Dashboard auto-refreshes every 1.5s: trunk state with the last landed
  commit, a three-stage pipeline (prevent → integrate → negotiate), active
  claims, waitlist, and an event feed driven by the registry's own activity
  log. On a fresh start it shows the next command to run and a button that
  triggers the resolver beat in-page — no `curl` needed.
- ✅ Merge engine unit-tested via `npm run test:merge` (clean merge, real
  conflict, no-op re-merge, gate failure — all pass on an in-memory repo)
- ✅ `npm run simulate` is self-checking and exits non-zero if the pipeline
  did not actually run
- ✅ **Real** LLM resolver (`src/resolver.ts`): receives both sides of each
  conflicted file from the merge engine, resolves via
  `@cf/meta/llama-3.1-8b-instruct-fast` (or a deterministic yield-to-trunk
  fallback), and hands the resolved contents back to the queue — the retried
  merge applies them via `mergeDriver` and re-verifies through the test gate
  before trunk moves. One retry max. Also retains a staged-privilege clone
  path (read token → parse markers → write token on approval) for remote
  repos. Triggerable via `POST /demo/conflict`.
- ✅ `tributary` CLI (`scripts/tributary.ts`): agent-facing surface for
  `claim / release / status / fork / commit / conflict / run` — a real agent
  can drive the full lifecycle with `npm run tributary -- run <files...>`

What's still simulated or unverified:

- ⚠️ The `env.ARTIFACTS` path is untested against a live namespace — this
  account is free tier and Artifacts requires a paid plan. The offline shim
  is what the default config and the simulation exercise.
- ⚠️ Resolutions are whole-file (both sides' full content, one AI call per
  file), not per-hunk. Fine for the fixture; a real tree would want hunk-level
  granularity and a richer gate (a real test suite in a Sandbox).
- ⚠️ `trunkStatus` reflects trunk health only — rejected merges increment
  `rejections` and invoke the resolver but never land, so trunk stays green
  by construction. Watch the `rejections` counter for rejection volume.

Known assumptions and doc findings are logged in [DECISIONS.md](./DECISIONS.md).

## Prior art

No existing system combines prevention, isolation, and a speculative merge
queue: [openorchestrator](https://github.com/gitpcl/openorchestrator) warns on
worktree overlap but never enforces; [weave](https://github.com/ataraxy-labs/weave)
resolves semantic conflicts reactively at merge time with no scheduling;
[openagents](https://github.com/openagents-org/openagents) coordinates agents
conversationally, not via code ownership; GitLab's Duo conflict resolver
([work item #20688](https://gitlab.com/groups/gitlab-org/-/work_items/20688))
validates LLM-resolver-as-last-resort but stays MR-centric. Tributary's thesis —
scheduling first, negotiation last — is the gap between them. Details in
[DECISIONS.md](./DECISIONS.md).

## Safety toolchain

ESLint + Prettier + husky hooks: `pre-commit` runs a gitleaks staged secret
scan and lint-staged; `pre-push` runs `tsc` + ESLint. Note: typescript-eslint
does not support TypeScript 7 yet, so linting uses a side-by-side TS 6 shim
(`scripts/link-ts6-for-eslint.mjs`, see DECISIONS.md).

## License

MIT
