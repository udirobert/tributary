#!/usr/bin/env tsx
/**
 * tributary — a minimal agent CLI for the Tributary coordination API.
 *
 * Lets a real coding agent (or a human) exercise the full claim → fork →
 * edit → push → release cycle against a running Tributary worker.
 *
 * Usage:
 *   npx tsx scripts/tributary.ts [options] <command> [args]
 *
 * Commands:
 *   claim   <files...>    Request a file-footprint claim
 *   release               Release the current agent's claim
 *   status                Print registry status (trunk, claims, waitlist)
 *   fork    [name]        Fork trunk into a task repo, print remote + token
 *   commit  <repo> <remote> <token> [files...]
 *                         Commit dummy edits to files and enqueue a merge
 *   conflict              Trigger the /demo/conflict resolver beat
 *   run     [files...]    Full end-to-end: claim → fork → commit → release
 *                         (orchestrates the above in one shot)
 *
 * Options:
 *   --agent  <id>    Agent identifier (default: cli-agent-<random>)
 *   --worker <url>   Worker base URL (default: http://127.0.0.1:8787)
 *   --ttl    <sec>   Claim TTL in seconds (default: 300)
 *   --help           Show this message
 *
 * Examples:
 *   # Claim two files, then release
 *   npx tsx scripts/tributary.ts claim src/auth.ts src/index.ts
 *   npx tsx scripts/tributary.ts release
 *
 *   # Full single-agent run on one file
 *   npx tsx scripts/tributary.ts run src/auth.ts
 *
 *   # Watch the dashboard while running
 *   open http://127.0.0.1:8787
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string, fallback: string): string {
	const i = args.indexOf(`--${name}`);
	if (i !== -1 && args[i + 1]) return args[i + 1];
	return fallback;
}

const WORKER = flag("worker", "http://127.0.0.1:8787");
const AGENT_ID = flag(
	"agent",
	`cli-agent-${Math.random().toString(36).slice(2, 8)}`,
);
const TTL = parseInt(flag("ttl", "300"), 10);

// Strip option flags from positional args
const positional = args.filter((a, i) => {
	if (a.startsWith("--")) return false;
	if (i > 0 && args[i - 1].startsWith("--")) return false;
	return true;
});
const [command, ...rest] = positional;

// ── helpers ───────────────────────────────────────────────────────────────────

async function post(path: string, body?: unknown): Promise<unknown> {
	const res = await fetch(`${WORKER}${path}`, {
		method: "POST",
		headers: body ? { "Content-Type": "application/json" } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

async function get(path: string): Promise<unknown> {
	const res = await fetch(`${WORKER}${path}`);
	return res.json();
}

function print(label: string, data: unknown) {
	console.log(`\n${label}`);
	console.log(JSON.stringify(data, null, 2));
}

function die(msg: string): never {
	console.error(`\nerror: ${msg}\n`);
	process.exit(1);
}

// ── state file (so release/run know the current agentId) ─────────────────────

const STATE_FILE = path.join(process.cwd(), ".tributary-state.json");

interface State {
	agentId: string;
	files?: string[];
	fork?: { name: string; remote: string; token: string };
}

function loadState(): State | null {
	try {
		return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
	} catch {
		return null;
	}
}

function saveState(s: State) {
	fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function clearState() {
	try {
		fs.unlinkSync(STATE_FILE);
	} catch {
		/* already gone */
	}
}

// ── commands ──────────────────────────────────────────────────────────────────

async function cmdClaim(files: string[]) {
	if (files.length === 0) die("claim requires at least one file path");
	print(
		`[tributary] Requesting claim for ${AGENT_ID} on: ${files.join(", ")}`,
		"",
	);
	const res = await post("/registry/claim", {
		agentId: AGENT_ID,
		files,
		ttlSeconds: TTL,
	});
	print("[tributary] Claim response:", res);
	saveState({ agentId: AGENT_ID, files });
	const r = res as { status?: string };
	if (r.status === "queued") {
		console.log(
			"\n⚠️  Your claim was queued (overlapping active claim)." +
				"\n   Run `release` when the blocking agent finishes, then retry.",
		);
		process.exit(2);
	}
	console.log("\n✅ Claim granted.");
}

async function cmdRelease() {
	const state = loadState();
	const agentId = state?.agentId ?? AGENT_ID;
	print(`[tributary] Releasing claim for ${agentId}`, "");
	const res = await post("/registry/release", { agentId });
	print("[tributary] Release response:", res);
	clearState();
	console.log("\n✅ Claim released.");
}

async function cmdStatus() {
	const res = await get("/registry/status");
	print("[tributary] Registry status:", res);
}

async function cmdFork(name?: string) {
	const taskName = name || `task-${AGENT_ID}-${Date.now()}`;
	print(`[tributary] Forking trunk into ${taskName}`, "");
	const res = (await post("/fork", { name: taskName })) as {
		name?: string;
		remote?: string;
		token?: string;
	};
	print("[tributary] Fork response:", res);
	const state = loadState() ?? { agentId: AGENT_ID };
	saveState({
		...state,
		fork: { name: taskName, remote: res.remote ?? "", token: res.token ?? "" },
	});
	console.log("\n✅ Fork created. Use `commit` to push changes.");
	return res;
}

async function cmdCommit(args: string[]) {
	// commit <repo> <remote> <token> [files...]
	const [repo, remote, token, ...files] = args;
	if (!repo || !remote || !token) {
		die("commit requires <repo> <remote> <token> [files...]");
	}
	const state = loadState();
	const declaredFiles = state?.files ?? files;
	const changedFiles = files.length > 0 ? files : declaredFiles;

	print(`[tributary] Committing ${changedFiles.join(", ")} to ${repo}`, "");
	const res = await post("/commit", {
		repoName: repo,
		remote,
		token,
		agentId: state?.agentId ?? AGENT_ID,
		files: declaredFiles,
		changedFiles,
	});
	print("[tributary] Commit + queue response:", res);
	console.log("\n✅ Changes committed and merge enqueued.");
}

async function cmdConflict() {
	print("[tributary] Triggering demo footprint-violation → resolver beat", "");
	const res = await post("/demo/conflict");
	print("[tributary] Conflict response:", res);
	console.log("\n✅ Resolver beat triggered — check the dashboard.");
}

async function cmdRun(files: string[]) {
	if (files.length === 0) {
		files = ["spike.txt"];
		console.log(
			`[tributary] No files specified — defaulting to ${files.join(", ")}`,
		);
	}
	console.log(
		`\n[tributary] Full run for ${AGENT_ID}: claim → fork → commit → release`,
	);
	console.log(`            Files: ${files.join(", ")}\n`);

	// 1. Claim
	const claim = (await post("/registry/claim", {
		agentId: AGENT_ID,
		files,
		ttlSeconds: TTL,
	})) as { status?: string; conflictingAgent?: string };
	console.log("1. Claim:", JSON.stringify(claim));
	if (claim.status === "queued") {
		console.log(
			`\n⚠️  Queued behind ${claim.conflictingAgent}. ` +
				`Retry after the blocking agent finishes.`,
		);
		saveState({ agentId: AGENT_ID, files });
		process.exit(2);
	}
	console.log("   ✅ Granted.");

	// 2. Fork
	const taskName = `task-${AGENT_ID}`;
	const fork = (await post("/fork", { name: taskName })) as {
		name?: string;
		remote?: string;
		token?: string;
	};
	console.log(
		"2. Fork:",
		JSON.stringify({ name: fork.name, remote: fork.remote }),
	);

	// 3. Commit
	const commit = await post("/commit", {
		repoName: fork.name ?? taskName,
		remote: fork.remote ?? "",
		token: fork.token ?? "",
		agentId: AGENT_ID,
		files,
		changedFiles: files,
	});
	console.log("3. Commit + queue:", JSON.stringify(commit));

	// 4. Release claim
	const release = await post("/registry/release", { agentId: AGENT_ID });
	console.log("4. Release:", JSON.stringify(release));

	clearState();
	console.log(
		`\n✅ Done. Watch the merge queue land your changes at ${WORKER}/`,
	);
}

function showHelp() {
	console.log(`
tributary — agent CLI for the Tributary coordination API

Usage: npx tsx scripts/tributary.ts [--agent <id>] [--worker <url>] [--ttl <sec>] <command>

Commands:
  claim   <files...>             Request a file-footprint claim
  release                        Release the current agent's claim
  status                         Print registry status
  fork    [name]                 Fork trunk into a task repo
  commit  <repo> <remote> <token> [files...]
                                 Commit dummy edits and enqueue a merge
  conflict                       Trigger /demo/conflict resolver beat
  run     [files...]             Full claim → fork → commit → release in one shot

Options:
  --agent  <id>   Agent identifier  (default: cli-agent-<random>)
  --worker <url>  Worker base URL   (default: http://127.0.0.1:8787)
  --ttl    <sec>  Claim TTL seconds (default: 300)
  --help          Show this message

Examples:
  npx tsx scripts/tributary.ts claim src/auth.ts src/index.ts
  npx tsx scripts/tributary.ts status
  npx tsx scripts/tributary.ts run src/auth.ts src/utils.ts
  npx tsx scripts/tributary.ts --agent my-bot run src/parser.ts
`);
}

// ── dispatch ──────────────────────────────────────────────────────────────────

if (!command || command === "--help" || command === "help") {
	showHelp();
} else if (command === "claim") {
	await cmdClaim(rest);
} else if (command === "release") {
	await cmdRelease();
} else if (command === "status") {
	await cmdStatus();
} else if (command === "fork") {
	await cmdFork(rest[0]);
} else if (command === "commit") {
	await cmdCommit(rest);
} else if (command === "conflict") {
	await cmdConflict();
} else if (command === "run") {
	await cmdRun(rest);
} else {
	console.error(`Unknown command: ${command}`);
	showHelp();
	process.exit(1);
}
