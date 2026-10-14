# Submission writeup

Use the text below when filling out the Cloudflare "Build the next GitHub"
submission form. Sections are pre-cut for the form fields.

---

## Project title (max ~80 chars)

**Tributary — many tributaries, one trunk; scheduling-first coordination**

---

## One-line pitch (max ~160 chars)

> Many tributaries, one trunk. Tributary prevents conflicts at the watershed,
> integrates them at the confluence, and leaves only the residual for the
> rapids.

---

## Short description (max ~500 chars)

> Tributary coordinates thousands of AI agents on one repo. Thesis: conflicts
> are a scheduling problem first, a negotiation problem last. Each change is a
> tributary: declared at the watershed (a Durable Object claim registry —
> non-overlapping footprints granted, the rest queued, stale locks freed by
> TTL), joined to the trunk at the confluence (a serial merge queue with a real
> three-way merge + test gate), and only the residual reaches the rapids (an LLM
> resolver of last resort).

---

## How it works (longer, ~1200 chars)

> When an agent starts, it declares its tributary: `POST /registry/claim` with
> the file footprint. The watershed (`ClaimRegistry`, a Durable Object) holds
> claims with TTLs plus a waitlist; an overlapping footprint is queued, not
> failed — no wasted work. The agent forks `ejs-trunk` (imported via Artifacts)
> into a task repo, mints a one-hour write token, and pushes via
> `isomorphic-git`; the token scopes it to its own fork, so trunk is never
> writable from a task repo.
>
> At the confluence the merge queue runs at `max_concurrency = 1`: it fetches
> trunk and the task head, runs a real three-way merge (`abortOnConflict`), runs
> the test gate (the spike checks `package.json` parses; production runs a
> Sandbox test), and advances trunk only when both pass. Conflicts and gate
> failures route to the rapids — the resolver — with both sides of each
> conflicted file captured at merge time. The task re-enters the queue once,
> applies the resolution through a `mergeDriver`, and the gate re-verifies
> before trunk moves; a resolution only lands green.
>
> The dashboard polls `/registry/status` every 1.5s: trunk state, the watershed
> (claims and waitlist), and three counters — merges, conflicts prevented,
> resolver runs. The third should stay small.

---

## Cloudflare primitives used

- **Workers** — request handling, queue consumer
- **Durable Objects** — `ClaimRegistry` (file-footprint locks, waitlist,
  TTLs, live stats — single-writer per region for free)
- **Queues** — `merge-queue` (the confluence) with `max_concurrency = 1` to
  serialize speculative merges
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
npm run simulate   # in terminal 2 — spawns 5 concurrent agents
```

Then open <http://127.0.0.1:8787/>. The default config runs fully offline —
no Cloudflare account or `wrangler login` required. The merge engine is
unit-tested locally: `npm run test:merge` runs five cases (clean merge, real
conflict, already-merged, gate failure, and a semantic signature-change
conflict) against an in-memory git repo, and `npm run simulate` self-checks
that every agent got a claim, an overlapping claim was refused, and each task
passed through the confluence.

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
**scheduling first, negotiation last**: prevent most conflicts at the
watershed, integrate the survivors at the confluence through a real merge
engine, and spend the LLM only on the residual that reaches the rapids.

---

## Links to include in the form

- **GitHub repo:** `<fill in>`
- **Demo video:** `<fill in>` (under 10 min; see `docs/DEMO_SCRIPT.md`)
- **Reference research:** `DECISIONS.md` in the repo
- **Cloudflare primitives reference:**
  <https://developers.cloudflare.com/workers/runtime-apis/durable-objects/>
  <https://developers.cloudflare.com/queues/>
  <https://developers.cloudflare.com/artifacts/>
