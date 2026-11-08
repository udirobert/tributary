# Tributary — handoff checklist

Last updated: Nov 8, 2026 (after the Node/Vultr verification pass: queue
semantics fix, deterministic demo pack, Node-env regression test).

## Where the project stands

Verified on this machine during the latest pass:

- `npm run dev:node` boots the same Worker module under plain Node with
  `TRIBUTARY_DB=:memory:` and `TRIBUTARY_SANDBOX=local`; `/config` reports
  `mode: "node/vultr"` and the active sandbox provider.
- `API_BASE=http://127.0.0.1:8788 npm run simulate` drives five concurrent
  agents end-to-end and exits 0: five claims granted, one overlapping claim
  queued/promoted, five merge-queue items processed, trunk green.
- `npm test` passes: the five-case merge-engine harness plus the new
  Node-env queue regression (`scripts/test-node-env.ts`).
- `npm run typecheck`, `npm run lint` (0 errors; existing `any` warnings
  only), and `npm run format:check` pass.
- `POST /demo/pack` is now deterministic: all three preset tasks prepare
  their forks before any merge is enqueued, so the two `src/index.js` tasks
  fork the same pre-merge trunk. Verified result: task A lands, task B hits
  `conflict in src/index.js`, the resolver yields to trunk, the retry merge
  lands, and broken `src/db.js` is rejected by the sandbox gate with evidence.
- `POST /tasks` with explicit `edits` runs through the built-in agent path
  and lands with sandbox-gate evidence attached.
- `npm run dev` / Wrangler still boots with local bindings; `/config`,
  `/registry/status`, and the dashboard respond successfully.
- `npm run mcp` answered a real `initialize` / `tools/list` /
  `tributary_status` handshake over stdio against the Node server.
- `deploy/setup-vultr.sh` passes `bash -n`.

Earlier Cloudflare-path verification still stands: SSE + replay, SQLite
registry storage, MCP server, gate cache, live dashboard, and the offline
Artifacts shim.

## Current priority

The active target is the **Vultr Agent Rush Challenge 1 — “Blast Radius
Zero”** path documented in DECISIONS.md: model writes code → code runs in a
container → verifiable output. The Node/Vultr control plane is implemented
and locally verified; the remaining proof is on a real Vultr VM with Docker
and Vultr Inference configured.

## What is left

1. **Deploy to Vultr.** Run `deploy/setup-vultr.sh` on a fresh Cloud Compute
   VM, or use `deploy/docker-compose.yml` where Docker is already present.
   Then set `VULTR_INFERENCE_API_KEY` and optionally `VULTR_INFERENCE_MODEL`
   in `/etc/tributary.env`.

2. **Verify the deployed containment boundary.** `/config` should report
   `sandbox: "docker"` and `ai.provider: "vultr"`. Run `simulate` and
   `/demo/pack` against the public URL; the demo should show sandbox evidence
   per task, the deterministic conflict → resolver → landed arc, and the
   broken-code rejection.

3. **Record the demo.** `docs/DEMO_SCRIPT.md` is the Cloudflare-challenge
   script; for Vultr, lead with the task dashboard, sandbox evidence, and
   the deterministic demo pack rather than the raw five-agent harness.

4. **(Cloudflare stretch) Submit/polish the original challenge entry.** The
   repo and submission copy remain in `docs/SUBMISSION.md`; social preview
   still has to be set in GitHub repository settings if it has not been.

5. **(Stretch) Verify against real Artifacts** on a Workers Paid account:
   add the `[[artifacts]]` block to `wrangler.toml`, drop the
   `LOCAL_ARTIFACTS` binding and its `v2` migration, `npx wrangler login`,
   then `npm run dev` and `npm run simulate`.

6. **(Stretch) Richer gate / MCP fork tool.** The executed gate is real but
   still syntax/package-json scoped; production shape is the repo's own
   toolchain in the same sandbox. MCP still lacks `tributary_fork`, so
   `tributary_commit` needs repo credentials obtained separately.

## River vocabulary (theme)

The outward-facing surfaces speak in the project's river metaphor: each agent's
change is a **tributary**, the verified branch is the **trunk**, and the three
stages are the **watershed** (prevent) → **confluence** (integrate) → **rapids**
(negotiate). Applied in the dashboard, the docs, code comments, and the
queue-consumer log prefix (`[Confluence]`). Infrastructure identifiers
(`MERGE_QUEUE`, the `merge-queue` queue name, `ClaimRegistry`) are deliberately
unchanged — they are plumbing, not prose. See DECISIONS.md.

## Known limitations

- **Resolutions are whole-file.** The resolver passes each side's full file
  content to one AI call; there's no hunk granularity. Adequate for the
  fixture, not for large trees.
- **The `env.ARTIFACTS` path is unexercised.** This account is free tier and
  Artifacts requires a Workers Paid plan (error 10403), so default configs use
  the offline shim (`src/artifacts-local.ts`) instead.
- **The shim is not Artifacts.** It seeds a deterministic trunk rather than
  cloning the real upstream, mints opaque tokens rather than scoped Cloudflare
  tokens, keeps state in DO/Node memory or sqlite, and serializes merges with a
  single mutex/drain.
- **Docker sandboxing is not yet proven on a host.** The provider is
  implemented (`server/sandbox.ts`) and the compose/systemd deploy path mounts
  the Docker socket, but the latest local verification used
  `TRIBUTARY_SANDBOX=local` because Docker is not installed on the dev machine.
- **Vultr Inference is optional but unverified here.** Without
  `VULTR_INFERENCE_API_KEY`, planning/resolution fall back to supplied edits
  and deterministic yield-to-trunk behavior.
- **Node mode is single-process.** The DO namespaces are singleton instances
  and the queue drain is in-process — correct for one VM control plane, not a
  distributed deployment.
- **`[ai]` under Wrangler reaches the network.** Remote Workers AI may incur
  charges even in local dev; delete the binding for a strictly offline run.
- **Local DO state resets with the storage change.** `ClaimRegistry` is
  SQLite-backed, so a checkout carrying old Wrangler local state may need
  `rm -rf .wrangler/state` before `npm run dev`.

## File map

| File                       | Status   | What it does                                                              |
| -------------------------- | -------- | ------------------------------------------------------------------------- |
| `src/index.ts`             | core     | Routes, SQLite `ClaimRegistry` DO, task API, SSE + replay, queue consumer |
| `src/agent.ts`             | product  | Built-in agent: prepare (plan/claim/fork/commit) → enqueue → confluence   |
| `src/artifacts-local.ts`   | core     | `LocalArtifacts` DO — offline Artifacts surface on isomorphic-git         |
| `src/merge.ts`             | core     | Real three-way merge + fixture/semantic/sandbox gates                     |
| `src/resolver.ts`          | core     | Conflict-side resolution via Workers AI / Vultr + staged clone path       |
| `src/dashboard.ts`         | product  | Task cards, river, SSE, `?replay`, sandbox/gate evidence                  |
| `src/memory-fs.ts`         | modified | In-memory FS for isomorphic-git                                           |
| `server/index.ts`          | runtime  | Node/Vultr entry: `node:http` wrapper around the Worker module            |
| `server/env-node.ts`       | runtime  | Node bindings: node:sqlite registry, serial queue, Vultr AI, sandbox      |
| `server/sandbox.ts`        | runtime  | Docker/local containment gate for merged trees                            |
| `server/vultr-ai.ts`       | runtime  | OpenAI-compatible Vultr Inference adapter for `ai.run()`                  |
| `deploy/`                  | runtime  | Vultr VM setup script, Dockerfile, compose file                           |
| `scripts/simulate.ts`      | harness  | 5-agent end-to-end simulation, self-checking                              |
| `scripts/test-merge.ts`    | harness  | 5-case merge-engine harness                                               |
| `scripts/test-node-env.ts` | harness  | Node-env queue semantics regression                                       |
| `scripts/tributary.ts`     | agent    | Agent-facing CLI (`claim / fork / commit / release / run`)                |
| `scripts/mcp.ts`           | agent    | MCP stdio server — five lifecycle tools for agents                        |
| `wrangler.toml`            | config   | Binds `LOCAL_ARTIFACTS` + optional `[ai]`, omits `[[artifacts]]`          |
| `docs/`                    | docs     | Demo script, submission copy, MCP reference, checklist, hero art          |
