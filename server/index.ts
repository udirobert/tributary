/**
 * Node/Vultr entry point — the primary deployment for the Agent Rush
 * hackathon. Runs the exact same Worker module (`src/index.ts`) as
 * `wrangler dev`, behind a plain node:http server, with all bindings shimmed
 * to Vultr-side implementations by server/env-node.ts.
 *
 * `cloudflare:workers` is a URL-scheme specifier Node cannot resolve, so a
 * registerHooks shim supplies the `DurableObject` base class. The hooks must
 * be registered before the Worker module's import graph is linked — which is
 * why everything below is a dynamic import inside main(), not a static
 * import at the top of this file.
 */
import { createServer } from "node:http";
import { registerHooks } from "node:module";
import { Readable } from "node:stream";
import { sandboxProvider } from "./sandbox";

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "cloudflare:workers") {
			return { url: "cloudflare:workers", shortCircuit: true } as never;
		}
		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		if (url === "cloudflare:workers") {
			return {
				format: "module",
				shortCircuit: true,
				source:
					"export class DurableObject {" +
					" constructor(ctx, env) { this.ctx = ctx; this.env = env; } }",
			} as never;
		}
		return nextLoad(url, context);
	},
});

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
	const mod = await import("../src/index");
	const worker = mod.default as {
		fetch(request: Request, env: unknown): Promise<Response>;
	};
	const { buildEnv } = await import("./env-node");
	const env = buildEnv(worker as never, {
		ClaimRegistry: mod.ClaimRegistry as never,
		LocalArtifacts: mod.LocalArtifacts as never,
	});

	console.log(
		`[Tributary] node/vultr mode — ` +
			`db=${process.env.TRIBUTARY_DB ?? ".tributary-state.db"} ` +
			`ai=${process.env.VULTR_INFERENCE_API_KEY ? `vultr (${process.env.VULTR_INFERENCE_MODEL ?? "vultr/glm-5.3-flash"})` : "off (fallback resolutions)"} ` +
			`sandbox=${sandboxProvider()}`,
	);

	const server = createServer(async (req, res) => {
		try {
			const chunks: Buffer[] = [];
			for await (const chunk of req) chunks.push(chunk as Buffer);
			const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

			const headers = new Headers();
			for (const [key, value] of Object.entries(req.headers)) {
				if (value === undefined) continue;
				headers.set(key, Array.isArray(value) ? value.join(", ") : value);
			}

			const method = req.method ?? "GET";
			const request = new Request(
				`http://${req.headers.host ?? "127.0.0.1"}${req.url}`,
				{
					method,
					headers,
					body: method === "GET" || method === "HEAD" ? undefined : body,
				},
			);

			const response = await worker.fetch(request, env);
			res.writeHead(response.status, Object.fromEntries(response.headers));
			if (response.body) {
				Readable.fromWeb(response.body as never).pipe(res);
			} else {
				res.end();
			}
		} catch (err) {
			console.error("[Server]", err);
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: String(err) }));
		}
	});

	server.listen(PORT, HOST, () => {
		console.log(`[Tributary] listening on http://${HOST}:${PORT}`);
	});
}

main().catch((err) => {
	console.error("[Tributary] fatal:", err);
	process.exit(1);
});
