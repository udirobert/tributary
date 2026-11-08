/**
 * Vultr Serverless Inference adapter — the primary AI binding in Node/Vultr
 * mode. Presents the same `ai.run(model, { messages })` surface the resolver
 * expects from Workers AI, backed by Vultr's OpenAI-compatible
 * `/chat/completions`. The requested model string (a Cloudflare model id) is
 * intentionally ignored in favour of VULTR_INFERENCE_MODEL.
 */
export function vultrInference() {
	const base = (
		process.env.VULTR_INFERENCE_URL ?? "https://api.vultrinference.com/v1"
	).replace(/\/$/, "");
	const key = process.env.VULTR_INFERENCE_API_KEY;
	if (!key) throw new Error("VULTR_INFERENCE_API_KEY is not set");
	const model = process.env.VULTR_INFERENCE_MODEL ?? "vultr/glm-5.3-flash";

	return {
		async run(
			_model: string,
			input: { messages: { role: string; content: string }[] },
		): Promise<{ response?: string }> {
			const res = await fetch(`${base}/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${key}`,
				},
				body: JSON.stringify({
					model,
					messages: input.messages,
					temperature: 0,
				}),
			});
			if (!res.ok) {
				throw new Error(`vultr inference ${res.status}: ${await res.text()}`);
			}
			const json = (await res.json()) as {
				choices?: { message?: { content?: string } }[];
			};
			return { response: json.choices?.[0]?.message?.content ?? "" };
		},
	};
}
