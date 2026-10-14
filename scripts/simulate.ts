/**
 * Tributary simulation harness.
 *
 * Drives N concurrent agents against a running `npm run dev` Worker:
 *
 *   1. claim   — declare a file footprint; overlapping claims are queued
 *   2. fork    — fork trunk into a task repo, mint a scoped write token
 *   3. commit  — write the declared files and enqueue a speculative merge
 *   4. release — drop the claim
 *
 * The footprints below deliberately overlap (Alpha and Bravo both touch
 * `src/index.js`) so the run always exercises stage 1 (a claim is refused and
 * queued) and produces at least one same-file change for the confluence to
 * reconcile. Every agent edits a file *inside* its declared footprint, so work
 * reaches the real merge engine instead of being filtered as a violation.
 *
 * Exits non-zero if the pipeline did not actually run, so `npm run simulate`
 * is a real check rather than a log dump.
 */

const API_BASE = "http://127.0.0.1:8787";

interface Task {
	agentId: string;
	footprint: string[];
	edit: { path: string; content: string };
}

const RENDER = "exports.render = (name) => `<h1>${name}</h1>`;\n";

// Alpha and Bravo both write the same line of src/index.js — the same-file
// conflict the resolver exists for. Charlie and Delta are disjoint. Echo is
// the semantic beat: it changes greet()'s signature while src/handlers.js on
// trunk calls it with one arg — textually clean for git, caught by the
// semantic gate.
const TASKS: Task[] = [
	{
		agentId: "Agent-Alpha",
		footprint: ["src/index.js", "src/auth.js"],
		edit: {
			path: "src/index.js",
			content: `${RENDER}exports.version = '3.1.10-alpha';\n`,
		},
	},
	{
		agentId: "Agent-Bravo",
		footprint: ["src/index.js"],
		edit: {
			path: "src/index.js",
			content: `${RENDER}exports.version = '3.1.10-bravo';\n`,
		},
	},
	{
		agentId: "Agent-Echo",
		footprint: ["src/greet.js"],
		edit: {
			path: "src/greet.js",
			content: "exports.greet = (name, greeting) => `${greeting}, ${name}!`;\n",
		},
	},
	{
		agentId: "Agent-Charlie",
		footprint: ["src/db.js"],
		edit: {
			path: "src/db.js",
			content:
				"exports.connect = () => ({ query: async () => [] });\nexports.poolSize = 4;\n",
		},
	},
	{
		agentId: "Agent-Delta",
		footprint: ["README.md", "package.json"],
		edit: {
			path: "README.md",
			content: "# ejs\n\nDocs updated by Agent-Delta.\n",
		},
	},
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path: string, init?: RequestInit): Promise<any> {
	const res = await fetch(`${API_BASE}${path}`, init);
	const text = await res.text();
	if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${text}`);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

const post = (path: string, body: unknown) =>
	api(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

async function runAgent(task: Task): Promise<boolean> {
	const { agentId, footprint, edit } = task;
	console.log(`[${agentId}] starting; footprint: ${footprint.join(", ")}`);

	// 1. Claim (retry while queued behind an overlapping claim).
	let claimed = false;
	for (let attempt = 1; attempt <= 15 && !claimed; attempt++) {
		const res = await post("/registry/claim", {
			agentId,
			files: footprint,
			ttlSeconds: 60,
		});
		if (res.status === "granted") {
			console.log(`[${agentId}] 🟢 claim granted`);
			claimed = true;
		} else {
			console.log(
				`[${agentId}] 🟡 claim queued (held by ${res.conflictingAgent}); retry ${attempt}`,
			);
			await delay(1000);
		}
	}
	if (!claimed) {
		console.error(`[${agentId}] 🔴 gave up waiting for a claim`);
		return false;
	}

	try {
		// 2. Fork trunk into a task repo.
		const fork = await post("/fork", { name: `task-${agentId}` });
		console.log(`[${agentId}] forked -> ${fork.name} (${fork.remote})`);

		await delay(300); // simulate thinking/work

		// 3. Commit the edit and enqueue the merge.
		const commit = await post("/commit", {
			repoName: fork.name,
			remote: fork.remote,
			token: fork.token,
			agentId,
			files: footprint,
			changedFiles: [edit.path],
			edits: { [edit.path]: edit.content },
		});
		console.log(
			`[${agentId}] committed ${edit.path} (${commit.commit?.slice(0, 8)}), queued for the confluence`,
		);
		return true;
	} finally {
		// 4. Always release the claim, even if a later step threw.
		await post("/registry/release", { agentId }).catch(() => undefined);
		console.log(`[${agentId}] 🏁 released claim`);
	}
}

/** Wait for the serial confluence to drain (each task increments totalMerges). */
async function waitForMerges(expected: number, timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	let status = await api("/registry/status");
	while (status.stats.totalMerges < expected && Date.now() < deadline) {
		await delay(500);
		status = await api("/registry/status");
	}
	return status;
}

async function main() {
	console.log("🌊 Tributary simulation harness 🌊\n");

	try {
		await fetch(API_BASE);
	} catch {
		console.error(
			`Worker is not running at ${API_BASE}. Start it with 'npm run dev' first.`,
		);
		process.exit(1);
	}

	console.log("initializing trunk…");
	const imported = await post("/import", {});
	console.log(
		`trunk ready via ${imported.provider} provider (seed ${String(imported.seed).slice(0, 8)})\n`,
	);

	// Stats persist in the Durable Object across runs, so every check below is
	// measured as a delta from this baseline — the harness is re-runnable.
	const before = await api("/registry/status");

	console.log(`spawning ${TASKS.length} concurrent agents…\n`);
	const results = await Promise.all(TASKS.map(runAgent));
	const granted = results.filter(Boolean).length;

	console.log("\nwaiting for the confluence to drain…");
	const status = await waitForMerges(before.stats.totalMerges + TASKS.length);

	const merges = status.stats.totalMerges - before.stats.totalMerges;
	const prevented =
		status.stats.conflictsPrevented - before.stats.conflictsPrevented;
	const resolver =
		status.stats.resolverInvocations - before.stats.resolverInvocations;
	console.log("\nfinal registry status:");
	console.log(JSON.stringify(status, null, 2));

	const failures: string[] = [];
	if (imported.provider !== "local" && imported.provider !== "artifacts") {
		failures.push("trunk import did not report a provider");
	}
	if (granted !== TASKS.length) {
		failures.push(`${granted}/${TASKS.length} agents obtained a claim`);
	}
	if (merges < TASKS.length) {
		failures.push(`merge queue processed ${merges}/${TASKS.length} tasks`);
	}
	if (prevented < 1) {
		failures.push("no overlapping claim was prevented (stage 1 not exercised)");
	}

	console.log("\nchecks:");
	console.log(
		`  ${granted === TASKS.length ? "✅" : "❌"} claims granted: ${granted}/${TASKS.length}`,
	);
	console.log(
		`  ${prevented >= 1 ? "✅" : "❌"} conflicts prevented this run: ${prevented}`,
	);
	console.log(
		`  ${merges >= TASKS.length ? "✅" : "❌"} merges processed this run: ${merges}/${TASKS.length}`,
	);
	console.log(
		`  ℹ️  resolver runs this run: ${resolver} (trunk ${status.stats.trunkStatus})`,
	);

	if (failures.length > 0) {
		console.error(`\n❌ simulation failed:\n  - ${failures.join("\n  - ")}`);
		process.exit(1);
	}
	console.log("\n✅ simulation complete");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
