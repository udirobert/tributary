# Tributary — Demo Video Script (target runtime: 6 min)

**Project:** Tributary, a coordination layer for thousands of agents working on one codebase.
**Challenge:** Cloudflare "Build the next GitHub" (Oct 2026).
**Format:** Screen capture + voiceover. Two terminals and a browser dashboard.
**Tone:** Confident, dry, technical. No hype. Let the dashboard counters do the work.

---

## Pre-recording checklist (T–30 min)

- [ ] `npm install` clean on a fresh clone (proves the run instructions)
- [ ] **No Cloudflare login needed.** The default config runs offline against
      the bundled Artifacts shim (`src/artifacts-local.ts`). `npx wrangler login` is
      only required if you switch to real Artifacts on a paid plan.
- [ ] Two terminals open side-by-side:
  - left: `npm run dev` (the Worker, logs visible)
  - right: ready to run `npm run simulate`
- [ ] Browser at `http://127.0.0.1:8787/` — full-screen, dark mode
- [ ] Browser tab for `/registry/status` (raw JSON) for the deep-dive beat
- [ ] README + DECISIONS.md open in a tab for the prior-art beat
- [ ] Audio check: room tone is quiet; mic is at mouth level, not laptop mic
- [ ] `npm run test:merge` already run once on camera so the audience sees the green output

---

## 0:00–0:30 — Cold open (no talking, just dashboard)

Cut straight to the dashboard at `127.0.0.1:8787`. All counters at zero. Trunk green.

> VO: _(silence for 3s, then)_ "This is a coordination console for thousands of agents
> working on one codebase. We're going to start it from zero."

> VO: "And it doesn't leave you guessing. With nothing running it tells you the
> exact command to start, and offers to fire the third stage on its own."

[Point at the onboarding banner, then cut to terminal right and run
`npm run simulate`.]

---

## 0:30–1:30 — The thesis, in one minute

[Camera: dashboard. Counter still 0/0/0. Cursor hovers on the thesis paragraph.]

> VO: "The thesis: **conflicts are a scheduling problem first, and a negotiation
> problem last.** Every system that tries to coordinate many agents on one
> codebase ends up doing the same thing in three stages. They prevent
> overlapping work, they integrate changes, and they negotiate the
> leftovers. The question is: how much of your pipeline do you spend in
> each stage? Most tools skip straight to negotiation — LLM merge
> resolvers that paper over the conflict. We invert the order. We
> **prevent first, integrate second, negotiate last** — and we make the
> last stage cheap because almost nothing reaches it."

[Camera: dashboard's three counters. Cursor traces each one.]

> VO: "On the dashboard you'll see three numbers. Conflicts prevented —
> claims that were refused because someone else already had the file.
> Total merges — tasks that landed cleanly through the speculative queue.
> And resolver runs — the residual stream. **That third number should
> stay small.** That's the whole pitch."

---

## 1:30–3:30 — The demo (two minutes, two terminals + dashboard)

[Camera: split — terminal right with the simulate harness, dashboard left.]

> VO: "Let's start four concurrent agents on the same trunk. Each one
> declares the files it intends to touch before it starts — and two of
> them declare the same file."

[Type in terminal: `npm run simulate`. Hit enter. The harness prints four
agent startup lines. The dashboard immediately shows one counter move.]

> VO: "Watch the trunk indicator stay green. The agents are claiming
> files. Two of them — Alpha and Bravo — picked the same file. The
> second one didn't fail; it went to the waitlist. That's stage one.
> The claim registry refused to grant an overlapping claim. Zero work
> was wasted."

[Wait for a "Claim queued" line. Point at the waitlist row in the dashboard.]

> VO: "Now Alpha commits and releases its claim. Bravo retries, gets
> granted, commits. Both tasks enter the merge queue. The queue runs
> at concurrency one — that's deliberate — and each task fetches trunk,
> fetches its own fork, does a real three-way merge with isomorphic-git,
> runs a test gate, and pushes trunk. Watch the **Total merges** counter."

[Wait for the counter to tick up. Each tick corresponds to a clean merge.]

> VO: "That's the **integrate** stage. The merge is real — three-way, not
> patch — and the test gate is a real assertion on the merged tree, not a
> coin flip."

[Cut to terminal showing the worker logs from `wrangler dev`.]

> VO: "Look at the worker log. 'Landed task-… on trunk' with a real commit
> SHA — not a `Math.random() > 0.1`. We tested it. Four
> cases in `scripts/test-merge.ts`: disjoint edits merge cleanly, same-file
> edits surface as conflicts, re-merging is a no-op, broken package.json
> fails the gate. They all pass."

[Cut back to dashboard. Counter at ~4 merges, 1 prevented.]

---

## 3:30–5:00 — The resolver beat (90s)

[Camera: dashboard. Point at the resolver-runs counter at 0.]

> VO: "Now the third stage. Most of the time the resolver doesn't run,
> because the scheduler did its job. But sometimes an agent does
> something the registry can't pre-filter — like claiming `src/index.js`
> and then writing to `src/auth.js`. We treat that as a footprint
> violation and route it to the LLM resolver."

[Click **Trigger resolver beat** on the dashboard — or `curl -X POST
http://127.0.0.1:8787/demo/conflict` from a terminal. The resolver counter
ticks up and an event-feed row appears naming the offending agent.]

> VO: "Notice: **prevent** said no in the registry, but **integrate** said
> 'trunk is fine, ship it', and only **negotiate** said 'this agent went
> outside its declared footprint'. The resolver gets scoped privileges
> — read by default, write only on approval — same shape as GitLab's Duo
> resolver. The point isn't to make the LLM clever. The point is to
> make sure almost nothing reaches it."

---

## 5:00–5:45 — Prior art + the gap we found

[Camera: README and DECISIONS.md open in a browser tab.]

> VO: "We didn't invent this from nothing. We studied four reference
> systems — OpenOrchestrator, OpenAgents, Weave, and GitLab Duo's
> resolver. Each one validates a different half of the thesis."

> VO: "OpenOrchestrator warns on overlapping worktrees but never enforces
> — no leases, no central authority. Weave does entity-level merge at
> the AST, but it's reactive at merge time, not preventive. OpenAgents
> coordinates agents conversationally but has no code ownership. GitLab's
> Duo is MR-centric and one conflict at a time. **None of them combine
> prevention + isolation + a speculative queue + a last-resort resolver
> in one system.** That gap is what Tributary fills. The reference
> research is in DECISIONS.md — we cite everything we used."

---

## 5:45–6:00 — Close

[Camera: dashboard, all three counters visible, trunk green.]

> VO: "Tributary is open source, MIT-licensed, runs on a Cloudflare
> account in three commands. The repo is in the submission form. The
> merge engine is real — `npm run test:merge` proves it. The dashboard
> is live. **Scheduling first. Negotiation last.**"

[Fade out on the dashboard. Title card: `github.com/...` and
`cloudflare.com/git-competition/`.]

---

## Backup / cuttable beats

If the demo runs short:

- **Show the claim registry HTTP API directly.** Curl `POST /registry/claim`
  with a known-overlapping file, show the waitlist.
- **Show the merge-engine harness on screen.** Run `npm run test:merge`
  once on camera — 15 seconds of green checks.
- **Walk through `src/index.ts`** for 30 seconds: the queue consumer is
  ~50 lines, point at the footprint-violation pre-filter, point at the
  merge call, point at the resolver fallback.

If the demo runs long (over 7 min):

- Cut the prior-art beat. Replace with a 15-second "we cited four
  systems in DECISIONS.md" card.

---

## Recording notes

- **Frame rate:** 30fps is fine. Don't go higher — no benefit on a
  static dashboard.
- **Audio:** record in a quiet room. Use a lav mic if available.
- **Captions:** Cloudflare's submission form may auto-generate captions,
  but a clean audio track saves the auto-captioner. Speak slightly
  slower than conversation.
- **No music.** This is a technical demo. Music makes it look like a
  launch trailer, which undersells the work.
- **Run-through:** do one full read-through before recording. The
  counter ticks drive the timing — if a counter is slow to tick,
  pause; don't fill the silence.
