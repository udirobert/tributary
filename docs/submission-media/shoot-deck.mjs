/* global document */
import { chromium } from "/Users/udingethe/Dev/grunds/node_modules/playwright/index.mjs";
import fs from "node:fs";

const dir = "/tmp/deck";
const out = `${dir}/png`;
fs.mkdirSync(out, { recursive: true });

const files = process.argv.slice(2).length
	? process.argv.slice(2)
	: fs
			.readdirSync(dir)
			.filter((f) => /^s\d+\.html$/.test(f))
			.sort();
const b = await chromium.launch({
	executablePath:
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const p = await b.newPage({
	viewport: { width: 1920, height: 1080 },
	deviceScaleFactor: 1,
});
for (const f of files) {
	const errs = [];
	p.on("pageerror", (e) => errs.push(String(e)));
	await p.goto(`file://${dir}/${f}`, { waitUntil: "networkidle" });
	await p.evaluate(() => document.fonts.ready);
	await p.waitForTimeout(700);
	const m = await p.evaluate(() => {
		const bad = [];
		document.querySelectorAll("body *").forEach((el) => {
			const r = el.getBoundingClientRect();
			if (r.right > 1921 || r.bottom > 1081 || r.left < -1 || r.top < -1)
				bad.push(
					`${el.className || el.tagName} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`,
				);
		});
		return {
			scroll: [
				document.documentElement.scrollWidth,
				document.documentElement.scrollHeight,
			],
			overflow: bad.slice(0, 6),
		};
	});
	await p.screenshot({ path: `${out}/${f.replace(".html", "")}.png` });
	console.log(f, JSON.stringify(m), errs.length ? `ERRORS ${errs}` : "");
}
await b.close();
