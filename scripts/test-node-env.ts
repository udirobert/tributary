/**
 * Node/Vultr env regression harness.
 *
 * The in-process MERGE_QUEUE must preserve Cloudflare Queue semantics:
 * send() resolves once the message is accepted, while messages still drain
 * serially. This matters because the confluence sends resolver retries from
 * inside the queue handler — a send() that waits for processing deadlocks.
 */
import { buildEnv } from "../server/env-node";

process.env.TRIBUTARY_DB = ":memory:";
process.env.TRIBUTARY_SANDBOX = "off";

class DummyDurableObject {
	constructor(_ctx: unknown, _env: unknown) {}
}

interface QueueEnv {
	MERGE_QUEUE: { send(body: unknown): Promise<void> };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	const processed: string[] = [];
	const worker = {
		fetch: async () => new Response("ok"),
		queue: async (
			batch: { messages: { body: unknown }[] },
			env: unknown,
		): Promise<void> => {
			const body = batch.messages[0].body as string;
			processed.push(body);
			if (body === "first") {
				await (env as QueueEnv).MERGE_QUEUE.send("nested");
			}
		},
	};

	const env = buildEnv(worker, {
		ClaimRegistry: DummyDurableObject,
		LocalArtifacts: DummyDurableObject,
	});
	const queue = (env as QueueEnv).MERGE_QUEUE;

	await queue.send("first");

	const deadline = Date.now() + 2_000;
	while (!processed.includes("nested") && Date.now() < deadline) {
		await sleep(10);
	}

	const ok =
		processed[0] === "first" &&
		processed[1] === "nested" &&
		processed.length === 2;
	if (!ok) {
		console.error(
			`❌ node env queue test failed: ${JSON.stringify(processed)}`,
		);
		process.exit(1);
	}
	console.log(
		"✅ node env queue test passed (send resolves; drain stays serial)",
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
