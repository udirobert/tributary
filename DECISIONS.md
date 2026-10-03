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

## Open Questions

- Does `wrangler dev` (local) emulate Artifacts bindings, or do import/fork/token flows require `wrangler deploy` to a real namespace? Blocks `npm run simulate` locally. (Doc fetch blocked by quota on Oct 3; verify next session.)
