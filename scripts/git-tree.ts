/**
 * Shared git plumbing for the offline tooling (audit, PR gate): enumerate and
 * materialize trees straight out of the object store, never touching a
 * workdir. Only files the gates can read are copied — see gateScannablePath.
 */
import { spawnSync } from "node:child_process";
import { basename } from "node:path";
import { MemoryFS } from "../src/memory-fs";
import { gateScannablePath } from "../src/merge";

const GIT_MAX = 512 * 1024 * 1024;

export function git(repo: string, ...args: string[]): string {
	const r = spawnSync("git", ["-C", repo, ...args], { maxBuffer: GIT_MAX });
	if (r.error) throw r.error;
	if (r.status !== 0) {
		throw new Error(
			`git ${args[0]} (${r.status}): ${r.stderr.toString("utf8").trim()}`,
		);
	}
	return r.stdout.toString("utf8");
}

/** merge-tree exits 1 on conflict — that is data, not an error. */
export function gitStatus(
	repo: string,
	...args: string[]
): { status: number; stdout: string; stderr: string } {
	const r = spawnSync("git", ["-C", repo, ...args], { maxBuffer: GIT_MAX });
	if (r.error) throw r.error;
	return {
		status: r.status ?? -1,
		stdout: r.stdout.toString("utf8"),
		stderr: r.stderr.toString("utf8"),
	};
}

/** Pathspec limiting scans to files the gate can actually see. */
export const SCAN_PATHSPEC = [
	"--",
	"*.js",
	"*.cjs",
	"*.mjs",
	"*.ts",
	"*.tsx",
	"*.mts",
	"*.cts",
	"package.json",
];

interface TreeEntry {
	oid: string;
	path: string;
}

/** `ls-tree -r -z` records: "<mode> <type> <oid>\t<path>\0". */
export function listTree(repo: string, treeish: string): TreeEntry[] {
	const out = git(repo, "ls-tree", "-r", "-z", treeish);
	const entries: TreeEntry[] = [];
	for (const rec of out.split("\0")) {
		if (!rec) continue;
		const tab = rec.indexOf("\t");
		const meta = rec.slice(0, tab).split(" ");
		if (meta[1] !== "blob") continue; // submodule commits, symlinks
		const path = rec.slice(tab + 1);
		if (!gateScannablePath(path) && basename(path) !== "package.json") continue;
		entries.push({ oid: meta[2], path });
	}
	return entries;
}

/**
 * Stream a set of blobs out of the object store in ONE process:
 * `cat-file --batch` emits "<oid> <type> <size>\n<bytes>\n" per request.
 */
export function readBlobs(repo: string, oids: string[]): Map<string, Buffer> {
	const result = new Map<string, Buffer>();
	if (!oids.length) return result;
	const r = spawnSync("git", ["-C", repo, "cat-file", "--batch"], {
		input: oids.join("\n") + "\n",
		maxBuffer: GIT_MAX,
	});
	if (r.error) throw r.error;
	const buf = r.stdout as Buffer;
	let pos = 0;
	while (pos < buf.length) {
		const eol = buf.indexOf(0x0a, pos);
		if (eol === -1) break;
		const header = buf.toString("utf8", pos, eol).split(" ");
		pos = eol + 1;
		if (header[1] !== "blob") {
			// "<oid> missing" or similar — skip the line, nothing follows.
			continue;
		}
		const size = parseInt(header[2], 10);
		result.set(header[0], buf.subarray(pos, pos + size));
		pos += size + 1; // content + trailing newline
	}
	return result;
}

/**
 * Materialize the scannable subtree of `treeish` into a fresh MemoryFS at
 * /tree. Only files the gates read are copied — .git history, node_modules
 * and binary assets never leave the object store, which keeps scans fast on
 * real repos.
 */
export async function materialize(
	repo: string,
	treeish: string,
): Promise<MemoryFS> {
	const fs = new MemoryFS();
	await fs.promises.mkdir("/tree", { recursive: true });
	const entries = listTree(repo, treeish);
	const blobs = readBlobs(
		repo,
		entries.map((e) => e.oid),
	);
	for (const e of entries) {
		const data = blobs.get(e.oid);
		if (data) await fs.promises.writeFile(`/tree/${e.path}`, data);
	}
	return fs;
}
