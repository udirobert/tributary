# Tributary — handoff checklist

Last updated: Oct 14, 2026 (after the river-vocabulary pass, README banner, and
social-preview art).

## Where the project stands

All of the following was verified on this machine at the time of writing:

- `npm run dev` boots with **no Cloudflare account**. All three bindings report
  mode `local` (`ClaimRegistry`, `LocalArtifacts`, `merge-queue`); the only
  remote binding is the optional `[ai]`.
- `npm run simulate` drives five concurrent agents end-to-end and **exits 0**.
  It self-checks that all agents obtained a claim, that an overlapping claim
  was refused and queued, and that every task passed through the serial merge
  queue.
- `npm run test:merge` passes 5/5 — clean merge, real conflict, no-op re-merge,
  test-gate failure, and a signature-change semantic conflict.
- `npm run simulate` runs **five** agents: Alpha/Bravo produce the same-file
  conflict → resolver → landed arc, and **Agent-Echo** produces the semantic
  beat — `greet()` signature change merges clean in git, then fails the
  acorn-based semantic gate (`greet() called with 1 arg(s) in src/handlers.js
but defined with 2 param(s)`).
- The worker log shows real landings with commit SHAs, and Alpha/Bravo's
  same-line edit on `src/index.js` surfacing as a genuine conflict routed to
  the resolver — **and then landing**: the resolver produces resolved content
  via Workers AI, the task re-queues once with the resolution attached, and
  the retried merge applies it via `mergeDriver` + re-verifies through the
  test gate (`conflict → resolver → landed`, real merge SHA on trunk).
- `npm run typecheck`, `npm run lint` (0 errors) and `npm run format:check` all
  pass.
- The dashboard was rendered in headless Chrome: counters update, the event
  feed shows real tagged events with agent names and SHAs, and the onboarding
  banner is visible on a fresh store.
- The waitlist lifecycle is correct: a queued claim is promoted automatically
  when the holder releases (no client retry needed), the dashboard waitlist
  drains, and a rejected merge no longer flips `trunkStatus` red — rejections
  are counted separately because the queue prevented them from landing.
- The resolver model was moved to `@cf/meta/llama-3.1-8b-instruct-fast` —
  the non-`-fast` variant was deprecated 2026-05-30 and errors 5028 on call.
  If Workers AI rate-limits mid-run (error 1031 observed once), the resolver
  falls back to yield-to-trunk and the task still lands — the demo survives
  it, and the log labels the fallback honestly.
- The outward-facing surfaces speak the project's river vocabulary
  (watershed → confluence → rapids): the dashboard, README, submission copy,
  demo script, code comments, and the `[Confluence]` queue log. The README
  carries a `docs/hero.svg` banner; `docs/social-preview.png` matches it.

## What is left

1. **Push to GitHub — done.** The repo is live at
   <https://github.com/udirobert/tributary> on `main`. This block is the
   one-time setup that already ran, kept for reference:

   ```sh
   gh repo create tributary --public --description "Coordination layer \
       for many agents on one codebase — Cloudflare 'Build the next GitHub'"
   git remote add origin git@github.com:udirobert/tributary.git
   git push -u origin main
   ```

   The URL is already filled into `docs/SUBMISSION.md` ("Links to include").

   Then set the social preview: **Settings → General → Social preview →
   Upload an image**, using `docs/social-preview.png` (1280×640, 253 KB; the
   SVG source is `docs/social-preview.svg`). This is a repository setting, not
   a committed file — it cannot be set from git.

2. **Submit the form**, using `docs/SUBMISSION.md` for the field text.

3. **Record the demo.** `docs/DEMO_SCRIPT.md` is the script (target 5–7 min).
   No paid account is needed for the recording; run `npm run test:merge` once on
   camera for the "the merge engine is real" beat, and let the Bravo conflict
   show the full `conflict → resolver → re-queue → landed` arc live.

4. **(Stretch) Verify against real Artifacts** on a Workers Paid account: add
   the `[[artifacts]]` block to `wrangler.toml`, drop the `LOCAL_ARTIFACTS`
   binding and its `v2` migration, `npx wrangler login`, then `npm run dev` and
   `npm run simulate`.

5. **(Stretch) Richer gate.** The gate is a `package.json` parse plus an
   acorn arity check over the merged tree; a production version runs the
   repo's real test suite in a Cloudflare Sandbox before the merge lands.

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
  tokens, keeps state in DO memory, and serializes merges with a single mutex.
- **`[ai]` reaches the network.** Remote Workers AI may incur charges even in
  local dev; delete the binding for a strictly offline run — the resolver then
  uses the deterministic yield-to-trunk fallback, which still lands.

## File map

| File                     | Status   | What it does                                                          |
| ------------------------ | -------- | --------------------------------------------------------------------- |
| `src/index.ts`           | core     | Worker routes, `ClaimRegistry` DO, queue consumer, provider switch    |
| `src/artifacts-local.ts` | new      | `LocalArtifacts` DO — offline Artifacts surface on isomorphic-git     |
| `src/merge.ts`           | new      | Real three-way merge + test gate                                      |
| `src/resolver.ts`        | new      | Conflict-side resolution via Workers AI + staged-privilege clone path |
| `src/dashboard.ts`       | new      | Coordination console: pipeline strip, live feed, onboarding           |
| `src/memory-fs.ts`       | modified | In-memory FS for isomorphic-git (`readlink`/`symlink`, fsError)       |
| `scripts/simulate.ts`    | modified | 5-agent harness, deterministic footprints, self-checking              |
| `scripts/test-merge.ts`  | new      | 5-case merge-engine harness                                           |
| `scripts/tributary.ts`   | new      | Agent-facing CLI (`claim / fork / commit / release / run`)            |
| `wrangler.toml`          | modified | Binds `LOCAL_ARTIFACTS` + optional `[ai]`, omits `[[artifacts]]`      |
| `docs/`                  | new      | Demo script, submission writeup, checklist, hero + social preview art |
