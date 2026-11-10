# Post-mortem — Vultr Agent Rush, Challenge 1

**Event:** Vultr: Agent Rush Hackathon, LabLab × Vultr, build 3–8 Nov 2026.
**Entry:** Tributary — Challenge 1, "Blast Radius Zero". Submitted 8 Nov.
**Result:** did not place. 1st Airlock, 2nd Follow the Money, 3rd Errand.

**Basis.** Inference from public artifacts: the three winners' READMEs, the
official challenge brief and judging criteria, and this repo. Not the judges'
scorecards. Everything here is a defensible reading of what was shipped, not a
claim about what any judge thought.

---

## The rubric

Four criteria, no published weights: **Application of Technology**,
**Presentation**, **Business Value**, **Originality**.

Challenge 1's framing, verbatim:

> Build a web-based agent that performs real work — writing and running code or
> operating a real browser — while every action stays inside an isolated sandbox
> running on Vultr.

> An agent that only chats is a demo; an agent that executes safely is a product.

Note the noun: _an agent that performs real work_. Not a platform on which
agents perform work.

---

## What the winners built

**1st — Airlock.** Executes a stranger's PR in twin gVisor sandboxes, returns a
deterministic verdict with receipts. The LLM never decides the verdict; a rule
table does. Headline: **19 cases, 18/19 expected verdicts (94.7%), zero false
"safe to merge"**, machine-collected from the live deployment. One documented
miss with its fix.

**2nd — Follow the Money.** AP incident response before the payment run. Pitch
contains $144,000: three invoices each under the $50k limit from three suppliers
sharing one bank account changed a week before the run. Seven agents, each with
a bounded role; code owns every consequential decision; closure requires six
code-run checks or a signed override. ~$0.08 per investigation.

**3rd — Errand.** A purchasing agent that works signed in and never sees the
password. The password exists in the microVM only as a placeholder token; the
runtime substitutes the real value outside the guest, bound to one host.
Containment eval: 5 attack vectors × 3 seeds, 15/15 vs 0/15 vs 3/3.

---

## Why we lost — six reasons

### 1. We built the substrate, not the agent

The brief's verb is _perform_. Airlock reviews a PR, Follow the Money
investigates fraud, Errand places an order. Tributary coordinates agents that
perform — and in our demo those agents were a simulation harness named Alpha and
Bravo.

This is the root cause. It cascades into the other five. On "Application of
Technology — how effectively the models are integrated," all three winners have
the model doing visible work. In Tributary the model is a planner and a
last-resort resolver. Our own architecture table calls the resolver "a last
resort, not the core path" — correct engineering, terrible hackathon answer,
because it means the model is deliberately marginal to the product.

### 2. The demo repo was a fixture

Our trunk was a seeded fixture with a `verify.cjs` we wrote. Airlock ran 19 real
PRs in 19 real repos. Follow the Money had 56 real PDFs and emails. Errand drove
real Medusa and WooCommerce stacks with real contract pricing behind a login.

"The repo's own verification command" is much less impressive when the repo is
ours and the command is one we authored.

### 3. No benchmark, no ground truth, no error rate

| Project          | What they measured                                           |
| ---------------- | ------------------------------------------------------------ |
| Airlock          | 19 cases, 18/19, 94.7%, 0 false safe-to-merge, 103 LLM calls |
| Errand           | 5 vectors × 3 seeds, 15/15 vs 0/15 vs 3/3                    |
| Follow the Money | 6 closure checks, 18 tests, $0.08 per investigation          |
| **Tributary**    | **171 attempts = 153 landed + 18 refused**                   |

Ours was a throughput counter. It said the pipeline ran; it did not say the
pipeline was _right_. Airlock's headline is a correctness number. Ours was a
volume number. Judges reward the first.

### 4. We buried our best containment evidence

The challenge is called "Blast Radius Zero"; its four focus areas are process
isolation, secret hygiene, resource limits, lifecycle discipline. We had real
containment — five hostile probes all contained with `EAI_AGAIN`, `EACCES`,
`EROFS` evidence — and led with merge scheduling instead. Airlock's entire
product _is_ the containment. We treated comparable evidence as a closing card.

Two of three winners also went a tier deeper on the sandbox: gVisor for Airlock,
microVMs with their own kernel for Errand. Plain Docker with caps dropped is
correct; it is not visibly a tier above.

### 5. The metaphor was a comprehension tax

- "Run the PR before you trust it."
- "Follow every dollar before it leaves."
- "Your agent works signed in. It never sees the password."
- "Many tributaries, one trunk."

Ours is evocative and says nothing about what work gets done or what danger is
prevented. To understand Tributary you must already care about merge conflicts
at agent scale, then absorb watershed / confluence / rapids. The river vocabulary
is applied consistently across dashboard, docs and log prefixes — real craft, and
a real cost.

### 6. We shipped internal docs, not judge docs

All three winners shipped a page whose only job is making judging cheap:
Airlock's `docs/EVIDENCE.md`, Errand's `JUDGES.md` + `CLAIMS.md`, Follow the
Money's decision memo and "Verified, not clicked."

We shipped `DECISIONS.md` (47KB of decision log) and `HANDOFF.md` (an internal
checklist addressed to ourselves). Both excellent, both for us.

Worse: the README carried a stale warning saying the Docker provider "was not
exercised on a Docker host," while `HANDOFF.md` correctly recorded it proven
publicly and `/config` reported `sandbox: "docker"`. Doc drift in the one
document judges read, underselling our strongest asset.

---

## Two structural costs

**Dual targets.** Two runtimes for one weekend — Cloudflare Workers and
Node/Vultr — plus a second hackathon entry kept alive. Every winner had one
target and one stack.

**Correct engineering, wrong audience.** Resolver as last resort: correct.
Whole-file resolution: fine for a fixture. In-process queue drain: correct for
one VM. These are staff-engineer choices. A judge scores the demo in front of
them, and "we deliberately made the AI marginal" does not read as sophistication
from the outside.

---

## What we changed as a result

Not intentions — shipped work, in this repo.

| Learning                                               | What was built                                                                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Write the eval before the demo                         | `eval/cases.yaml` (25 labelled cases) + `eval/runner.ts` + `eval_results/`. `npm run bench`. Headline is **false lands**, not throughput. |
| Lead with the axis the challenge names                 | Containment probes and the gate boundary are now first-class in `docs/JUDGES.md`, not a closing card.                                     |
| Ship a JUDGES.md                                       | `docs/JUDGES.md` — criteria → evidence → reproducing command.                                                                             |
| Rewrite "unverified" as "known limits and their fixes" | README's ⚠️ list replaced with a limits table, each with _closes with_.                                                                   |
| Lead with the danger, not the metaphor                 | README opens with the repositioned pitch and the measured number.                                                                         |
| Find the claim nobody else can make                    | The semantic gate is now measured: **4/4 conflicts git merged cleanly and Tributary refused**.                                            |

### The number we did not have before

```
npm run bench
→ 23/23 correct verdicts · 0 false lands · 2 skipped
→ 4/4 semantic conflicts: git said clean, Tributary said no
```

The last line is the repositioning. Airlock, Errand and Follow the Money each
handle one unit of work at a time. **A fleet of any of them merging into one repo
needs exactly what Tributary built** — and Airlock's own roadmap ("runs on every
PR") is a merge-queue problem arriving on schedule.

---

## What is still true and still worth keeping

The prior-art scan in `DECISIONS.md` is real work, and the scheduling-first
thesis is not what any of the three winners do. That remains the differentiated
position. It just needs to be argued as _the layer those products need at scale_
rather than as a competing containment story, where we are a tier behind on
sandbox tech and ahead on nothing visible.

### If this gets another run

1. Point the trunk at a real OSS repo with a real test suite; run the corpus
   against it. Fixture → real is the single biggest credibility delta.
2. Run `npm run bench` on a Docker host so the two containment cases score
   instead of skipping.
3. Make the containment lab the opening beat of the film, not the closing card.
4. One runtime. Pick Vultr.
5. Replace the pitch: "Airlock reviews one PR. Tributary lands a thousand of
   them without breaking the trunk."
