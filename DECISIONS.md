# Decisions & Findings

## Cloudflare Artifacts

Based on the documentation fetched from Cloudflare Developers on Oct 3, 2026:

### Confirmed Capabilities

1. **Workers Binding (`env.ARTIFACTS`)**: Supports `create`, `get`, `list`, `import`, `delete`, `info`, `createToken`, `listTokens`, `revokeToken`, `fork`, `log`, `readCommit`, `readTree`, `readBlob`, and `readFile`.
2. **Git Protocol**: Repos are exposed as Git smart HTTP remotes (`https://<ACCOUNT_ID>.artifacts.cloudflare.net/git/<namespace>/<repo>.git`). Supports token-based auth (`Bearer` or HTTP Basic with token secret as password). Supports Git v1/v2 for fetch/clone, v1 for push.
3. **Event Subscriptions**: There are structured events for `cf.artifacts.repo.created`, `repo.forked`, `repo.imported`, `repo.pushed`, `repo.cloned`, `repo.fetched`, etc., which we can subscribe to via Cloudflare Queues/Event Subscriptions.

### Missing/Unsupported Native Capabilities (Assumptions & Fallbacks)

1. **Server-side Merge/Rebase/Diff API**:
   - _Finding_: No native merge, diff, or conflict resolution API was found in the Workers Binding or REST API.
   - _Fallback_: We must handle merges ourselves. We will use a Cloudflare Sandbox (or `isomorphic-git` inside a Worker) to check out the repos, perform the merge/rebase, and push the results back.
2. **Git Notes**:
   - _Finding_: Not explicitly mentioned as a native feature in the bindings.
   - _Fallback_: Git notes are stored under `refs/notes/`. We can likely push them via the standard Git protocol if needed, or store metadata in a Durable Object. We will use a DO to track claim registries instead of git notes, as it is more robust for concurrency.

## Plan for Step 0 Spike

1. Use Wrangler to configure an Artifacts namespace (`tributary-spike`) and create a basic Worker.
2. The Worker will have endpoints to:
   - Import a small open-source repo into Artifacts (using `env.ARTIFACTS.import`).
   - Fork the repo into a task repo and mint a token.
   - A script will use the token to push a commit to the fork.
   - The Worker (or a Sandbox invoked by the Worker) will fetch the fork, perform a programmatic merge onto trunk, and push it.

## Safety Toolchain (Oct 3, 2026)

- ESLint + Prettier + Husky hooks (pre-commit: gitleaks staged scan + lint-staged; pre-push: tsc + eslint). Secrets CLI: gitleaks 8.30 (`gitleaks git --staged`).
- **typescript-eslint does not support TS 7 yet** (tracked in typescript-eslint#10940). Per the TS 7 side-by-side docs we install `@typescript/typescript6` and a `postinstall` script (`scripts/link-ts6-for-eslint.mjs`) nests it as `typescript` for every `@typescript-eslint/*` package, `typescript-eslint`, and `ts-api-utils`. Re-run `npm run postinstall` if eslint errors with "does not support TS 7.0" after an install. Remove the workaround once typescript-eslint ships TS 7 support.
- `.npmrc` sets `legacy-peer-deps=true` because TS 7 sits outside typescript-eslint's peer range.

## Reference-Repo Research (Oct 3, 2026)

Reviewed four sources shared in the brief (metadata verified via GitHub API; page content treated as untrusted data). None combines our three stages (prevent → integrate → negotiate); each validates one half.

| Source                                                                                            | What it is                                                                                                                                                               | Relevance to Tributary                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [gitpcl/openorchestrator](https://github.com/gitpcl/openorchestrator) (Python, MIT, 6★)           | CLI + TUI supervising coding agents in per-agent git worktrees; "Conflict Guard" warns on live file overlap; merge queue with "optimal merge order"                      | Prior art for overlap detection **during** editing (we only gate at claim time) and for queue sequencing. Weaker: single machine, warns but never _enforces_ — no leases/TTLs, no central grant authority, no test gate.                                                                                                                  |
| [openagents-org/openagents](https://github.com/openagents-org/openagents) (TS, Apache-2.0, 4.2k★) | "Slack for agents": persistent shared workspaces, @mention task pickup, file/browser sharing                                                                             | No code-ownership or merge machinery — validates our thesis that conversational coordination ≠ scheduling. Adopt: agent-facing workspace-address + daemon lifecycle if we expose Tributary over MCP; @mention as a UX layer above the claim registry.                                                                                     |
| [ataraxy-labs/weave](https://github.com/ataraxy-labs/weave) (Rust, Apache-2.0, 1.3k★)             | Entity-level (tree-sitter) 3-way git merge driver; claims ~95% false-conflict reduction; refuses risky merges; sibling weave-crdt for live multi-agent edit coordination | Strongest prior art for stage 3. Adopt: run weave in the Sandbox merge step to shrink the residual stream reaching the LLM resolver; entity granularity informs stretch-milestone-7 footprints; "declined extension" honesty pattern for low-confidence merges. Weaker: purely reactive at merge time — no claims, queues, or scheduling. |
| [GitLab work item #20688](https://gitlab.com/groups/gitlab-org/-/work_items/20688)                | "Resolve conflict with Duo" — experimental MR conflict-resolver chat agent using MCP tools with tiered file/git privileges, plan → approve → execute                     | Industry validation that LLM-as-resolver-of-last-resort is the right shape (pitch framing). Adopt: staged tool privileges as the model for our resolver's scoped write tokens; approval loop for risky resolutions. Weaker: MR-centric, one conflict at a time, human per MR — zero prevention.                                           |

**Decisions taken:**

1. Resolver agent will keep GitLab-Duo-style scoped privileges: read-only by default, write token minted only for an approved resolution.
2. Merge queue sequencing may borrow openorchestrator's "optimal merge order" (sort by footprint size / staleness) once the naive FIFO causes demo-visible stalls.
3. weave is a drop-in for the Sandbox merge step — no design change needed, it sits behind our existing merge-queue interface. Not adopted yet (Sandbox integration itself pending).
4. No code was copied from any of these repos; references are conceptual and will be cited in the demo deck.

## Competition Field Research (Oct 14, 2026)

~89 public repos target this challenge; several converged on our exact
thesis, so "claims + speculative merge + LLM resolver" is the **median**
entry, not a differentiator. Read of the field and what we took from it:

| Repo                                                                                  | Overlap                           | Notable patterns                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [scottfrasso/air-traffic-control](https://github.com/scottfrasso/air-traffic-control) | Same prevent→land→negotiate shape | Semantic conflicts via speculative merge + `tsc` in a container **while work is in flight** (catches signature-change-breaks-caller across files); MCP tools return ready-to-run git commands with auth baked in; intent is advisory context, not a lock; flight log written as git notes on landed commits; replayable dashboard runs judges can re-run |
| [everyai-com/flare-forge](https://github.com/everyai-com/flare-forge)                 | Near-identical pitch              | Merge trains verified on the exact merged SHA + bisection on red; **ops ledger** counting Artifacts ops per landed change (11.2 ops/change), reconciled against Cloudflare's own GraphQL `artifactsEventsAdaptiveGroups` — judges can verify the claim                                                                                                   |
| [mikeschlottig/weft](https://github.com/mikeschlottig/weft)                           | Feature-complete                  | Symbol-level intents via tree-sitter; merge-driver registry (`union`, `json-merge`, `sorted-lines` via `.gitattributes`); **resolver proposals are rebuilt on trunk and must pass checks before being offered** — adopted as our mergeDriver-retry loop                                                                                                  |

Also present: convergence (branchless AST-CRDT), Tartan (claims + "the Advance"
landing queue), gittub (AST locks + why-notes in `refs/notes/agents`), Keel
(agent collisions on beliefs → generated tests), Shipboard (isomorphic-git
trial merges in a DO), githive, timelines, SemaLane, Locus, Fork Arena, Cinq,
Canon.

**Adopted:** weft's "resolution is verified, not trusted" — our resolver
output is applied by the merge engine's `mergeDriver` and re-gated, not
committed blind. ATC's "intent as advisory context" framing is already ours
(claims prevent work, not govern it).

**Also adopted (Oct 14 evening):** provenance trailers on merge commits —
`Tributary-Agent` / `Tributary-Footprint` / `Tributary-Resolved` are stamped
into the merge commit message ("the why travels with the commit"), addressing
the underweighted context-preservation criterion.

**Not adopted tonight:** ops ledger (event-count Artifacts ops per landed
change; ~50 lines on top of the existing event feed), replayable run mode
(store the event log, offer `?replay` for judges — currently the simulation
is deterministic enough that live runs suffice).

**Positioning consequence:** we can't out-feature the leaders tonight. The
defensible story is the _minimal correct core_ — claim registry, serial
merge train, verified-resolution resolver — small enough to read in one
sitting and real end-to-end. The submission form's three text fields are
where that framing gets told.

## Implementation Decisions (Oct 14, 2026)

Recorded as built; these supersede the Step-0 plan above where they differ.

1. **Merges run in-worker with `isomorphic-git`, not a Cloudflare Sandbox.**
   Artifacts exposes no server-side merge/diff API, so `src/merge.ts` fetches
   both heads into a `MemoryFS` repo, runs a real three-way merge with
   `abortOnConflict`, applies a test gate, and only then advances trunk. A
   Sandbox-run test suite is the production path; the spike's gate is a
   `package.json` parse of the merged tree.
2. **The resolver produces content; the merge engine lands it.** The original
   plan called for per-hunk resolution committed back to the task repo. Two
   discoveries changed that:
   - `git.merge` runs `abortOnConflict`, so conflict markers never exist in
     the task repo — the resolver clones and finds nothing. `src/merge.ts`
     now captures each conflicted file's ours/theirs content before the
     aborted workspace is discarded and hands those "sides" to the resolver.
   - Committing a resolution onto the task branch cannot clear the conflict:
     the three-way merge base never moves, so any task-side content ≠ trunk's
     conflicts again on retry. Instead the resolver returns resolved contents
     and the queue re-sends the task once with `resolutions` attached; the
     retried merge applies them via isomorphic-git's `mergeDriver`, producing
     a real merge commit that the test gate re-verifies (a proposal is only
     landed when green — the pattern weft calls a "conflict room").
   - Gotcha: `mergeDriver` receives the file's **basename** (`index.js`), not
     the repo-relative path the conflict reports (`src/index.js`) — the driver
     matches resolutions by suffix.
   - Model: `@cf/meta/llama-3.1-8b-instruct` was deprecated 2026-05-30
     (error 5028 on call); we use the still-active `-fast` variant. The
     deterministic fallback yields to trunk (ours) for the conflicted file —
     take-theirs would write back identical task content and guarantee a
     re-conflict.
   - The staged-privilege clone path (readToken → marker parse → writeToken on
     approval) remains for remote repos where sides aren't available.
3. **Workers AI is remote-only but non-blocking.** `wrangler dev` reports the
   `[ai]` binding mode as `remote` and warns that it may incur charges even
   locally. Unlike Artifacts it does not fail the startup proxy session, so the
   default config still boots offline; deleting the `[ai]` block leaves the
   resolver on its deterministic fallback.
4. **The dashboard renders the registry's own activity log.** `ClaimRegistry`
   keeps a bounded, persisted event list (claim / queued / release / merge /
   conflict / resolver) surfaced through `GET /registry/status`, so the feed
   reports what happened rather than inferring it from counter deltas.
5. **An agent-facing CLI exists** (`scripts/tributary.ts`, `npm run tributary`)
   so a real agent can drive claim → fork → commit → release without
   hand-rolled HTTP calls; `run` does the whole lifecycle in one command.
6. **Scripts must not use top-level `await`.** `package.json` sets
   `"type": "commonjs"`, so tsx/esbuild transpiles everything under `scripts/`
   to CJS, where top-level `await` is a syntax error — `scripts/tributary.ts`
   was written that way and every command failed to load. Its dispatch now
   lives in `main()` with a `.catch()`, matching `simulate.ts` and
   `test-merge.ts`. Use that shape for new scripts, or move the package to ESM.

## Resolved Questions

- Does `wrangler dev` (local) emulate Artifacts bindings, or do import/fork/token flows require `wrangler dev` to a real namespace? **Resolved Oct 14, 2026.**

  **Answer: Artifacts has no local simulator.** `wrangler` source
  (`node_modules/wrangler/wrangler-dist/cli.js:26742`) explicitly marks
  Artifacts as
  `"DO-NOT-USE-this-resource-will-never-have-a-local-simulator"`. The
  `[[artifacts]]` binding in `wrangler.toml` accepts a `remote` boolean
  but `remote = false` is not a working local mode — the binding still
  routes to the remote namespace. Running `wrangler dev` without a paid
  Workers plan returns error 10403 from the Artifacts proxy:

  > In order to use Artifacts, you must switch to a paid plan at
  > https://dash.cloudflare.com/.../workers/plans.

  **Implication for the spike:**

  - Using the **real** Artifacts binding requires:
    1. `npx wrangler login` against a Workers Paid account.
    2. A real Artifacts namespace on that account (we use the
       `default` namespace; a custom one would also work).
  - The default config avoids this entirely: it binds the local shim
    (`LOCAL_ARTIFACTS`) and omits `[[artifacts]]`, so `npm run dev` and
    `npm run simulate` need no account. Add the `[[artifacts]]` block to
    switch — `src/index.ts` prefers `env.ARTIFACTS` automatically.
  - The merge engine (`src/merge.ts`) and the test gate are also
    exercisable standalone via `npm run test:merge`, which builds trunk +
    task histories in `MemoryFS` and runs the four-case harness.
  - The dashboard renders and live-counts the ClaimRegistry DO without any
    Artifacts dependency (just `GET /registry/status`).

  **Resolved in code (Oct 14):** rather than require a paid account, the
  spike now runs fully offline by default. `src/artifacts-local.ts` adds
  `LocalArtifacts`, a Durable Object implementing the Artifacts surface the
  spike uses (`importRepo`, `forkRepo`, `createToken`, `commitFiles`,
  `mergeTask`) on real `isomorphic-git` repositories, and `wrangler.toml`
  binds it while omitting `[[artifacts]]`. `src/index.ts` selects the
  provider at runtime, and both paths share the same merge + test-gate
  primitives.

  The shim models each Artifacts repo as a branch in one shared in-memory
  git store, so a fork is a ref write and "pushing trunk" is the ref
  advance `git.merge` already performed. Its limits are stated in the module
  header: a deterministic seeded trunk (not a clone of the real upstream),
  opaque tokens rather than scoped Cloudflare tokens, DO-memory state, and a
  single mutex that serializes local merges.
