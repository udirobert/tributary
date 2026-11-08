# Tributary over MCP

`scripts/mcp.ts` exposes the Tributary coordination API as
[Model Context Protocol](https://modelcontextprotocol.io) tools over **stdio**,
so an MCP-capable agent can declare a footprint, commit to its task repo, and
watch a change land — without hand-rolling HTTP calls.

It is a **thin adapter over the HTTP API**: it holds no state of its own and
needs a Tributary worker running (`npm run dev`). Every tool call becomes one
HTTP request.

## Run it

```sh
npm run dev      # terminal 1 — the Cloudflare/Wrangler worker
# or: npm run dev:node  # same app under plain Node/Vultr mode
npm run mcp      # terminal 2 — the MCP server on stdio
```

The server adds no dependencies: the JSON-RPC 2.0 layer is implemented by hand
(one JSON object per line on stdin/stdout).

### Environment

| Variable           | Default                 | Meaning                  |
| ------------------ | ----------------------- | ------------------------ |
| `TRIBUTARY_WORKER` | `http://127.0.0.1:8787` | Worker base URL          |
| `TRIBUTARY_AGENT`  | `mcp-agent-<random>`    | Agent id used for claims |

### Client configuration

Most MCP clients take a command/args pair. For a stdio server:

```json
{
	"mcpServers": {
		"tributary": {
			"command": "npm",
			"args": ["run", "--silent", "mcp"],
			"env": {
				"TRIBUTARY_WORKER": "http://127.0.0.1:8787",
				"TRIBUTARY_AGENT": "my-agent"
			}
		}
	}
}
```

Or invoke it directly:

```json
{
	"mcpServers": {
		"tributary": { "command": "npx", "args": ["tsx", "scripts/mcp.ts"] }
	}
}
```

## Tools

### `tributary_claim`

Declare the files you intend to touch **before** working. Non-overlapping
footprints are granted immediately; overlapping ones are queued and promoted
automatically when the holder releases.

```json
{
	"name": "tributary_claim",
	"arguments": { "files": ["src/auth.ts", "src/db.ts"] }
}
```

Returns `{ "status": "granted" }`, or `{ "status": "queued", "conflictingAgent": "..." }`.

### `tributary_release`

Release the claim so a waitlisted agent can be promoted. Call it on success and
on failure.

```json
{ "name": "tributary_release", "arguments": {} }
```

### `tributary_status`

Registry snapshot: active claims, waitlist, trunk status, and the three
counters (total merges, conflicts prevented, resolver runs).

```json
{ "name": "tributary_status", "arguments": {} }
```

### `tributary_commit`

Commit file contents to a task repo and enqueue a speculative merge onto trunk.
Requires the `repoName` / `remote` / `token` returned when the task repo was
forked. The change only lands if a real three-way merge **and** the test gates
pass.

```json
{
	"name": "tributary_commit",
	"arguments": {
		"repoName": "task-my-agent",
		"remote": "https://…/git/default/task-my-agent.git",
		"token": "…",
		"files": ["src/auth.ts"],
		"changedFiles": ["src/auth.ts"],
		"edits": { "src/auth.ts": "export const login = () => {};\n" }
	}
}
```

### `tributary_conflict`

Trigger the resolver beat — simulates a footprint-violating task routed to the
LLM resolver of last resort. Handy for seeing stage 3 without orchestrating a
real two-agent conflict.

```json
{ "name": "tributary_conflict", "arguments": {} }
```

## Protocol surface

| Method                      | Behaviour                                                  |
| --------------------------- | ---------------------------------------------------------- |
| `initialize`                | Proposes protocol version `2024-11-05`, `tools` capability |
| `notifications/initialized` | Accepted, no reply                                         |
| `tools/list`                | Returns the five tools above                               |
| `tools/call`                | Executes a tool                                            |
| `ping`                      | Returns `{}`                                               |
| anything else               | JSON-RPC `-32601 Method not found`                         |

A tool that fails (bad argument, worker unreachable) returns a normal result
with `isError: true` and the message in the content — that is what the protocol
prescribes, and it keeps the calling agent in control.

## Limitations

- **Forking is not a tool yet.** `tributary_commit` needs the `repoName`,
  `remote`, and `token` that `POST /fork` returns; today you get those from the
  `tributary` CLI (`npm run tributary -- fork`) or the HTTP API. A
  `tributary_fork` tool is the obvious next addition.
- The server holds **one agent id per process** (`TRIBUTARY_AGENT`); every tool
  defaults to it.
- Diagnostics go to **stderr** — stdout is the protocol wire and carries
  nothing else.
