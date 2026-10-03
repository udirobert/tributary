const API_BASE = "http://127.0.0.1:8787";

const FILES = [
	"src/index.js",
	"src/auth.js",
	"src/db.js",
	"package.json",
	"README.md",
];

function randomChoice(arr: any[]) {
	return arr[Math.floor(Math.random() * arr.length)];
}

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAgent(agentId: string) {
	console.log(`[${agentId}] Starting task...`);

	// 1. Pick a random footprint of 1-2 files
	const footprint = [randomChoice(FILES)];
	if (Math.random() > 0.5) footprint.push(randomChoice(FILES));

	console.log(`[${agentId}] Requesting claim for: ${footprint.join(", ")}`);
	let claimed = false;

	// 2. Request claim (retry if queued to simulate wait)
	for (let i = 0; i < 5; i++) {
		const claimRes = (await fetch(`${API_BASE}/registry/claim`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentId, files: footprint, ttlSeconds: 30 }),
		}).then((res) => res.json())) as any;

		if (claimRes.status === "granted") {
			console.log(`[${agentId}] 🟢 Claim granted!`);
			claimed = true;
			break;
		} else {
			console.log(
				`[${agentId}] 🟡 Claim queued (conflict with ${claimRes.conflictingAgent}). Retrying in 2s...`,
			);
			await delay(2000);
		}
	}

	if (!claimed) {
		console.log(`[${agentId}] 🔴 Gave up waiting for claim.`);
		return;
	}

	// 3. Fork task repo
	console.log(`[${agentId}] Forking repo...`);
	const forkRes = (await fetch(`${API_BASE}/fork`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: `task-${agentId}` }),
	}).then((res) => res.json())) as any;

	console.log(
		`[${agentId}] Forked to ${forkRes.remote}. Working on changes...`,
	);
	await delay(1500); // Simulate work

	// 4. Commit and push to task repo (triggers merge queue)
	console.log(`[${agentId}] Committing changes...`);
	await fetch(`${API_BASE}/commit`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			repoName: forkRes.name,
			remote: forkRes.remote,
			token: forkRes.token,
		}),
	}).then((res) => res.json());

	console.log(`[${agentId}] Changes committed. Merge queued!`);

	// 5. Release claim
	await fetch(`${API_BASE}/registry/release`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId }),
	});
	console.log(`[${agentId}] 🏁 Released claim. Task complete.`);
}

async function main() {
	console.log("🌊 Tributary Simulation Harness 🌊\n");

	try {
		await fetch(API_BASE);
	} catch {
		console.error(
			"Worker is not running. Please start it with 'npm run dev' first.",
		);
		process.exit(1);
	}

	console.log("Initializing trunk repo...");
	await fetch(`${API_BASE}/import`, { method: "POST" });
	console.log("Trunk initialized.\n");

	const agents = ["Agent-Alpha", "Agent-Bravo", "Agent-Charlie", "Agent-Delta"];
	console.log(`Spawning ${agents.length} agents...\n`);

	await Promise.all(agents.map(runAgent));

	console.log("\nSimulation finished. Checking registry status...");
	const status = await fetch(`${API_BASE}/registry/status`).then((res) =>
		res.json(),
	);
	console.log(status);
}

main().catch(console.error);
