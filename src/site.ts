/** Public site files and SEO/security helpers for the dashboard surface. */

export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Tributary"><rect width="64" height="64" fill="#22304a"/><rect x="25" y="12" width="14" height="41" fill="#f5efe2"/><rect x="12" y="22" width="40" height="14" fill="#f5efe2"/><circle cx="46" cy="17" r="6" fill="#c8402a"/><rect x="10" y="55" width="44" height="3" fill="#2c5f8a"/></svg>`;

// 64x64 RGBA PNG and ICO wrapper generated for the same mark.
const FAVICON_PNG_B64 =
	"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAuklEQVR42u3auw2DMBQFUGahjCgYgTpLZJ9MljlYIBU19IiPYyLEM6e4A9wjy3rWc1W3z/HOqQAAAAAAAAAAAAAAiJVP94gDMHz7rCyVXkvxAFvljyCEAEgpn4sAAMDFAX4pn4PgBAAAYA44pcw/slV+bXosCmCOkTI+FwuQ+n4AAAAAAAAAAAAAAABA/L1A2M0QAAAAAAAAAAAAAAAAAAAAAOB+AL7KlgDQvN6hAgCAOwAAAAAAAOxlAtTNDy1bwZz1AAAAAElFTkSuQmCC";
const FAVICON_ICO_B64 =
	"AAABAAEAQEAAAAEAIADzAAAAFgAAAIlQTkcNChoKAAAADUlIRFIAAABAAAAAQAgGAAAAqmlx3gAAALpJREFUeNrt2rsNgzAUBVBmoYwoGIE6S2SfTJY5WCAVNfSIj2MixDOnuAPcI8t61nNVt8/xzqkAAAAAAAAAAAAAAIiVT/eIAzB8+6wslV5L8QBb5Y8ghABIKZ+LAADAxQF+KZ+D4AQAAGAOOKXMP7JVfm16LApgjpEyPhcLkPp+AAAAAAAAAAAAAAAAQPy9QNjNEAAAAAAAAAAAAAAAAAAAAADgfgC+ypYA0LzeoQIAgDsAAAAAAADsZQLUzQ8tW8Gc9QAAAABJRU5ErkJggg==";

function b64ToBytes(b64: string): Uint8Array {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function asset(body: BodyInit, type: string): Response {
	return new Response(body, {
		headers: {
			"Content-Type": type,
			"Cache-Control": "public, max-age=3600",
		},
	});
}

/** `/robots.txt`, `/sitemap.xml`, favicon, and manifest responses. */
export function publicFileResponse(
	pathname: string,
	origin: string,
): Response | null {
	switch (pathname) {
		case "/favicon.svg":
			return asset(FAVICON_SVG, "image/svg+xml; charset=utf-8");
		case "/favicon.png":
			return asset(b64ToBytes(FAVICON_PNG_B64), "image/png");
		case "/favicon.ico":
			return asset(b64ToBytes(FAVICON_ICO_B64), "image/x-icon");
		case "/site.webmanifest":
			return asset(
				JSON.stringify({
					name: "Tributary",
					short_name: "Tributary",
					description:
						"Coordination and verification layer for many AI agents modifying one repository.",
					start_url: "/",
					display: "standalone",
					background_color: "#f5efe2",
					theme_color: "#22304a",
					icons: [
						{
							src: "/favicon.svg",
							sizes: "any",
							type: "image/svg+xml",
							purpose: "any",
						},
					],
				}),
				"application/manifest+json; charset=utf-8",
			);
		case "/robots.txt":
			return asset(
				[
					"User-agent: *",
					"Allow: /",
					"Disallow: /registry/",
					"Disallow: /tasks",
					"Disallow: /repos",
					"Disallow: /demo/",
					"Disallow: /containment/",
					"Disallow: /config",
					"Disallow: /import",
					"Disallow: /fork",
					"Disallow: /commit",
					`Sitemap: ${origin}/sitemap.xml`,
					"",
				].join("\n"),
				"text/plain; charset=utf-8",
			);
		case "/sitemap.xml":
			return asset(
				[
					'<?xml version="1.0" encoding="UTF-8"?>',
					'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
					"  <url>",
					`    <loc>${origin}/</loc>`,
					"    <changefreq>hourly</changefreq>",
					"    <priority>1.0</priority>",
					"  </url>",
					"</urlset>",
					"",
				].join("\n"),
				"application/xml; charset=utf-8",
			);
		default:
			return null;
	}
}
