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
> merge queue, are merged with a real three-way merge, and are verified by
> executing the repo's own check inside an isolated Vultr Docker sandbox.
> Residual conflicts go to an LLM resolver as a last resort. The dashboard
> shows claims, waitlist, merge evidence, executed stdout/stderr/exit codes,
> sandbox verdicts, and resolution provenance live.

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
    `no-new-privileges`, unprivileged uid `65534`, memory/CPU/PID caps, and
    destruction after each run — then executes the repo's verification
    command (`verify.cjs`/`verify.js`, or `npm test`) and returns
    command/stdout/stderr/exit code as evidence.
  - `isomorphic-git` performs real three-way merges; task records carry commit,
    gate evidence, and resolution provenance.

- **Presentation**
  - Live dashboard: task composer, site-plan visualization, lifecycle statuses,
    gate badges, SSE updates, `?replay`.
  - Deterministic `/demo/pack`: clean land, same-line conflict → resolver →
    landed, and a db rewrite rejected by executed `node verify.cjs` with
    stdout/stderr/exit-code evidence.
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
- Vultr Serverless Inference: configured on `nuncio-vultr` via
  `/etc/tributary.env`; `/config` reports `vultr/glm-5.3-flash`.
- Sandbox boundary: Docker sibling containers on the same VM, unprivileged
  uid `65534`; never inside the app process. `POST /containment/lab` runs five
  hostile probes through the same boundary — all contained on Vultr.
- Public demo URL: `https://tributary.persidian.com` — Coolify Traefik
  dynamic route to the host service on `8788`; UFW allows `8788` only from
  `10.0.0.0/8` (Docker/Traefik), not the public internet.

## Demo beats for the video

Target: 60–90 seconds, product-style.

1. **Cold open on the dashboard** — "many agents, one trunk, zero blast
   radius."
2. **Dispatch the demo pack** — three tasks appear: clean, same-line conflict,
   verification-failing db rewrite.
3. **Watershed** — claims granted/queued; overlapping footprint waits instead
   of colliding.
4. **Confluence** — serial merges land with commit SHAs and gate evidence;
   open a landed task to show `node verify.cjs` stdout/exit code.
5. **Rapids** — same-line conflict reaches the resolver, retry lands green.
6. **Containment moment** — the db rewrite is rejected inside the disposable
   container when `verify.cjs` exits non-zero; trunk stays green; evidence
   shows provider, spec, command, stdout/stderr, exit code, duration. If time
   allows, hit `POST /containment/lab` to show fork bomb, infinite loop,
   egress, secret read, and read-only write all contained.
7. **Close** — "the agent that only chats is a demo; Tributary proves the
   merged result before it lands."

Before recording, `/config` must show `sandbox: "docker"` and
`ai.provider: "vultr"`. Do not demo the `local` fallback as if it were Docker.

## Gaps to close before submission

1. **Executed-work proof — done locally and on Vultr.** The Docker/local gate
   runs the merged tree's `verify.cjs`/`verify.js` (or `npm test`) inside the
   same sandbox and returns command/stdout/stderr/exit code as task evidence.
   Proven on `nuncio-vultr` with `sandbox: "docker"` and publicly at
   `https://tributary.persidian.com`; remaining: record demo.
2. **Demo repo fixture.** The trunk seed now carries `verify.cjs`; keep it
   small and intentional so "agents edit a repo that must stay green" is
   concrete for judges.
3. **Containment lab — done on Vultr.** `POST /containment/lab` runs five
   probes through the same Docker boundary; on `nuncio-vultr` all five are
   contained (fork bomb/infinite loop time out, egress `EAI_AGAIN`, secret
   read `EACCES`, read-only write `EROFS`).
4. **Explanation step.** After land/reject, have Vultr Inference summarize
   plan → edits → merge → sandbox output → verdict. This strengthens
   Application of Technology.
5. **Receipts.** Gate evidence exists; consider SHA-256 hashing the evidence
   bundle (plan, edits, gate output, container spec, commit SHA) for a
   judge-verifiable receipt.
6. **Deployed verification — done on-box and public.** `simulate`,
   `/demo/pack`, and `POST /containment/lab` ran on `nuncio-vultr` with Docker
   gates and Vultr Inference; `https://tributary.persidian.com/config`
   reports `sandbox: "docker"` + `ai.provider: "vultr"`. Remaining: record
   demo.

## Submission field copy

**Project title**

> Tributary — verified merge control for agent swarms

**Short description**

> Many agents, one trunk, zero blast radius. Tributary coordinates concurrent
> AI agents editing one repo: declared footprints prevent overlap, a serial
> speculative merge queue integrates real three-way merges, a disposable Vultr
> Docker sandbox executes the repo's verification command on the merged tree,
> and only residual conflicts reach an LLM resolver. The dashboard exposes
> claims, waitlist, merge evidence, executed stdout/stderr/exit codes,
> sandbox verdicts, and resolution provenance live.

**Architecture summary**

> A Node/Vultr control plane serves the same Worker module used by the
> Cloudflare alternate. `ClaimRegistry` stores claims/waitlist/tasks in SQLite;
> `LocalArtifacts` provides the git store; `MERGE_QUEUE` semantics are an
> in-process serial drain; `server/sandbox.ts` runs the gate in a throwaway
> container; `server/vultr-ai.ts` adapts Vultr Serverless Inference to the
> `ai.run()` surface.
