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
   `package.json` parse of the merged tree **plus a semantic gate**: acorn
   parses every `.js` file in the merged tree (pure JS, no Node fs, so it
   runs inside a Worker where tsc can't) and rejects arity mismatches between
   exported functions and bare-identifier call sites — the signature-change-
   breaks-caller conflict that `git merge` reports as clean. The simulation's
   Agent-Echo exercises it every run.
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

## Theme Pass — the river vocabulary (Oct 14, 2026)

The project is named Tributary, but the metaphor had been brand-only: the name
was everywhere and the imagery almost nowhere. This pass makes the metaphor the
framing — in code comments and docstrings, log labels, and prose.

| Concept                  | River name     | Function  |
| ------------------------ | -------------- | --------- |
| One agent's change       | **tributary**  | —         |
| Verified main branch     | **trunk**      | —         |
| Agent's isolated repo    | **fork**       | —         |
| Stage 1 — claim registry | **watershed**  | prevent   |
| Stage 2 — merge queue    | **confluence** | integrate |
| Stage 3 — resolver       | **rapids**     | negotiate |

The metaphor is not decoration: git is already a river (trunk, fork, branch,
upstream, downstream), so the vocabulary surfaces what the tooling already
implies. The one word it adds at the core is **confluence** — the point where
changes join the trunk, previously the generic "merge queue".

**Decision: infrastructure identifiers stay.** The `MERGE_QUEUE` binding, the
`merge-queue` queue name, `ClaimRegistry`, `LocalArtifacts`, route paths, and
class/function names are plumbing, not prose — renaming them would churn config
and commit history for no reader-visible gain. The river vocabulary is applied
only to human-facing surfaces: comments, the queue-consumer log prefix
(`[MergeQueue]` → `[Confluence]`), the merge commit subject, the dashboard, and
the docs. The resolver's log prefix remains `[Resolver]` — it names the
mechanism, while "rapids" is that stage's name in the pipeline. The merge
commit author identity is themed along with the subject — `Tributary Merge
Queue` → `Tributary Confluence` — so the vocabulary is consistent in the landed
commits a reader inspects.

## Live surface, storage, and MCP (Oct 14, 2026)

Four changes, all verified on this machine: `npm run test:merge` passes 5/5, and
`npm run simulate` reports 5/5 claims, 1 conflict prevented, 5/5 merges and
exits 0.

**Live surface.** The dashboard no longer polls. `GET /registry/events` is a
Server-Sent Events stream — `snapshot` on connect, `update` on every mutation,
`: ping` every 15s, each frame carrying the same body as
`GET /registry/status` (which stays, because the CLI and the simulation use
it). The dashboard falls back to polling every 1.5s if SSE errors or is
unavailable.
`GET /registry/replay` returns the whole retained event log, oldest first, which
powers the dashboard's `?replay` scrubber.

**Storage.** `ClaimRegistry` is now SQLite-backed (`new_sqlite_classes`). The
old `save()` rewrote claims, waitlist, stats and the entire event array on every
claim and release — write amplification that grew with the log. Now each
mutation writes only the rows it changed; the event log is append-only (capped
at 2000 rows); the live feed reads the latest 40 while replay reads all of it;
and overlap detection reads a file→agent index — O(files) instead of O(claims ×
files). In a live run the replay endpoint retained 74 events while the feed
capped at 40.

_Caveat:_ this is a storage-backend change, so old local state must be cleared —
`rm -rf .wrangler/state` — if `wrangler dev` complains on first run.

**MCP.** `scripts/mcp.ts` (`npm run mcp`) is a dependency-free MCP stdio server
exposing `tributary_claim`, `tributary_release`, `tributary_status`,
`tributary_commit` and `tributary_conflict`, so an agent can drive the lifecycle
natively. Known gap: there is no `tributary_fork` tool yet, so
`tributary_commit` still needs the repo name/remote/token obtained out of band.

**Gate cache.** The semantic gate now caches acorn parse results by a content
hash (FNV-1a of the source), bounded at 1000 entries with FIFO eviction, so
unchanged files are never re-parsed. Behaviour is unchanged — the same merges
are rejected for the same reasons, verified by the harness.

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
    task histories in `MemoryFS` and runs the five-case harness.
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

## Node/Vultr runtime (Nov 6, 2026)

For the Vultr Agent Rush hackathon (Challenge 1, "Blast Radius Zero") the
control plane needs to live on a Vultr VM with Vultr Serverless Inference
for agent LLM calls — while the existing Cloudflare Worker deployment stays
working as the alternate. Rather than rewriting the bindings out, the Worker
module is made runtime-portable: `server/index.ts` serves `worker.fetch`
over `node:http`, and `server/env-node.ts` constructs the same `Env` from
Vultr-side implementations.

**Decisions taken:**

1. **`cloudflare:workers` is satisfied via `module.registerHooks`, not by
   editing imports.** `src/index.ts` and `src/artifacts-local.ts` extend
   `DurableObject` from that specifier, which Node treats as an unresolvable
   URL scheme. A resolve/load hook pair returns an in-memory module whose
   `DurableObject` base assigns `ctx`/`env` — the only thing the subclasses
   need. Hooks must register before the Worker module's graph links, so
   `server/index.ts` dynamic-imports `../src/index` inside `main()`. Zero
   changes to Worker behaviour; verified under tsx's CJS output on Node 26.
2. **`ctx.storage.sql` is `node:sqlite`.** `DatabaseSync` matches the DO
   API's synchronous shape: `exec()` with no params and multiple statements
   (only `initSchema`) goes to `db.exec`; single statements are prepared and
   dispatched on `stmt.columns().length` (`all` vs `run`). Rows come back as
   plain objects, same as `SqlStorageCursor`. State persists to
   `TRIBUTARY_DB` (default `.tributary-state.db`, `:memory:` allowed) —
   faithful to DO storage semantics.
3. **`MERGE_QUEUE` is an in-process serial drain.** `send()` chains onto a
   tail promise that invokes `worker.queue({messages: [{body}]})` — the same
   `max_concurrency = 1` semantics the confluence relies on, including
   re-queue sends from inside the handler.
4. **DO namespaces are lazy singletons.** `idFromName()`/`get()` return a
   fixed id and a lazily constructed instance — one `ClaimRegistry`, one
   `LocalArtifacts`. Registry gets the sqlite-backed fake `ctx`;
   `LocalArtifacts` never reads `ctx`.
5. **The executed gate is the sandbox.** `env.SANDBOX_GATE` (new optional
   binding) replaces the in-process fixture gate in both merge paths
   (`mergeTask`, `mergeTaskIntoTrunk`); `collectTree()` materializes the
   merged workdir into `path -> content`. `server/sandbox.ts` writes the
   tree to a temp dir and runs `.tributary-gate.mjs` — `vm.Script` compiles
   every .js file (syntax check, nothing executed), validates package.json,
   then executes the repo's verification command (`verify.cjs`/`verify.js`,
   or `npm test` when the manifest declares one) — inside `docker run --rm
--network none --read-only --cap-drop ALL --security-opt
no-new-privileges --memory 256m --cpus 0.5 --pids-limit 64`. Providers:
   `docker` (required on the VM), `local` (child process, empty env,
   timeout — dev fallback), `off` (in-process gate). The in-process semantic
   gate always runs alongside; it catches the class the syntax gate can't.
   Verification scripts are CommonJS because the semantic gate is
   CJS-oriented; ESM `verify.mjs` is a known follow-up.
6. **`AI` becomes Vultr Serverless Inference.** `server/vultr-ai.ts` is an
   OpenAI-compatible adapter (`/chat/completions`) exposing `ai.run()`;
   `VULTR_INFERENCE_MODEL` selects the model (default
   `vultr/glm-5.3-flash`). With no API key the binding is absent and the
   resolver takes its existing deterministic fallback.
7. **Verified in-place:** `tsc --noEmit` clean; `npm run test:merge` 5/5;
   `API_BASE=http://127.0.0.1:8788 npm run simulate` all checks green on the
   Node runtime (5 claims, 1 prevented conflict, 5 merges, 1 resolver run);
   a deliberately-broken `src/db.js` commit merged cleanly through git and
   was rejected by the sandbox gate (`Unexpected token '{'`) and routed to
   the rapids — the demo's containment moment.

**Known limits of the port:** DO singleton means one process, one registry —
fine for a single-VM control plane; the docker socket mount trusts the host
daemon (standard for sibling-container sandboxes); `local` sandbox mode is
containment-lite, documented as dev-only.

## Product layer (Nov 6, 2026)

Follow-up to the Node/Vultr runtime: turned the spike into a product surface
for Agent Rush Challenge 1 ("model writes code → runs in a container →
verifiable output").

**Decisions taken:**

1. **Tasks are first-class entities**, stored in the registry's sqlite
   (`tasks` table — `commit` renamed `commit_hash`, a reserved word).
   Lifecycle statuses plus plan, edits, repo, commit, gate evidence and
   resolution ride the existing SSE snapshot, so the UI needs no new channel.
   `taskId` threads through queue messages; the confluence updates the record
   on land / reject / resolve.
2. **The built-in agent is a client, not a privileged actor** — `src/agent.ts`
   drives the same registry/artifacts/queue stubs external agents use. The
   planner calls `env.AI` (Vultr inference primary, Workers AI under wrangler)
   with the trunk tree from `LocalArtifacts.readTree` and expects full-file
   edits back as JSON. Tasks submitted with `edits` skip planning (manual/demo
   path — also the only path when no inference key is configured).
3. **The gate returns a verdict + evidence record** (`SandboxGateResult` /
   `GateEvidence` in `src/merge.ts`): provider, the containment spec
   (no network, read-only, caps, destroyed), harness output/stdout/stderr,
   exit code, duration, timeout flag, and a `verification` object for the
   repo's executed check (command, exit code, duration, stdout/stderr,
   skipped/timed-out reason). Attached to merge outcomes and the task record
   — the containment boundary plus the executed-work proof rendered
   per-task in the UI, which is the C1 demo's centerpiece.
4. **Resolver reports provenance** — `ResolveResult.via` carries the model id
   or fallback label into the task record.
5. **UI is task-centric**: composer (goal + advanced footprint/edits), task
   cards with lifecycle + gate badges, and a detail drawer — plan, footprint
   chips, per-file edits, the sandbox evidence panel, resolution. The river /
   pipeline / feed remain as the observability layer beneath.

**Verified:** `tsc` clean; eslint clean; `simulate` 5/5 on Node mode; manual
`POST /tasks` runs landed (gate pass, evidence attached) and rejected
(broken JS → sandbox reject → rapids) end-to-end. One simulate flake
observed (queued claim's 15s retry window under slower sandboxed gates) —
claim budget raised to 45s.

## Node queue semantics fix (Nov 8, 2026)

Verification on Node 26 found a real deadlock in the `MERGE_QUEUE` shim:
`send()` returned the drain promise, so a resolver retry sent from inside
the queue handler waited for a message queued behind the handler that was
waiting for it. `send()` now resolves as soon as the message is chained —
matching Cloudflare Queue semantics — while the tail still drains messages
serially.

**Verified:** a deterministic two-fork same-file conflict now runs
`conflict → resolver → re-queue → landed`; `npm run simulate` passes 5/5 on
Node mode; `npm run test:node` covers the re-entrant send regression, and
`npm test` now runs both the merge-engine and Node-env harnesses.

The same verification pass found `/demo/pack`'s conflict beat was
timing-dependent: the queued task could fork only after the first merge had
already landed, turning the intended conflict into a clean fast-forward.
`src/agent.ts` now splits `prepareAgentTask` (plan → claim → fork → commit →
release) from `enqueueAgentTask`, and the demo pack prepares all three tasks
before enqueueing any merge — so both `src/index.js` tributaries still fork
the same pre-merge trunk and the confluence produces the conflict on demand.
Verified: demo pack lands task A, conflicts task B into the rapids, rejects
broken `src/db.js` in the sandbox gate, then lands B's verified resolution.

## Vultr Agent Rush positioning (Nov 8, 2026)

Research for Challenge 1 ("Blast Radius Zero") shows the visible field is
crowded with single-run containment products: generate code → run it in
Docker/gVisor → return a receipt. Those are table stakes, not differentiation.
Tributary's whitespace is fleet-level coordination: claims, waitlists,
fork/commit, serial speculative merges, sandbox-verified trunk landing, and a
resolver that is deliberately last resort.

**Decision:** keep the multi-agent merge-control thesis as the primary Vultr
story, but do not submit it as "just another sandbox runner." The submission
must translate the architecture into Pattern A proof: model writes code → code
executes inside a Vultr Docker sandbox → verifiable output returns. The
executed gate is now implemented locally (`verify.cjs`/`verify.js` or `npm
test` inside the same sandbox, with command/stdout/stderr/exit-code evidence);
before submission we still need a visible containment probe, an explanation
step powered by Vultr Inference, and deployed `/config` showing
`sandbox: "docker"` + `ai.provider: "vultr"`.

Docs aligned: `README.md` now leads with "many agents, one trunk, zero blast
radius"; `docs/VULTR_SUBMISSION.md` carries the submission-aligned pitch,
rubric map, demo beats, and gaps; `docs/HANDOFF.md` reorders the remaining
work around the containment lab, Vultr deployment, demo recording, and
lablab submission now that the executed gate exists locally.

## Executed verification gate + related OSS (Nov 8, 2026)

**Built:** `server/sandbox.ts` now runs `.tributary-gate.mjs` inside the same
Docker/local boundary. After the syntax/package pass it executes the merged
tree's verification command — `verify.cjs`/`verify.js`, or `npm test` when
`package.json` declares `scripts.test` — with a scrubbed environment, 20s
verification timeout inside the 30s gate timeout, clipped stdout/stderr, and
sandbox-root paths sanitized to `.` in evidence. `GateEvidence` gained
`stdout`/`stderr`/`timedOut`/`verification`; the dashboard drawer renders the
executed command separately from the containment spec. The local Artifacts
seed now carries `verify.cjs`, and `/demo/pack`'s third task rewrites
`src/db.js` into code that parses but fails verification (`query` is a
string, plus an arity slip the semantic gate also catches if the sandbox is
off). `scripts/test-sandbox.ts` covers pass/fail/syntax-skip in `local`
mode; `npm test` runs it with the merge and Node-env harnesses.

**Verified locally:** `npm test` green; `POST /demo/pack` on
`TRIBUTARY_SANDBOX=local` lands the clean task, lands the resolver retry,
and rejects the db rewrite with `node verify.cjs` exit 1 /
`db.connect() did not return a query client` in task evidence.

**Related OSS to learn from (not copied):** the coordination space is active.
Closest are local-first tools — [agent-semaphore](https://github.com/alwh1te/agent-semaphore)
(intent claims, warn/strict enforcement, conflict prediction, serialized
landing + test gate), [AgentXFlow](https://github.com/harlixay7/AgentXFlow)
(worktrees, write leases, machine verification, SHA-256 proof bundles, FIFO
merge + CAS), [foremerge](https://github.com/naw103/foremerge) (semantic
claims/dependencies/provenance above git), [mergetrain](https://github.com/yongjip/mergetrain)
and [claude-code-merge-queue](https://github.com/funador/claude-code-merge-queue)
(durable merge queues, combined-state gates, human-only promote), and
[agent-fork-join](https://github.com/Epiphytic/agent-fork-join) (conflict →
rebase → agent fixes → retry). For receipts/sandbox evidence see
[andbo](https://github.com/qosikz/andbo/), [agentkernel](https://github.com/thrashr888/agentkernel/),
[axocoatl](https://github.com/axocoatl/axocoatl), [Aegis](https://github.com/jeshwanthsingh/Aegis),
and [proctor](https://github.com/dylanp12/proctor). Tributary stays
differentiated as a hosted control plane with fork/token task repos, serial
speculative merges, LLM last-resort resolution, and live task evidence.

**Roadmap taken from that research:** tactical next — containment lab probes
through the same sandbox path, SHA-256 evidence/receipt bundle, ESM
`verify.mjs` support, repo-native toolchain gates, MCP `tributary_fork`.
Ambitious next — finer-grained footprints (function/symbol intents like
weft/grit/foremerge), dependency-aware merge ordering (air-traffic-control /
multi-agent-merge-orchestrator), offline-verifiable receipts (Aegis/proctor),
and a Vultr-Inference explanation pass that summarizes plan → edits → merge →
verify → verdict for judges.

## Vultr deployment check (Nov 8, 2026)

`nuncio-vultr` was provisioned with `deploy/setup-vultr.sh` using a pre-seeded
`/etc/tributary.env` for separation: `PORT=8788`, `HOST=127.0.0.1`,
`TRIBUTARY_SANDBOX=docker`, `TRIBUTARY_DB=/var/lib/tributary/state.db`,
`SANDBOX_IMAGE=node:22-alpine`. `tributary.service` is active; `/config`
reports `mode:"node/vultr"`, `sandbox:"docker"`, and
`ai.provider:"vultr"` (`vultr/glm-5.3-flash`). `npm run simulate` passed on
the box and `POST /demo/pack` produced landed / conflict→resolver→landed /
rejected with `node verify.cjs` evidence. Public exposure is intentionally
pending: ufw is active and 8788 is localhost-only.

## Containment lab verification (Nov 8, 2026)

`POST /containment/lab` runs five hostile probes through the same Docker
boundary as merge verification. The first run exposed a real gap: the gate
container ran as root, so `/etc/shadow` was readable (`SECRET_READ_OK`,
`contained=false`). Fixed by running gate/lab containers as uid `65534`
(`--user 65534:65534`), setting `HOME=/tmp`, and chmodding temp mounts to
`0755` so the unprivileged user can read the mounted workspace (commits
`439eb01`, `0f3064c`). Re-run on `nuncio-vultr`: all five probes contained —
fork bomb and infinite loop hit the 8s probe timeout, network egress failed
with `EAI_AGAIN`, secret read failed with `EACCES`, and read-only write
failed with `EROFS`. `npm run simulate` still passes with the unprivileged
gate.

## Public exposure (Nov 8, 2026)

`tributary.persidian.com` was already DNS-only to `144.202.117.160`. Coolify's
Traefik (`coolify-proxy`, file provider watching
`/data/coolify/proxy/dynamic/`) got a new `tributary.yaml` router/service for
the subdomain with Let's Encrypt TLS and an HTTP→HTTPS redirect; the backend
is `http://host.docker.internal:8788`. To let the proxy reach the host service
without opening the port publicly, `/etc/tributary.env` now uses
`HOST=0.0.0.0` and UFW has `8788/tcp ALLOW IN From 10.0.0.0/8` only — the same
pattern as the other Docker/Traefik services on the box. Public
`https://tributary.persidian.com/config` returns `sandbox:"docker"` +
`ai.provider:"vultr"`, and `/` returns the dashboard.
