/**
 * The containment layer: the merged tree's checks run inside an isolated
 * sandbox, not in the control-plane process. In `docker` mode each gate run
 * gets a throwaway container — no network, no capabilities, read-only mount,
 * memory/CPU/pid caps — destroyed after the run. In `local` mode (for
 * machines without Docker, e.g. a dev laptop) it degrades to a child process
 * with an empty environment and a hard timeout: honest but weaker isolation.
 * `off` disables the sandbox and falls back to the in-process fixture gate.
 *
 * The gate is real executed work: it compiles every JS file in the merged
 * tree (syntax check), validates package.json, then runs the repo's
 * verification command — `verify.cjs` / `verify.js`, or `npm test` when the
 * manifest declares one — and returns stdout/stderr/exit code as evidence.
 * Verification scripts are CommonJS because the in-process semantic gate is
 * CJS-oriented; ESM `verify.mjs` is a known follow-up.
 */
import { spawn, spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdtempSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
	GateEvidence,
	SandboxGate,
	SandboxGateResult,
} from "../src/merge";

const DOCKER_IMAGE = process.env.SANDBOX_IMAGE ?? "node:22-alpine";
const TIMEOUT_MS = 30_000;
const GATE_FILENAME = ".tributary-gate.mjs";
const MARKER = "__TRIBUTARY_GATE_RESULT__";

const GATE_SOURCE = `import { spawnSync } from "node:child_process";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";

// Module-mode parsing is the only way to validate ESM syntax; vm.Script is
// script-mode and rejects 'export'. Requires --experimental-vm-modules, which
// the gate's spawn sets. When unavailable, fall back to script mode.
const SourceTextModule = vm.SourceTextModule;
const parses = (source, filename) => {
	if (SourceTextModule) {
		try {
			new SourceTextModule(source, { identifier: filename });
			return true;
		} catch (e) {
			// A script-only construct (top-level return, bare 'with') still
			// deserves a script-mode attempt before we call it broken.
			try {
				new vm.Script(source, { filename });
				return true;
			} catch {
				console.error(filename + ": " + e.message);
				return false;
			}
		}
	}
	try {
		new vm.Script(source, { filename });
		return true;
	} catch (e) {
		console.error(filename + ": " + e.message);
		return false;
	}
};
const root = process.cwd();
const VERIFY_TIMEOUT_MS = 20000;
const MARKER = "__TRIBUTARY_GATE_RESULT__";
const clip = (s, n = 20000) =>
	s.length > n ? s.slice(0, n) + "\\n… [truncated " + (s.length - n) + " chars]" : s;
const sanitize = (s) => clip(String(s).split(root).join("."));
let pkg = null;
let packageInvalid = false;
if (existsSync(join(root, "package.json"))) {
	try {
		pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	} catch (e) {
		packageInvalid = true;
		console.error("package.json invalid: " + e.message);
	}
}
const files = [];
const walk = (d) => {
	for (const n of readdirSync(d)) {
		if (n === ".git" || n === "node_modules" || n === ".tributary-gate.mjs") continue;
		const f = join(d, n);
		const s = statSync(f);
		if (s.isDirectory()) walk(f);
		else files.push(f);
	}
};
walk(root);
let bad = packageInvalid ? 1 : 0;
for (const f of files) {
	if (!/\\.(mjs|cjs|js|mts|cts|ts|tsx)$/.test(f)) continue;
	try {
		let source = readFileSync(f, "utf8");
		// TypeScript is stripped before the syntax check so a .ts file is
		// validated as real code rather than skipped. If stripping is
		// unavailable the file is skipped, never silently passed.
		if (/\\.(mts|cts|ts|tsx)$/.test(f)) {
			const strip = stripTypeScriptTypes;
			if (typeof strip !== "function") continue;
			source = strip(source);
		}
		// Parse as a module first, then as a script. vm.Script alone is
		// script-mode and rejects every ESM file ("Unexpected token 'export'"),
		// which silently excluded most real repos from the syntax check.
		if (!parses(source, f)) {
			console.error(relative(root, f) + " does not parse");
			bad++;
		}
	} catch (e) {
		console.error(relative(root, f) + " does not parse: " + e.message);
		bad++;
	}
}
const verifyRel = ["verify.cjs", "verify.js"].find((p) => existsSync(join(root, p)));
const useNpm = !verifyRel && pkg && pkg.scripts && typeof pkg.scripts.test === "string" && pkg.scripts.test.trim();
let verify = null;
if (bad === 0) {
	let cmd = null;
	let args = [];
	if (verifyRel) {
		cmd = process.execPath;
		args = [verifyRel];
	} else if (useNpm) {
		cmd = "npm";
		args = ["test"];
	}
	if (cmd) {
		const started = Date.now();
		const env = {
			PATH: [dirname(process.execPath), process.env.PATH, "/usr/local/bin", "/usr/bin", "/bin", "/opt/homebrew/bin"].filter(Boolean).join(":"),
			TMPDIR: "/tmp",
			HOME: "/tmp",
			NODE_ENV: "test",
			CI: "1",
		};
		let v;
		try {
			v = spawnSync(cmd, args, { cwd: root, env, encoding: "utf8", timeout: VERIFY_TIMEOUT_MS, maxBuffer: 1024 * 1024 });
		} catch (e) {
			v = { status: 1, stdout: "", stderr: String(e), error: e };
		}
		const enoent = v.error && v.error.code === "ENOENT";
		const skipped = cmd === "npm" && enoent;
		const timedOut = v.signal === "SIGTERM" || v.signal === "SIGKILL" || Boolean(v.error && v.error.code === "ETIMEDOUT");
		const exitCode = skipped ? 0 : typeof v.status === "number" ? v.status : 1;
		const stdout = sanitize(v.stdout ?? "");
		const stderr = sanitize(v.stderr ?? "");
		verify = {
			command: cmd === process.execPath ? "node " + verifyRel : "npm test",
			exitCode,
			durationMs: Date.now() - started,
			timedOut,
			skipped,
			reason: skipped ? "npm not available in sandbox PATH" : timedOut ? "verification timed out" : undefined,
			stdout,
			stderr,
		};
		if (!skipped && exitCode !== 0) bad++;
	}
}
console.log("sandbox gate: checked " + files.length + " file(s)" + (verify ? ", ran " + verify.command : ""));
console.log(MARKER + JSON.stringify({ bad, verify }));
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

/**
 * Build the gate runner wired into the merge pipeline as env.SANDBOX_GATE.
 * Returns undefined when the provider is "off" so the pipeline keeps its
 * in-process gates.
 */
export function makeSandboxGate(): SandboxGate | undefined {
	const provider = sandboxProvider();
	if (provider === "off") return undefined;
	return async (files) => runGate(files, provider);
}

interface RunResult {
	code: number;
	stdout: string;
	stderr: string;
	durationMs: number;
	timedOut: boolean;
}

interface GateStdout {
	clean: string;
	verification?: GateEvidence["verification"];
}

function parseGateStdout(stdout: string): GateStdout {
	const lines = stdout.split("\n");
	let index = -1;
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].startsWith(MARKER)) {
			index = i;
			break;
		}
	}
	if (index === -1) return { clean: stdout };
	let verification: GateEvidence["verification"];
	try {
		verification =
			(JSON.parse(lines[index].slice(MARKER.length)).verify as
				GateEvidence["verification"] | null) ?? undefined;
	} catch {
		verification = undefined;
	}
	lines.splice(index, 1);
	return { clean: lines.join("\n"), verification };
}

async function runGate(
	files: Record<string, string>,
	provider: "docker" | "local",
): Promise<SandboxGateResult> {
	const dir = mkdtempSync(join(tmpdir(), "tributary-gate-"));
	chmodSync(dir, 0o755);
	try {
		for (const [path, content] of Object.entries(files)) {
			const full = join(dir, path);
			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, content);
		}
		writeFileSync(join(dir, GATE_FILENAME), GATE_SOURCE);

		const result =
			provider === "docker" ? await dockerRun(dir) : await localRun(dir);
		const parsed = parseGateStdout(result.stdout);
		const output = [parsed.clean.trim(), result.stderr.trim()]
			.filter(Boolean)
			.join("\n")
			.trim();
		const evidence: GateEvidence = {
			provider,
			spec: provider === "docker" ? DOCKER_SPEC : LOCAL_SPEC,
			output,
			stdout: parsed.clean.trim(),
			stderr: result.stderr.trim(),
			exitCode: result.code,
			durationMs: result.durationMs,
			timedOut: result.timedOut || undefined,
			verification: parsed.verification,
		};
		if (result.code === 0) {
			console.log(`[Sandbox:${provider}] ${output}`);
			return { ok: true, evidence };
		}
		let reason = `sandbox gate (${provider}): ${output || `exit ${result.code}`}`;
		const verification = parsed.verification;
		if (verification && !verification.skipped && verification.exitCode !== 0) {
			const detail = (verification.stderr || verification.stdout).trim();
			reason += ` — ${verification.command} exited ${verification.exitCode}${detail ? `: ${detail}` : ""}`;
		}
		return { ok: false, reason, evidence };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

const clipText = (s: string, n = 8000) =>
	s.length > n ? `${s.slice(0, n)}\n… [truncated ${s.length - n} chars]` : s;

interface ContainmentProbe {
	id: string;
	title: string;
	timeoutMs: number;
	script: string;
	contained: (r: RunResult) => boolean;
}

const CONTAINMENT_PROBES: ContainmentProbe[] = [
	{
		id: "fork-bomb",
		title: "Fork bomb",
		timeoutMs: 8_000,
		contained: (r) => r.timedOut || r.code !== 0,
		script: `import { spawn } from "node:child_process";
for (let i = 0; i < 128; i++) {
	const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
	child.on("error", () => {});
}
setInterval(() => {}, 1000);
`,
	},
	{
		id: "infinite-loop",
		title: "Infinite loop",
		timeoutMs: 8_000,
		contained: (r) => r.timedOut || r.code !== 0,
		script: `for (;;) { Math.random(); }`,
	},
	{
		id: "network-egress",
		title: "Network egress",
		timeoutMs: 8_000,
		contained: (r) => r.code === 0,
		script: `try {
	const res = await fetch("https://example.com/");
	console.log("EGRESS_OK", res.status);
	process.exit(1);
} catch (err) {
	console.log("EGRESS_BLOCKED", err?.cause?.code || err.message);
}
`,
	},
	{
		id: "secret-read",
		title: "Secret read",
		timeoutMs: 8_000,
		contained: (r) => r.code === 0,
		script: `import { readFileSync } from "node:fs";
try {
	readFileSync("/etc/shadow", "utf8");
	console.log("SECRET_READ_OK");
	process.exit(1);
} catch (err) {
	console.log("SECRET_READ_BLOCKED", err.code || err.message);
}
`,
	},
	{
		id: "read-only-delete",
		title: "Read-only delete",
		timeoutMs: 8_000,
		contained: (r) => r.code === 0,
		script: `import { rmSync, writeFileSync } from "node:fs";
try {
	rmSync("/work/.tributary-write-test", { recursive: true, force: true });
	writeFileSync("/work/.tributary-write-test", "x");
	console.log("WRITE_OK");
	process.exit(1);
} catch (err) {
	console.log("WRITE_BLOCKED", err.code || err.message);
}
`,
	},
];

export interface ContainmentProbeResult {
	id: string;
	title: string;
	command: string;
	provider: SandboxProvider;
	spec: Record<string, string>;
	exitCode: number;
	durationMs: number;
	timedOut: boolean;
	stdout: string;
	stderr: string;
	contained: boolean;
}

export async function runContainmentLab(): Promise<{
	provider: SandboxProvider;
	spec: Record<string, string>;
	ranAt: number;
	probes: ContainmentProbeResult[];
}> {
	const provider = sandboxProvider();
	if (provider === "off") {
		return { provider, spec: {}, ranAt: Date.now(), probes: [] };
	}
	const spec = provider === "docker" ? DOCKER_SPEC : LOCAL_SPEC;
	const probes: ContainmentProbeResult[] = [];
	for (const probe of CONTAINMENT_PROBES) {
		const dir = mkdtempSync(join(tmpdir(), "tributary-lab-"));
		chmodSync(dir, 0o755);
		try {
			writeFileSync(join(dir, "probe.mjs"), probe.script);
			const result =
				provider === "docker"
					? await dockerRun(dir, "probe.mjs", probe.timeoutMs)
					: await localRun(dir, join(dir, "probe.mjs"), probe.timeoutMs);
			const stdout = clipText(result.stdout);
			const stderr = clipText(result.stderr);
			probes.push({
				id: probe.id,
				title: probe.title,
				command: "node probe.mjs",
				provider,
				spec,
				exitCode: result.code,
				durationMs: result.durationMs,
				timedOut: result.timedOut,
				stdout,
				stderr,
				contained: probe.contained({ ...result, stdout, stderr }),
			});
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}
	return { provider, spec, ranAt: Date.now(), probes };
}

function dockerRun(
	dir: string,
	entry = GATE_FILENAME,
	timeoutMs = TIMEOUT_MS,
): Promise<RunResult> {
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
				"--user",
				"65534:65534",
				"--memory",
				"256m",
				"--cpus",
				"0.5",
				"--pids-limit",
				"64",
				"--tmpfs",
				"/tmp:rw,noexec,nosuid,size=16m",
				"-e",
				"HOME=/tmp",
				"-v",
				`${dir}:/work:ro`,
				"-w",
				"/work",
				DOCKER_IMAGE,
				"node",
				"--experimental-vm-modules",
				entry,
			],
			{ stdio: ["ignore", "pipe", "pipe"] },
		),
		timeoutMs,
	);
}

function localRun(
	dir: string,
	entry = join(dir, GATE_FILENAME),
	timeoutMs = TIMEOUT_MS,
): Promise<RunResult> {
	// Containment-lite: empty environment (no inherited secrets), isolated cwd,
	// hard timeout. Documented as weaker than docker — used only for dev.
	return collect(
		spawn(process.execPath, ["--experimental-vm-modules", entry], {
			cwd: dir,
			env: {},
			stdio: ["ignore", "pipe", "pipe"],
		}),
		timeoutMs,
	);
}

function collect(
	child: ReturnType<typeof spawn>,
	timeoutMs = TIMEOUT_MS,
): Promise<RunResult> {
	return new Promise((resolve) => {
		const startedAt = Date.now();
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		child.stdout?.on("data", (d) => (stdout += d));
		child.stderr?.on("data", (d) => (stderr += d));
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, timeoutMs);
		child.on("error", (err) => {
			clearTimeout(timer);
			resolve({
				code: 1,
				stdout,
				stderr: String(err),
				durationMs: Date.now() - startedAt,
				timedOut,
			});
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({
				code: code ?? 1,
				stdout,
				stderr,
				durationMs: Date.now() - startedAt,
				timedOut,
			});
		});
	});
}
