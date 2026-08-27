import { describe, expect, it } from "vitest";
import { createLlamaModel } from "../src/extensions/llama/model.ts";

describe("llama.cpp video capability", () => {
	it("preserves image and video input modalities from the router catalog", () => {
		const model = createLlamaModel(
			{
				id: "qwen-video",
				status: { value: "loaded" },
				architecture: { input_modalities: ["text", "image", "video"] },
				meta: { n_ctx: 65536, n_ctx_train: 131072 },
			},
			"http://127.0.0.1:8080",
		);

		expect(model).toEqual(
			expect.objectContaining({
				id: "qwen-video",
				provider: "llama.cpp",
				baseUrl: "http://127.0.0.1:8080/v1",
				input: ["text", "image", "video"],
				contextWindow: 65536,
				maxTokens: 65536,
			}),
		);
	});
});
