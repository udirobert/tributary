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

| Piece           | Cloudflare primitive                  | Role                                                                       |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `ClaimRegistry` | Durable Object (`src/index.ts`)       | File-level footprint locks, waitlist, TTLs, live stats                     |
| Task repos      | Artifacts (`env.ARTIFACTS`)           | Import trunk, fork per task, scoped `write` tokens with TTL                |
| `MERGE_QUEUE`   | Workers Queue (`max_concurrency = 1`) | Serializes speculative merges onto trunk                                   |
| Resolver        | `src/resolver.ts`                     | Last-resort LLM mediation for residual conflicts                           |
| Dashboard       | Worker `GET /`                        | Trunk status, active claims, queue depth, conflicts prevented vs. resolved |

### HTTP surface (spike)

- `GET /` — live dashboard
- `POST /import` — import upstream repo into Artifacts as trunk (`ejs-trunk`)
- `POST /fork` — fork trunk into a task repo, mint a 1h write token
- `POST /commit` — commit + push to a task repo via `isomorphic-git` on an
  in-memory FS, then enqueue a merge
- `POST /registry/claim` · `POST /registry/release` · `GET /registry/status`

## Run it

Prerequisites: Node ≥ 20 and a Cloudflare account (`npx wrangler login`) —
Artifacts bindings require a real account; whether they emulate under
`wrangler dev` local mode is being verified (see DECISIONS.md).

```sh
npm install        # also wires lint-staged/husky hooks + the TS6 lint shim
npm run dev        # terminal 1: wrangler dev at http://127.0.0.1:8787
npm run simulate   # terminal 2: spawn 4 concurrent agents at the endpoints
open http://127.0.0.1:8787/   # live dashboard
```

The simulation shows the claim registry granting non-overlapping agents
immediately, queueing overlapping ones, and the merge queue consuming tasks one
at a time.

## Current status

Step-0 spike + milestone scaffolding (milestones 1–6 in skeleton form):

- ✅ Import / fork / tokenized push proven against the Artifacts binding API
- ✅ Claim registry DO with overlap detection, waitlist, TTL, metrics
- ✅ Queue-driven merge pipeline (`max_concurrency = 1`)
- ⚠️ Merge/test step inside the queue consumer is **simulated** (random pass,
  10% fail) — the real speculative rebase + Sandbox test run is the next build
- ⚠️ Resolver is a stub (logs + fake delay), wired to the failure path
- ⚠️ Dashboard renders stats from the DO but does not auto-refresh yet

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

ISC
