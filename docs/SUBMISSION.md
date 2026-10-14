# Submission writeup

Use the text below when filling out the Cloudflare "Build the next GitHub"
submission form. Sections are pre-cut for the form fields.

---

## Project title (max ~80 chars)

**Tributary — scheduling-first coordination for many agents on one codebase**

---

## One-line pitch (max ~160 chars)

> Conflicts are a scheduling problem first and a negotiation problem last.
> Tributary prevents them with a claim registry, integrates them via a
> speculative merge queue, and routes the leftovers to an LLM resolver.

---

## Short description (max ~500 chars)

> Tributary is a coordination layer for thousands of AI agents working on
> the same repo. An agent first declares the files it intends to touch; a
> Durable Object claim registry grants non-overlapping claims, queues
> overlapping ones, and expires claims via TTL so crashed agents never hold
> locks. Each task works in its own forked Cloudflare Artifacts repo with
> a scoped write token. Finished changes enter a sequential speculative
> merge queue (real three-way merge via isomorphic-git + a real test gate)
> that advances a verified trunk only when green. Only residual conflicts
> reach the LLM resolver — a last resort, not the core path. Built on
> Workers + Durable Objects + Queues + Artifacts.

---

## How it works (longer, ~1200 chars)

> When an agent starts work, it sends `POST /registry/claim` with the file
> footprint it intends to touch. The `ClaimRegistry` Durable Object holds
> an in-memory map of active claims with TTLs, plus a waitlist. If the
> footprint overlaps an active claim, the new agent is queued — zero work
> is wasted. The agent then forks `ejs-trunk` (imported via Cloudflare
> Artifacts) into a task repo, mints a one-hour write token, and pushes
> via `isomorphic-git` against the Artifacts Git remote. The token scopes
> the agent to its own fork; trunk is not writable from a task repo.
>
> The merge queue runs at `max_concurrency = 1`. For each task it
> fetches trunk + the task head, runs a real three-way merge with
> `abortOnConflict`, runs the test gate (the spike validates
> `package.json` parses; production deploys a Sandbox-run test), and
> pushes the advanced trunk only when both pass. Conflicts and gate
> failures route to the resolver, which receives both sides of each
> conflicted file (captured at merge time) and returns resolved content —
> the task re-enters the queue once, the retried merge applies the
> resolution through a `mergeDriver`, and the test gate re-verifies before
> trunk moves. A resolution only lands when green. On remote repos the
> resolver holds GitLab-Duo-style scoped privileges: read by default,
> write token minted only on an approved resolution.
>
> The live dashboard polls `/registry/status` every 1.5s and shows
> trunk state, active claims, the waitlist, and the three counters —
> total merges, conflicts prevented, resolver runs. The third counter is
> the one that matters: it should stay small.

---

## Cloudflare primitives used

- **Workers** — request handling, queue consumer
- **Durable Objects** — `ClaimRegistry` (file-footprint locks, waitlist,
  TTLs, live stats — single-writer per region for free)
- **Queues** — `merge-queue` with `max_concurrency = 1` to serialize
  speculative merges
- **Artifacts** — `import` brings upstream (`mde/ejs`) into `ejs-trunk`;
  `fork` per task; `createToken` for scoped write access. The default config
  runs against a bundled in-worker shim of this surface
  (`src/artifacts-local.ts`), because the real binding needs a Workers paid
  plan and has no local simulator; adding the `[[artifacts]]` binding switches
  to the real thing with no source changes
- **Workers AI** — `@cf/meta/llama-3.1-8b-instruct-fast` for LLM conflict
  resolution in the last-resort resolver; resolved contents are applied via a
  `mergeDriver` on the retried merge and re-verified by the test gate before
  landing. Optional and remote: the `[ai]` binding is the one binding in the
  default config that reaches the network, and the resolver falls back to a
  deterministic yield-to-trunk resolution when it is absent or the call fails.
- **isomorphic-git** (npm) — three-way merge + Git protocol client
  against Artifacts

---

## How to run (clean clone, three commands)

```sh
npm install
npm run dev        # in terminal 1
npm run simulate   # in terminal 2 — spawns 4 concurrent agents
```

Then open <http://127.0.0.1:8787/>. The default config runs fully offline —
no Cloudflare account or `wrangler login` required. The merge engine is
unit-tested locally: `npm run test:merge` runs four cases (clean merge, real
conflict, already-merged, gate failure) against an in-memory git repo, and
`npm run simulate` self-checks that every agent got a claim, an overlapping
claim was refused, and each task passed through the merge queue.

A real agent (or human) can also drive the full lifecycle with the `tributary`
CLI:

```sh
npm run tributary -- run src/auth.ts src/utils.ts
# or step-by-step:
npm run tributary -- claim src/auth.ts
npm run tributary -- status
npm run tributary -- conflict   # trigger resolver beat; watch dashboard
```

## Why this wins

The challenge brief asks for the next GitHub — a place where many
contributors work on one codebase without stepping on each other.
Existing tools assume human-scale conflicts and resolve them with
review. Agent-scale is different: there can be hundreds of merge
attempts per minute, and the cost of an unresolved conflict is a
stalled agent burning tokens on a doomed task. Tributary's answer is
**scheduling first, negotiation last** — prevent most conflicts in
the registry, integrate the survivors through a real merge engine,
and only spend the LLM on the residual stream that survives both.

---

## Links to include in the form

- **GitHub repo:** `<fill in>`
- **Demo video:** `<fill in>` (under 10 min; see `docs/DEMO_SCRIPT.md`)
- **Reference research:** `DECISIONS.md` in the repo
- **Cloudflare primitives reference:**
  <https://developers.cloudflare.com/workers/runtime-apis/durable-objects/>
  <https://developers.cloudflare.com/queues/>
  <https://developers.cloudflare.com/artifacts/>
