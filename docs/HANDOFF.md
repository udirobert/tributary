# Tributary — handoff checklist (Oct 14, 2026, 21:25 UTC)

## What changed in the last ~90 minutes (Dev 3, dashboard + script lane)

1. **Dashboard rewrite** — `src/dashboard.ts` extracted into its own
   module. Polls `/registry/status` every 1.5s. Live counters, claim
   table, waitlist table, synthetic event feed diffed from state.
   Server handler in `src/index.ts` now just returns
   `DASHBOARD_HTML`.
2. **Queue payload** — `/commit` accepts `agentId`, `files`, and
   `changedFiles` and forwards them to the queue.
3. **Queue consumer** — footprint-violation pre-filter rejects work
   outside the declared footprint and routes it to the resolver;
   everything else runs through `mergeTaskIntoTrunk` (real three-way
   merge + real test gate).
4. **Demo hook** — `POST /demo/conflict` triggers the resolver beat on
   demand (no second Artifacts repo required).
5. **License** — ISC → MIT (`LICENSE` file + `package.json`). The
   challenge rules only allow MIT/Apache-2.0/BSD.
6. **Merge engine** — landed by parallel work during the same session
   (`src/merge.ts`, `scripts/test-merge.ts`, plus
   `src/memory-fs.ts` extended with `readlink`/`symlink` and `fsError`
   codes). 4 cases in `npm run test:merge` all pass.

## What I could NOT do (out of lane or out of capability)

- **Record the actual demo video.** I am a CLI coding agent — I cannot
  capture audio or screen. The script is in `docs/DEMO_SCRIPT.md` and
  is the canonical thing for whoever records.
- **Push to GitHub.** No remote configured. The account is on the free
  tier; Artifacts dev requires Workers Paid; pushing itself is fine
  but `gh repo create` is needed. See "Remaining work" below.
- **Verify `wrangler dev` end-to-end.** Resolved the open question
  (Artifacts has no local simulator, requires Workers Paid), but did
  not run the full import → fork → commit → queue → merge pipeline
  against a real account because (a) this account is free tier and
  (b) I can't authorize paid spend from this session.

## Remaining work (in priority order)

1. **Push to GitHub.** From a shell with `gh auth status` green:

   ```sh
   gh repo create tributary --public --description "Coordination layer
       for many agents on one codebase — Cloudflare 'Build the next GitHub'"
   git -C /Users/udingethe/Dev/tributary remote add origin \
       git@github.com:<user>/tributary.git
   git -C /Users/udingethe/Dev/tributary push -u origin master
   ```

   Fill the resulting URL into `docs/SUBMISSION.md` ("Links to
   include").

2. **Submit the form.** Use `docs/SUBMISSION.md` for the field text.
   Pick the GitHub URL from step 1 and the demo video URL (once
   recorded) into the form.

3. **Record the demo.** `docs/DEMO_SCRIPT.md` is the script. Suggested
   pipeline: OBS or `agent-browser` for capture, a quiet room, run
   `npm run test:merge` once on camera for a 15-second "the merge
   engine is real, four cases, all pass" beat before the live demo.
   Target runtime 5–7 minutes; the rule is 5–10.

4. **(Stretch) Verify the live demo end-to-end** on a Workers Paid
   account. Steps:
   - `npx wrangler login` against the paid account
   - In `wrangler.toml` set the `namespace` to a real namespace on
     that account (or keep `default` if it exists)
   - `npm run dev` — should now succeed past the Artifacts proxy
   - `npm run simulate` in a second terminal
   - Open `http://127.0.0.1:8787/` — counters should tick up

   If this fails on a Paid account too, the demo can fall back to:
   - Show `npm run test:merge` (merge engine proof, no account)
   - Show the dashboard with the ClaimRegistry DO running (no
     Artifacts needed — DO is locally simulated)

## Open risks

- **The free-tier error blocks the live demo for whoever records.**
  Whoever records needs a paid account OR a plan to fall back to
  `test:merge` + dashboard-with-DO-only. This is documented in
  `docs/DEMO_SCRIPT.md` ("Backup / cuttable beats").
- **`mergeTaskIntoTrunk` is exercised locally but not against a real
  Artifacts namespace.** It compiles and the merge logic is tested
  on `MemoryFS`, but the `git push` to `trunk.remote` against a real
  `artifacts.cloudflare.net` URL has not been observed. If the demo
  fails on that step, the dashboard still works (DOs are local) and
  the test harness is a strong fallback.

## File map (what's new since the initial commit)

| File                    | Status     | What it does                              |
| ----------------------- | ---------- | ----------------------------------------- |
| `src/dashboard.ts`      | new        | Live coordination console HTML            |
| `src/merge.ts`          | new        | Real three-way merge + test gate          |
| `scripts/test-merge.ts` | new        | 4-case harness for the merge engine       |
| `src/memory-fs.ts`      | modified   | +readlink, +symlink, fsError codes        |
| `src/index.ts`          | modified   | Real merge in queue, demo hook, dashboard |
| `scripts/simulate.ts`   | modified   | Forwards agentId/files/changedFiles       |
| `package.json`          | modified   | License MIT, +test:merge script           |
| `wrangler.toml`         | modified   | `remote = true` on the Artifacts binding  |
| `LICENSE`               | new        | MIT                                       |
| `README.md`             | modified   | Reflects real merge state                 |
| `DECISIONS.md`          | modified   | Resolves the open question                |
| `docs/DEMO_SCRIPT.md`   | new        | 6-min voiceover script + checklist        |
| `docs/SUBMISSION.md`    | new        | Pre-cut submission form text              |
| `docs/HANDOFF.md`       | new (this) | What was done, what's left                |
