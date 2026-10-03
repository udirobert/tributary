// typescript-eslint does not support the TS 7 compiler API yet
// (https://github.com/typescript-eslint/typescript-eslint/issues/10940).
// Give each of its packages a nested `typescript` that resolves to the
// official TypeScript 6 shim, per the TS 7 side-by-side docs.
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	symlinkSync,
	rmSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const shim = join(root, "node_modules", "@typescript", "typescript6");
const scopeDir = join(root, "node_modules", "@typescript-eslint");
const consumers = [
	"typescript-eslint",
	"ts-api-utils",
	...(existsSync(scopeDir)
		? readdirSync(scopeDir, { withFileTypes: true })
		: []
	)
		.filter((d) => d.isDirectory())
		.map((d) => join("@typescript-eslint", d.name)),
];

if (!existsSync(shim)) {
	console.error(
		"link-ts6: @typescript/typescript6 not installed; run npm install first.",
	);
	process.exit(1);
}

for (const pkg of consumers) {
	const pkgDir = join(root, "node_modules", pkg);
	if (!existsSync(pkgDir)) continue;
	const link = join(pkgDir, "node_modules", "typescript");
	mkdirSync(dirname(link), { recursive: true });
	if (lstatSync(link, { throwIfNoEntry: false })) {
		rmSync(link, { recursive: true, force: true });
	}
	symlinkSync(relative(dirname(link), shim), link, "dir");
	console.log(`link-ts6: ${pkg} -> @typescript/typescript6`);
}
