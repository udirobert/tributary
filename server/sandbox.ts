/**
 * The containment layer: the merged tree's checks run inside an isolated
 * sandbox, not in the control-plane process. In `docker` mode each gate run
 * gets a throwaway container — no network, no capabilities, read-only mount,
 * memory/CPU/pid caps — destroyed after the run. In `local` mode (for
 * machines without Docker, e.g. a dev laptop) it degrades to a child process
 * with an empty environment and a hard timeout: honest but weaker isolation.
 * `off` disables the sandbox and falls back to the in-process fixture gate.
 *
 * The gate itself is real executed work: it compiles every JS file in the
 * merged tree (syntax check, nothing executed) and validates package.json —
 * the same checks the in-process gate performs, but running where an agent's
 * code can never reach the host, its secrets, or the network.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const DOCKER_IMAGE = process.env.SANDBOX_IMAGE ?? "node:22-alpine";
const TIMEOUT_MS = 30_000;

const GATE_SOURCE = `import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import vm from "node:vm";
const root = process.cwd();
const files = [];
const walk = (d) => {
	for (const n of readdirSync(d)) {
		if (n === ".git" || n === "node_modules" || n === "gate.mjs") continue;
		const f = join(d, n);
		const s = statSync(f);
		if (s.isDirectory()) walk(f);
		else files.push(f);
	}
};
walk(root);
let bad = 0;
for (const f of files) {
	if (!/\\.(mjs|cjs|js)$/.test(f)) continue;
	try {
		new vm.Script(readFileSync(f, "utf8"), { filename: f });
	} catch (e) {
		console.error(relative(root, f) + " does not parse: " + e.message);
		bad++;
	}
}
if (existsSync(join(root, "package.json"))) {
	try {
		JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	} catch (e) {
		console.error("package.json invalid: " + e.message);
		bad++;
	}
}
console.log("sandbox gate: checked " + files.length + " file(s)");
process.exit(bad ? 1 : 0);
`;

let dockerAvailable: boolean | null = null;
function hasDocker(): boolean {
	if (dockerAvailable === null) {
		dockerAvailable =
			spawnSync("docker", ["version"], { stdio: "ignore" }).status === 0;
	}
	return dockerAvailable;
}

export type SandboxProvider = "docker" | "local" | "off";

export function sandboxProvider(): SandboxProvider {
	const p = process.env.TRIBUTARY_SANDBOX;
	if (p === "docker" || p === "local" || p === "off") return p;
	return hasDocker() ? "docker" : "local";
}

/** The containment boundary, as displayed in the task's gate evidence. */
const DOCKER_SPEC: Record<string, string> = {
	isolation: "container",
	network: "none",
	filesystem: "read-only",
	capabilities: "none",
	privileges: "no-new-privileges",
	memory: "256 MB",
	cpu: "0.5",
	pids: "64",
	lifecycle: "destroyed after run",
};

const LOCAL_SPEC: Record<string, string> = {
	isolation: "child process",
	environment: "empty — no inherited secrets",
	workspace: "temp dir",
	timeout: `${TIMEOUT_MS / 1000}s`,
	note: "dev fallback — deploy with docker for real containment",
};

interface GateVerdict {
	ok: boolean;
	reason?: string;
	evidence: {
		provider: string;
		spec?: Record<string, string>;
		output: string;
		exitCode: number;
		durationMs: number;
	};
}

/**
 * Build the gate runner wired into the merge pipeline as env.SANDBOX_GATE.
 * Returns undefined when the provider is "off" so the pipeline keeps its
 * in-process gates.
 */
export function makeSandboxGate():
	((files: Record<string, string>) => Promise<GateVerdict>) | undefined {
	const provider = sandboxProvider();
	if (provider === "off") return undefined;
	return async (files) => runGate(files, provider);
}

interface RunResult {
	code: number;
	output: string;
	durationMs: number;
}

async function runGate(
	files: Record<string, string>,
	provider: "docker" | "local",
): Promise<GateVerdict> {
	const dir = mkdtempSync(join(tmpdir(), "tributary-gate-"));
	try {
		for (const [path, content] of Object.entries(files)) {
			const full = join(dir, path);
			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, content);
		}
		writeFileSync(join(dir, "gate.mjs"), GATE_SOURCE);

		const result =
			provider === "docker" ? await dockerRun(dir) : await localRun(dir);
		const output = result.output.trim();
		const evidence = {
			provider,
			spec: provider === "docker" ? DOCKER_SPEC : LOCAL_SPEC,
			output,
			exitCode: result.code,
			durationMs: result.durationMs,
		};
		if (result.code === 0) {
			console.log(`[Sandbox:${provider}] ${output}`);
			return { ok: true, evidence };
		}
		return {
			ok: false,
			reason: `sandbox gate (${provider}): ${output || `exit ${result.code}`}`,
			evidence,
		};
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function dockerRun(dir: string): Promise<RunResult> {
	return collect(
		spawn(
			"docker",
			[
				"run",
				"--rm",
				"--network",
				"none",
				"--read-only",
				"--cap-drop",
				"ALL",
				"--security-opt",
				"no-new-privileges",
				"--memory",
				"256m",
				"--cpus",
				"0.5",
				"--pids-limit",
				"64",
				"--tmpfs",
				"/tmp:rw,noexec,nosuid,size=16m",
				"-v",
				`${dir}:/work:ro`,
				"-w",
				"/work",
				DOCKER_IMAGE,
				"node",
				"gate.mjs",
			],
			{ stdio: ["ignore", "pipe", "pipe"] },
		),
	);
}

function localRun(dir: string): Promise<RunResult> {
	// Containment-lite: empty environment (no inherited secrets), isolated cwd,
	// hard timeout. Documented as weaker than docker — used only for dev.
	return collect(
		spawn(process.execPath, [join(dir, "gate.mjs")], {
			cwd: dir,
			env: {},
			stdio: ["ignore", "pipe", "pipe"],
		}),
	);
}

function collect(child: ReturnType<typeof spawn>): Promise<RunResult> {
	return new Promise((resolve) => {
		const startedAt = Date.now();
		let out = "";
		child.stdout?.on("data", (d) => (out += d));
		child.stderr?.on("data", (d) => (out += d));
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
		}, TIMEOUT_MS);
		child.on("error", (err) => {
			clearTimeout(timer);
			resolve({
				code: 1,
				output: String(err),
				durationMs: Date.now() - startedAt,
			});
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({
				code: code ?? 1,
				output: out,
				durationMs: Date.now() - startedAt,
			});
		});
	});
}
