# Getting started

Tributary is a merge control plane for AI agents that edit the same repo. You
run it in front of your agents; it schedules their work, merges it serially, and
refuses anything that would break the trunk.

This page is the shortest path from zero to seeing it work on your own code.

---

## Before you start

- **Node 20 or newer.** Nothing else is required to try it.
- **Docker is optional but recommended.** Without it the sandbox gate degrades
  to a child process with an empty environment and a hard timeout. That is
  weaker: it has no network namespace, so it cannot block egress. The benchmark
  reports its containment cases as _skipped_, never passed, under that provider.
- **No cloud account.** The default config runs entirely offline.

---

## Try it in three commands

```sh
npm install
npm run dev:node     # the runtime, on http://127.0.0.1:8787
npm run simulate     # in a second terminal: 5 concurrent agents
```

Open <http://127.0.0.1:8787/>. You should see five agents claim files, one
overlapping claim get queued instead of colliding, and five merges pass through
the serial queue. `npm run simulate` exits non-zero if any of that did not
actually happen, so it is safe to run in CI.

---

## See what it catches

```sh
npm run bench
```

This runs 26 labelled cases through the real pipeline and writes
`eval_results/BENCHMARK-RESULTS.md`. The number to look at is **false lands**:
work that should have been refused but reached the trunk.

The interesting section is "Conflicts git cannot see". Those are cases where a
function signature changed in one file and a caller in another file was never
updated. `git merge` reports success, because the files never touch textually.
A plain merge queue lands them. Tributary refuses them.

---

## Run it against your own repo

The fastest path is `npm run audit` — it replays your repo's own history
through the real gates:

```sh
npm run audit -- /path/to/your/repo
npm run audit -- https://github.com/you/repo --commits 100 --export my-cases.yaml
```

It walks first-parent history, replays every merge through `git merge-tree`
(the same three-way result a real merge produces), scans commits for findings
they introduced versus their parent, and reports what the gate would have
done. The verdict vocabulary:

| Verdict             | Means                                                          |
| ------------------- | -------------------------------------------------------------- |
| `caught`            | git merged clean / commit landed; gate refuses on NEW findings |
| `resolver`          | git conflicted — routed to the resolver path                   |
| `land`/`clean`      | tree clean, no findings                                        |
| `blocked`/`carries` | no new findings, but tree carries REAL pre-existing ones       |
| `gate-limit`        | only parse findings — a file the gate cannot read              |
| `carried-limit`     | carries only pre-existing parse findings                       |

`--export` writes every caught item as a `cases.yaml` entry — your own
history becomes your regression corpus, replayable with
`npx tsx eval/runner.ts --cases my-cases.yaml`.

To write cases by hand instead, `eval/cases.yaml` is a list of cases, each
with a `trunk` (files before), a `task` (what the agent changed), and an
`expect` verdict:

```yaml
- id: my-case-01
  category: semantic_conflict
  title: What broke, in your words
  trunk:
    api.ts: "export function fetchUser(id: number) { return id; }\n"
    page.ts: "const u = () => fetchUser(42);\n"
  task:
    api.ts: "export function fetchUser(id: number, opts: object) { return id; }\n"
  expect: rejected
  expect_reason_contains: "fetchUser"
```

Replace the cases with conflicts you have actually hit, and the output stops
being a demo and becomes a measurement of your own repo. That is the intended
use: **"would Tributary have caught the merge that broke my build last week?"**

Verdict vocabulary:

| `expect`            | Means                                                   |
| ------------------- | ------------------------------------------------------- |
| `landed`            | clean merge, gate green, trunk advances                 |
| `conflict_resolved` | git conflicted, resolver supplied content, retry landed |
| `rejected`          | refused before or at the gate; trunk never moves        |
| `queued`            | watershed refused the claim; no merge attempted         |

---

## Drive it from an agent

Two surfaces, same lifecycle.

**CLI:**

```sh
npm run tributary -- claim src/auth.ts
npm run tributary -- status
npm run tributary -- run src/auth.ts src/db.ts
```

**MCP** (so an agent can call it natively):

```sh
npm run mcp     # claim / release / status / commit / conflict
```

The point of declaring a footprint before you start is that overlapping work
gets _queued_ rather than colliding. An agent that skips the claim step still
gets its work merged, but it loses the scheduling guarantee.

---

## Deploy it

`deploy/setup-vultr.sh` provisions a VM with Docker, Node 22, and a systemd
unit. `deploy/docker-compose.yml` runs the control plane as a container with the
host's Docker socket mounted so the gate can spawn sibling sandboxes.

Set `VULTR_INFERENCE_API_KEY` in `/etc/tributary.env` to enable the LLM planner
and the conflict resolver. Without it, planning falls back to supplied edits and
resolution falls back to deterministic yield-to-trunk. Both degrade cleanly.

Check `/config` after deploying. It reports which providers are actually live:

```json
{ "mode": "node/vultr", "sandbox": "docker", "ai": { "provider": "vultr" } }
```

If `sandbox` says `local`, your gate is not isolated and containment cases will
skip.

---

## Where to look next

| You want                          | Read                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| The architecture and the thesis   | [`README.md`](../README.md)                                                 |
| Why the semantic gate exists      | [`docs/JUDGES.md`](JUDGES.md) → "Conflicts git cannot see"                  |
| What is measured and what is not  | [`eval_results/BENCHMARK-RESULTS.md`](../eval_results/BENCHMARK-RESULTS.md) |
| Known limits and what closes them | [`README.md`](../README.md) → "Known limits"                                |
| Design decisions and prior art    | [`DECISIONS.md`](../DECISIONS.md)                                           |

---

## When it does not work

**`npm run simulate` says the worker is not running.** Start `npm run dev:node`
first, or point it at a running instance with `API_BASE=http://host:port`.

**`wrangler dev` refuses its storage.** Clear local state: `rm -rf .wrangler/state`.

**The gate rejects a file that looks fine.** The semantic gate parses every
scannable file; a file that does not parse fails the merge by design. Check the
gate evidence on the task record for the exact file and parser message.

**Containment cases are skipped.** You are on the `local` provider. Install
Docker, or set `TRIBUTARY_SANDBOX=docker` on a host that has it.
