/* global document */
import { chromium } from "/Users/udingethe/Dev/grunds/node_modules/playwright/index.mjs";
const b = await chromium.launch({
	executablePath:
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
await p.goto("file:///tmp/deck/pdf-shell-img.html", {
	waitUntil: "networkidle",
});
for (const f of p.frames()) {
	try {
		await f.evaluate(() => document.fonts.ready);
	} catch {
		/* a sub-frame can detach before its fonts resolve; the wait below covers it */
	}
}
await p.waitForTimeout(2500);
await p.pdf({
	path: "tributary-deck-lite.pdf",
	width: "1000px",
	height: "562.5px",
	printBackground: true,
	preferCSSPageSize: true,
	margin: { top: 0, bottom: 0, left: 0, right: 0 },
});
await b.close();
console.log("pdf written");
