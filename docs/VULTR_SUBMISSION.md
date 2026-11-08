# Vultr Agent Rush submission guide

Use this for Challenge 1 — **Blast Radius Zero**. The Cloudflare-specific
writeup remains in `docs/SUBMISSION.md`; this file carries the current
positioning after the Nov 8 research pass.

## Positioning

**Project title**

> Tributary — verified merge control for agent swarms

**One-line pitch**

> Many agents, one trunk, zero blast radius. Tributary schedules conflicting
> agent work before it starts, integrates changes serially, and proves the
> merged tree in a disposable Vultr sandbox.

**Short description**

> Tributary is a coordination layer for many AI agents editing one codebase.
> Agents declare file footprints before working; overlapping work is queued
> instead of wasting agent effort. Finished changes enter a serial speculative
> merge queue, are merged with a real three-way merge, checked in an isolated
> Vultr Docker sandbox, and only land when green. Residual conflicts go to an
> LLM resolver as a last resort. The dashboard shows claims, waitlist, merge
> evidence, sandbox verdicts, and resolution provenance live.

## Why this is the differentiated angle

The current field is crowded with single-run containment products: generate
code, run it in Docker/gVisor, return a receipt. Tributary's whitespace is
**fleet-level coordination**:

- Most sandbox demos contain one execution.
- Tributary contains the whole editing swarm: claims, waitlists, fork/commit,
  serial merges, sandbox verification, resolver-last-resort, and audit evidence.
- The thesis is explicit: **conflicts are a scheduling problem first and a
  negotiation problem last.**

Relevant prior art already logged in `DECISIONS.md`: OpenOrchestrator warns
but does not enforce; Weave resolves semantic conflicts reactively; OpenAgents
coordinates conversationally; GitLab Duo is MR-centric; CodeRabbit/Mergify are
PR-queue tools. None combine preventive claims + isolated task repos + a
serial speculative merge queue + sandbox-verified trunk landing.

Field notes from the Nov 8 research pass:

- Official challenge/rubric: [Vultr Community event](https://community.vultr.com/e/vultr-agent-rush-hackathon), [LabLab × Vultr](https://lablab.build/ai-hackathons/vultr-hackathon).
- Crowded single-run containment examples: [Blast Radius Zero sandboxed agent runtime](https://lablab.ai/submissions/fpkx26f79t6ggmngmednm1b0), [BlastRadius Zero Sandbox Gatekeeper](https://lablab.ai/submissions/xp7qgwcfdbnqnhwugn9mkh), [Prove-It Analyst](https://lablab.ai/submissions/wdrkwjkl7gxp2dqo0bdvcit9), [YAI Guard](https://lablab.ai/ai-hackathons/vultr-hackathon/yai-guard/yai-guard-prove-it-code-runner), [SRE Incident Agent](https://lablab.ai/submissions/bv5arkegpw2w2jzn92llm2o6).
- Takeaway: receipts, containment labs, and executed output are table stakes; multi-agent merge scheduling is the open lane.

## Rubric mapping

- **Application of Technology**
  - Vultr Compute VM runs the Node/Vultr control plane (`server/index.ts`).
  - Vultr Serverless Inference powers planning/resolution through
    `server/vultr-ai.ts` when `VULTR_INFERENCE_API_KEY` is configured.
  - Docker sandbox gate (`server/sandbox.ts`) runs merged-tree checks with
    `--network none`, read-only mount, dropped capabilities,
    `no-new-privileges`, memory/CPU/PID caps, and destruction after each run.
  - `isomorphic-git` performs real three-way merges; task records carry commit,
    gate evidence, and resolution provenance.

- **Presentation**
  - Live dashboard: task composer, task cards, lifecycle statuses, gate
    badges, river visualization, SSE updates, `?replay`.
  - Deterministic `/demo/pack`: clean land, same-line conflict → resolver →
    landed, broken code rejected by the sandbox gate.
  - Video should show the containment moment and the evidence panel, not just
    merge internals.

- **Business Value**
  - Real pain: teams running multiple coding agents on one repo hit overlapping
    edits, merge conflicts, and unverifiable "it works" claims.
  - Tributary reduces wasted agent compute, prevents broken trunk landings,
    serializes integration, and produces auditable merge evidence.

- **Originality**
  - "Scheduling first, negotiation last" is a different frame from single-run
    sandbox products.
  - The resolver is deliberately last-resort; the dashboard counters make the
    residual stream visible.

## Required stack check

- Vultr VM backend: `deploy/setup-vultr.sh` / `deploy/docker-compose.yml`.
- Vultr Serverless Inference: `VULTR_INFERENCE_API_KEY` +
  `VULTR_INFERENCE_MODEL` in `/etc/tributary.env`.
- Sandbox boundary: Docker sibling containers on the same VM; never inside the
  app process.
- Public demo URL: point DNS/Caddy/nginx at the VM's :8787.

## Demo beats for the video

Target: 60–90 seconds, product-style.

1. **Cold open on the dashboard** — "many agents, one trunk, zero blast
   radius."
2. **Dispatch the demo pack** — three tasks appear: clean, same-line conflict,
   broken code.
3. **Watershed** — claims granted/queued; overlapping footprint waits instead
   of colliding.
4. **Confluence** — serial merges land with commit SHAs and gate evidence.
5. **Rapids** — same-line conflict reaches the resolver, retry lands green.
6. **Containment moment** — broken/hostile code is rejected inside the
   disposable container; trunk stays green; evidence shows provider, spec,
   output, exit code, duration.
7. **Close** — "the agent that only chats is a demo; Tributary proves the
   merged result before it lands."

Before recording, `/config` must show `sandbox: "docker"` and
`ai.provider: "vultr"`. Do not demo the `local` fallback as if it were Docker.

## Gaps to close before submission

1. **Executed-work proof.** The current Docker gate compiles/checks the merged
   tree; Challenge 1 wants real executed output. Add a verification command
   inside the same container — repo tests or `verify.mjs` — and return
   stdout/stderr/exit code as product evidence.
2. **Demo repo fixture.** Use a small repo with intentional bugs/tests so
   "agents fix the repo" is concrete and repeatable.
3. **Containment lab.** Add probes through the same sandbox path: fork bomb,
   infinite loop, network egress attempt, secret read, `rm -rf` on read-only
   fs. Show what the kernel/Docker did.
4. **Explanation step.** After land/reject, have Vultr Inference summarize
   plan → edits → merge → sandbox output → verdict. This strengthens
   Application of Technology.
5. **Receipts.** Gate evidence exists; consider SHA-256 hashing the evidence
   bundle (plan, edits, gate output, container spec, commit SHA) for a
   judge-verifiable receipt.
6. **Deployed verification.** Run `simulate` and `/demo/pack` against the
   public Vultr URL before recording.

## Submission field copy

**Project title**

> Tributary — verified merge control for agent swarms

**Short description**

> Many agents, one trunk, zero blast radius. Tributary coordinates concurrent
> AI agents editing one repo: declared footprints prevent overlap, a serial
> speculative merge queue integrates real three-way merges, a disposable Vultr
> Docker sandbox verifies the merged tree, and only residual conflicts reach
> an LLM resolver. The dashboard exposes claims, waitlist, merge evidence,
> sandbox verdicts, and resolution provenance live.

**Architecture summary**

> A Node/Vultr control plane serves the same Worker module used by the
> Cloudflare alternate. `ClaimRegistry` stores claims/waitlist/tasks in SQLite;
> `LocalArtifacts` provides the git store; `MERGE_QUEUE` semantics are an
> in-process serial drain; `server/sandbox.ts` runs the gate in a throwaway
> container; `server/vultr-ai.ts` adapts Vultr Serverless Inference to the
> `ai.run()` surface.
