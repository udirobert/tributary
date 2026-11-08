#!/usr/bin/env tsx
/**
 * tributary MCP server — Tributary over the Model Context Protocol.
 *
 * Exposes the coordination API as MCP tools over **stdio**, so any
 * MCP-capable agent can declare a footprint, commit to its task repo, and
 * watch a change land — without hand-rolling HTTP.
 *
 * Transport: JSON-RPC 2.0, one JSON object per line, on stdin/stdout.
 * stdout *is* the wire, so nothing but protocol messages may be written
 * there; diagnostics go to stderr.
 *
 * Run:   npm run mcp
 * Env:   TRIBUTARY_WORKER   worker base URL (default http://127.0.0.1:8787)
 *        TRIBUTARY_AGENT    agent id        (default mcp-agent-<random>)
 *
 * This is a thin adapter over the HTTP API and expects `npm run dev` to be
 * running. It adds no dependencies — the JSON-RPC layer is ~80 lines.
 *
 * Note: no top-level `await`. package.json sets "type": "commonjs", so tsx
 * emits this file as CJS, where top-level await is a syntax error. Same shape
 * as scripts/simulate.ts and scripts/tributary.ts.
 */

import * as readline from "node:readline";

const WORKER = process.env.TRIBUTARY_WORKER ?? "http://127.0.0.1:8787";
const AGENT_ID =
	process.env.TRIBUTARY_AGENT ??
	`mcp-agent-${Math.random().toString(36).slice(2, 8)}`;
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "tributary", version: "1.0.0" };

// ── HTTP client ───────────────────────────────────────────────────────────────

async function http(
	method: "GET" | "POST",
	path: string,
	body?: unknown,
): Promise<unknown> {
	const res = await fetch(`${WORKER}${path}`, {
		method,
		headers: body ? { "Content-Type": "application/json" } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	let parsed: unknown = text;
	try {
		parsed = JSON.parse(text);
	} catch {
		/* non-JSON body — hand back the raw text */
	}
	if (!res.ok) {
		throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text}`);
	}
	return parsed;
}

// ── argument helpers ─────────────────────────────────────────────────────────

function strArray(value: unknown, field: string): string[] {
	if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
		throw new Error(`"${field}" must be an array of strings`);
	}
	return value as string[];
}

function str(value: unknown, field: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`"${field}" must be a non-empty string`);
	}
	return value;
}

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function pretty(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

// ── tools ────────────────────────────────────────────────────────────────────

const TOOLS = [
	{
		name: "tributary_claim",
		description:
			"Declare the files you intend to touch BEFORE starting work. The claim " +
			"registry grants non-overlapping footprints immediately, queues " +
			"overlapping ones, and expires claims by TTL so a crashed agent never " +
			"holds a lock forever. Call this first; if the status comes back " +
			'"queued", release and retry later.',
		inputSchema: {
			type: "object",
			properties: {
				files: {
					type: "array",
					items: { type: "string" },
					description: "Repo-relative file paths you intend to touch.",
				},
				ttlSeconds: {
					type: "number",
					description: "Claim time-to-live in seconds (default 300).",
				},
				agentId: {
					type: "string",
					description: "Agent identity (default: this server's agent id).",
				},
			},
			required: ["files"],
		},
	},
	{
		name: "tributary_release",
		description:
			"Release this agent's claim so a waitlisted agent can be promoted " +
			"automatically. Always release when your task finishes or fails.",
		inputSchema: {
			type: "object",
			properties: {
				agentId: {
					type: "string",
					description: "Agent identity (default: this server's agent id).",
				},
			},
		},
	},
	{
		name: "tributary_status",
		description:
			"Read the registry snapshot: active claims, the waitlist, trunk " +
			"status and the three counters — total merges, conflicts prevented, " +
			"resolver runs. The last should stay small.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "tributary_commit",
		description:
			"Commit file contents to your task repo and enqueue a speculative " +
			"merge onto trunk. Supply the repoName/remote/token returned when the " +
			"task repo was forked. The change only lands if a real three-way merge " +
			"and the test gates pass.",
		inputSchema: {
			type: "object",
			properties: {
				repoName: { type: "string", description: "Task repo name." },
				remote: {
					type: "string",
					description: "Git remote for the task repo.",
				},
				token: { type: "string", description: "Scoped write token." },
				files: {
					type: "array",
					items: { type: "string" },
					description: "Declared footprint for this task.",
				},
				changedFiles: {
					type: "array",
					items: { type: "string" },
					description:
						"Files actually changed. Defaults to the declared footprint.",
				},
				edits: {
					type: "object",
					additionalProperties: { type: "string" },
					description: "Map of repo-relative path -> full new file content.",
				},
				agentId: {
					type: "string",
					description: "Agent identity (default: this server's agent id).",
				},
			},
			required: ["repoName", "remote", "token"],
		},
	},
	{
		name: "tributary_conflict",
		description:
			"Trigger the resolver beat: simulate a footprint-violating task that " +
			"is routed to the LLM resolver of last resort. Useful for seeing " +
			"stage 3 without orchestrating a real two-agent conflict.",
		inputSchema: { type: "object", properties: {} },
	},
];

// ── tool dispatch ────────────────────────────────────────────────────────────

async function callTool(
	name: string,
	args: Record<string, unknown>,
): Promise<string> {
	switch (name) {
		case "tributary_claim": {
			const agentId =
				typeof args.agentId === "string" ? args.agentId : AGENT_ID;
			const res = await http("POST", "/registry/claim", {
				agentId,
				files: strArray(args.files, "files"),
				ttlSeconds: typeof args.ttlSeconds === "number" ? args.ttlSeconds : 300,
			});
			return pretty(res);
		}
		case "tributary_release": {
			const agentId =
				typeof args.agentId === "string" ? args.agentId : AGENT_ID;
			return pretty(await http("POST", "/registry/release", { agentId }));
		}
		case "tributary_status":
			return pretty(await http("GET", "/registry/status"));
		case "tributary_commit": {
			const declared =
				args.files === undefined ? [] : strArray(args.files, "files");
			const changed =
				args.changedFiles === undefined
					? declared
					: strArray(args.changedFiles, "changedFiles");
			const res = await http("POST", "/commit", {
				repoName: str(args.repoName, "repoName"),
				remote: str(args.remote, "remote"),
				token: str(args.token, "token"),
				agentId: typeof args.agentId === "string" ? args.agentId : AGENT_ID,
				files: declared,
				changedFiles: changed,
				edits: record(args.edits),
			});
			return pretty(res);
		}
		case "tributary_conflict":
			return pretty(await http("POST", "/demo/conflict"));
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}

// ── JSON-RPC / MCP plumbing ──────────────────────────────────────────────────

type JsonRpcId = string | number | null;

function send(message: Record<string, unknown>) {
	process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id: JsonRpcId, result: unknown) {
	send({ jsonrpc: "2.0", id, result });
}

function sendError(id: JsonRpcId, code: number, message: string) {
	send({ jsonrpc: "2.0", id, error: { code, message } });
}

function log(...parts: unknown[]) {
	process.stderr.write(
		`[tributary-mcp] ${parts.map((p) => String(p)).join(" ")}\n`,
	);
}

async function handleMessage(raw: string): Promise<void> {
	let msg: Record<string, unknown>;
	try {
		msg = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		sendError(null, -32700, "Parse error: expected one JSON object per line");
		return;
	}

	const method = typeof msg.method === "string" ? msg.method : "";
	// A request carries an id; a notification does not (and gets no reply).
	const hasId = msg.id !== undefined && msg.id !== null;
	const id: JsonRpcId = hasId ? (msg.id as JsonRpcId) : null;
	const params = record(msg.params);

	if (!method) {
		if (hasId) sendError(id, -32600, "Invalid request: missing method");
		return;
	}

	try {
		switch (method) {
			case "initialize":
				sendResult(id, {
					protocolVersion: PROTOCOL_VERSION,
					capabilities: { tools: {} },
					serverInfo: SERVER_INFO,
				});
				break;

			case "notifications/initialized":
			case "notifications/cancelled":
				// Notifications: no response by design.
				break;

			case "ping":
				sendResult(id, {});
				break;

			case "tools/list":
				sendResult(id, { tools: TOOLS });
				break;

			case "tools/call": {
				const name = typeof params.name === "string" ? params.name : "";
				const args = record(params.arguments);
				try {
					const text = await callTool(name, args);
					sendResult(id, { content: [{ type: "text", text }] });
				} catch (err) {
					// A failed tool is a *successful* call that reports isError.
					sendResult(id, {
						content: [
							{
								type: "text",
								text: err instanceof Error ? err.message : String(err),
							},
						],
						isError: true,
					});
				}
				break;
			}

			default:
				if (hasId) sendError(id, -32601, `Method not found: ${method}`);
				else log(`ignoring notification for unknown method: ${method}`);
		}
	} catch (err) {
		if (hasId) {
			sendError(id, -32603, err instanceof Error ? err.message : String(err));
		} else {
			log("error handling notification:", err);
		}
	}
}

// ── entry point ──────────────────────────────────────────────────────────────

function main() {
	log(`serving MCP over stdio — worker ${WORKER}, agent ${AGENT_ID}`);

	const rl = readline.createInterface({
		input: process.stdin,
		crlfDelay: Infinity,
	});

	// Process messages strictly in order: JSON-RPC replies must not interleave.
	let chain: Promise<void> = Promise.resolve();
	rl.on("line", (line) => {
		const trimmed = line.trim();
		if (!trimmed) return;
		chain = chain.then(() => handleMessage(trimmed));
	});

	rl.on("close", () => {
		log("stdin closed — exiting");
	});
}

main();
