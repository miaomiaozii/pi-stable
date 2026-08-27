import type { Model } from "pi-stable-ai";
import { type LlamaModelInfo, llamaInferenceUrl } from "./client.ts";

export function createLlamaModel(model: LlamaModelInfo, serverUrl: string): Model<"openai-completions"> {
	const reportedContextWindow = model.meta?.n_ctx ?? model.meta?.n_ctx_train;
	const contextWindow = reportedContextWindow && reportedContextWindow > 0 ? reportedContextWindow : 128000;
	const input: Array<"text" | "image" | "video"> = ["text"];
	if (model.architecture?.input_modalities?.includes("image")) input.push("image");
	if (model.architecture?.input_modalities?.includes("video")) input.push("video");

	return {
		id: model.id,
		name: model.id,
		api: "openai-completions",
		provider: "llama.cpp",
		baseUrl: llamaInferenceUrl(serverUrl),
		reasoning: false,
		input,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow,
		maxTokens: contextWindow,
		compat: {
			supportsStore: false,
			supportsDeveloperRole: false,
			supportsReasoningEffort: false,
			supportsUsageInStreaming: true,
			supportsStrictMode: false,
			maxTokensField: "max_tokens",
		},
	};
}
