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

| Piece           | Cloudflare primitive                  | Role                                                                        |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `ClaimRegistry` | Durable Object (`src/index.ts`)       | File-level footprint locks, waitlist, TTLs, live stats                      |
| Task repos      | Artifacts (`env.ARTIFACTS`)           | Import trunk, fork per task, scoped `write` tokens with TTL                 |
| `MERGE_QUEUE`   | Workers Queue (`max_concurrency = 1`) | Serializes speculative merges onto trunk                                    |
| Merge engine    | `src/merge.ts`                        | Three-way `isomorphic-git` merge + test gate; trunk only moves when green   |
| Resolver        | `src/resolver.ts`                     | Last-resort LLM mediation for residual conflicts (GitLab-Duo-style scope)   |
| Dashboard       | Worker `GET /` (`src/dashboard.ts`)   | Auto-refreshing console: trunk state, counters, claim table, waitlist, feed |

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

Prerequisites: Node ≥ 20 and a Cloudflare account (`npx wrangler login`) —
Artifacts bindings require a real account; whether they emulate under
`wrangler dev` local mode is being verified (see DECISIONS.md).

```sh
npm install        # also wires lint-staged/husky hooks + the TS6 lint shim
npm run dev        # terminal 1: wrangler dev at http://127.0.0.1:8787
npm run simulate   # terminal 2: spawn 4 concurrent agents at the endpoints
npm run test:merge # optional: runs the merge-engine harness locally (4 cases)
open http://127.0.0.1:8787/   # live dashboard
```

The simulation shows the claim registry granting non-overlapping agents
immediately, queueing overlapping ones, and the merge queue consuming tasks
one at a time. The merge engine runs a real three-way `isomorphic-git`
merge per task and only pushes trunk when both the merge and the test
gate succeed.

## Current status

What works end-to-end:

- ✅ Import / fork / tokenized push proven against the Artifacts binding API
- ✅ Claim registry DO with overlap detection, waitlist, TTL, metrics
- ✅ Queue-driven merge pipeline (`max_concurrency = 1`)
- ✅ **Real** three-way merge engine (`src/merge.ts`) with four outcomes
  (merged / already-merged / conflict / failed) and a real test gate
- ✅ Queue consumer pre-filters footprint violations before spending a merge
- ✅ Dashboard auto-refreshes every 1.5s, shows trunk state, claim table,
  waitlist, live event feed
- ✅ Merge engine unit-tested via `npm run test:merge` (clean merge, real
  conflict, no-op re-merge, gate failure — all pass on an in-memory repo)

What's still simulated:

- ⚠️ Resolver is a stub (logs + 2s delay) — the shape is right (scoped
  privileges on a separate write token) but the LLM call is the next
  build. Triggerable on demand via `POST /demo/conflict`.
- ⚠️ `wrangler dev` local-mode behavior of the Artifacts binding is being
  verified — see DECISIONS.md.

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
