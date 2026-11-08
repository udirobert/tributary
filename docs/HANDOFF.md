# Tributary — handoff checklist

Last updated: Nov 8, 2026 (executed-verification gate shipped; Vultr Docker
path verified on `nuncio-vultr` at `127.0.0.1:8788`).

## Where the project stands

Verified on this machine during the latest pass:

- `npm run dev:node` boots the same Worker module under plain Node with
  `TRIBUTARY_DB=:memory:` and `TRIBUTARY_SANDBOX=local`; `/config` reports
  `mode: "node/vultr"` and the active sandbox provider.
- `API_BASE=http://127.0.0.1:8788 npm run simulate` drives five concurrent
  agents end-to-end and exits 0: five claims granted, one overlapping claim
  queued/promoted, five merge-queue items processed, trunk green.
- `npm test` passes: the five-case merge-engine harness, the Node-env queue
  regression (`scripts/test-node-env.ts`), and the sandbox-gate harness
  (`scripts/test-sandbox.ts`) that executes `verify.cjs` in local mode.
- `npm run typecheck`, `npm run lint` (0 errors; existing `any` warnings
  only), and `npm run format:check` pass.
- `POST /demo/pack` is now deterministic: all three preset tasks prepare
  their forks before any merge is enqueued, so the two `src/index.js` tasks
  fork the same pre-merge trunk. Verified result: task A lands, task B hits
  `conflict in src/index.js`, the resolver yields to trunk, the retry merge
  lands, and the db rewrite is rejected by executed sandbox verification
  (`node verify.cjs` exits 1: `db.connect() did not return a query client`)
  with command/stdout/stderr/exit-code evidence attached.
- `POST /tasks` with explicit `edits` runs through the built-in agent path
  and lands with sandbox-gate verification evidence attached.
- `npm run dev` / Wrangler still boots with local bindings; `/config`,
  `/registry/status`, and the dashboard respond successfully.
- `npm run mcp` answered a real `initialize` / `tools/list` /
  `tributary_status` handshake over stdio against the Node server.
- `deploy/setup-vultr.sh` passes `bash -n`.
- Deployed to `nuncio-vultr` with `deploy/setup-vultr.sh`: `tributary.service`
  is active on `127.0.0.1:8788`, `/config` reports `mode:"node/vultr"` and
  `sandbox:"docker"` (`ai=off` until `VULTR_INFERENCE_API_KEY` is set).
  `npm run simulate` passed on the box and `POST /demo/pack` produced the
  landed / conflict→resolver→landed / rejected arc with `node verify.cjs`
  evidence.

Earlier Cloudflare-path verification still stands: SSE + replay, SQLite
registry storage, MCP server, gate cache, live dashboard, and the offline
Artifacts shim.

## Current priority

The active target is the **Vultr Agent Rush Challenge 1 — “Blast Radius
Zero”** path documented in DECISIONS.md and `docs/VULTR_SUBMISSION.md`:
many agents, one trunk, zero blast radius. The Node/Vultr control plane is
implemented and verified locally and on a real Vultr VM (`nuncio-vultr`) with
the Docker sandbox, Vultr Inference (`vultr/glm-5.3-flash`), and the
containment lab; the remaining proof is public exposure and the recorded
demo.

The Nov 8 positioning pass found the visible field crowded with single-run
containment products (generate code → sandbox → receipt). Tributary's
whitespace is fleet-level coordination: claims, waitlists, fork/commit,
serial speculative merges, sandbox-verified trunk landing, and resolver as
last resort. The Pattern A execution gap is closed and proven on Vultr:
the sandbox gate runs the merged tree's `verify.cjs`/`verify.js` (or `npm
test`) inside the same throwaway container and returns executed stdout/
stderr/exit code as task evidence. The containment lab is also live:
`POST /containment/lab` runs five hostile probes through the same Docker
boundary and all five are contained on `nuncio-vultr`. What remains for
Challenge 1 is public exposure and a repeatable recorded demo.

## What is left

1. **Expose Tributary deliberately.** `nuncio-vultr` runs
   `tributary.service` on `127.0.0.1:8788` with `sandbox:"docker"` and
   `ai.provider:"vultr"`. Expose via `sudo ufw allow 8788/tcp` for a direct
   high-port demo URL or a Traefik/Coolify route for a prettier hostname.

2. **Verify the public demo path.** After exposure, re-run `simulate`,
   `/demo/pack`, and `POST /containment/lab` against the public URL so the
   recording uses the same evidence judges will see.

3. **Record the Vultr demo.** Use `docs/VULTR_SUBMISSION.md` demo beats:
   dashboard cold open → demo pack → watershed/confluence/rapids →
   containment moment → evidence close. Add the lab as a short evidence beat
   if time allows. `docs/DEMO_SCRIPT.md` remains the Cloudflare cut.

4. **Submit on lablab.ai.** Use `docs/VULTR_SUBMISSION.md` for title, pitch,
   short description, architecture summary, and rubric mapping. Optionally
   showcase on Vultr Community after the required lablab submission.

5. **(Cloudflare stretch) Submit/polish the original challenge entry.** The
   repo and submission copy remain in `docs/SUBMISSION.md`; social preview
   still has to be set in GitHub repository settings if it has not been.

6. **(Stretch) Verify against real Artifacts** on a Workers Paid account:
   add the `[[artifacts]]` block to `wrangler.toml`, drop the
   `LOCAL_ARTIFACTS` binding and its `v2` migration, `npx wrangler login`,
   then `npm run dev` and `npm run simulate`.

7. **(Stretch) Receipts / richer gate / MCP fork tool.** Consider SHA-256
   evidence bundles for judge-verifiable receipts. The executed gate now runs
   `verify.cjs`/`verify.js` or `npm test`; the next gate upgrades are ESM
   `verify.mjs`, repo-native toolchains (tsc/eslint/test), and hunk-level
   resolver output. MCP still lacks `tributary_fork`, so `tributary_commit`
   needs repo credentials obtained separately.

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
- **Docker sandboxing is proven on `nuncio-vultr`, not yet public.** The
  provider (`server/sandbox.ts`) ran real `node:22-alpine` gate containers on
  the Vultr VM; the service is currently bound to `127.0.0.1:8788` behind the
  host firewall, so the public demo URL is still pending.
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

| File                       | Status   | What it does                                                                |
| -------------------------- | -------- | --------------------------------------------------------------------------- |
| `src/index.ts`             | core     | Routes, SQLite `ClaimRegistry` DO, task API, SSE + replay, queue consumer   |
| `src/agent.ts`             | product  | Built-in agent: prepare (plan/claim/fork/commit) → enqueue → confluence     |
| `src/artifacts-local.ts`   | core     | `LocalArtifacts` DO — offline Artifacts surface on isomorphic-git           |
| `src/merge.ts`             | core     | Real three-way merge + fixture/semantic/sandbox gates                       |
| `src/resolver.ts`          | core     | Conflict-side resolution via Workers AI / Vultr + staged clone path         |
| `src/dashboard.ts`         | product  | Task cards, river, SSE, `?replay`, sandbox/gate evidence                    |
| `src/memory-fs.ts`         | modified | In-memory FS for isomorphic-git                                             |
| `server/index.ts`          | runtime  | Node/Vultr entry: `node:http` wrapper around the Worker module              |
| `server/env-node.ts`       | runtime  | Node bindings: node:sqlite registry, serial queue, Vultr AI, sandbox        |
| `server/sandbox.ts`        | runtime  | Docker/local containment gate; executes `verify.cjs`/`verify.js`/`npm test` |
| `server/vultr-ai.ts`       | runtime  | OpenAI-compatible Vultr Inference adapter for `ai.run()`                    |
| `deploy/`                  | runtime  | Vultr VM setup script, Dockerfile, compose file                             |
| `scripts/simulate.ts`      | harness  | 5-agent end-to-end simulation, self-checking                                |
| `scripts/test-merge.ts`    | harness  | 5-case merge-engine harness                                                 |
| `scripts/test-node-env.ts` | harness  | Node-env queue semantics regression                                         |
| `scripts/test-sandbox.ts`  | harness  | Executed-verification gate harness (local provider)                         |
| `scripts/tributary.ts`     | agent    | Agent-facing CLI (`claim / fork / commit / release / run`)                  |
| `scripts/mcp.ts`           | agent    | MCP stdio server — five lifecycle tools for agents                          |
| `wrangler.toml`            | config   | Binds `LOCAL_ARTIFACTS` + optional `[ai]`, omits `[[artifacts]]`            |
| `docs/`                    | docs     | Demo script, submission copies, MCP reference, checklist, hero art          |
| `docs/VULTR_SUBMISSION.md` | docs     | Vultr Agent Rush positioning, rubric map, demo beats, gaps                  |
