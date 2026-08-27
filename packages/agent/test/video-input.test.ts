import { describe, expect, it, vi } from "vitest";
import type { AssistantMessage, AssistantMessageEvent, Context, Model } from "../../ai/src/types.ts";
import { EventStream } from "../../ai/src/utils/event-stream.ts";
import { Agent } from "../src/agent.ts";
import type { StreamFn } from "../src/types.ts";

vi.mock("pi-stable-ai", async () => {
	const eventStream = await vi.importActual<typeof import("../../ai/src/utils/event-stream.ts")>(
		"../../ai/src/utils/event-stream.ts",
	);
	const validation = await vi.importActual<typeof import("../../ai/src/utils/validation.ts")>(
		"../../ai/src/utils/validation.ts",
	);
	return { EventStream: eventStream.EventStream, validateToolArguments: validation.validateToolArguments };
});

class MockAssistantStream extends EventStream<AssistantMessageEvent, AssistantMessage> {
	constructor() {
		super(
			(event) => event.type === "done" || event.type === "error",
			(event) => {
				if (event.type === "done") return event.message;
				if (event.type === "error") return event.error;
				throw new Error("Unexpected event type");
			},
		);
	}
}

const model: Model<"openai-completions"> = {
	id: "local-qwen",
	name: "Local Qwen",
	api: "openai-completions",
	provider: "local",
	baseUrl: "http://127.0.0.1:8080/v1",
	reasoning: false,
	input: ["text", "video"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 262144,
	maxTokens: 8192,
};

function createAssistantMessage(): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text: "done" }],
		api: "openai-completions",
		provider: "local",
		model: "local-qwen",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

describe("Agent video input", () => {
	it("preserves videos in the user message passed to the provider", async () => {
		let capturedContext: Context | undefined;
		const streamFn: StreamFn = (_model, context) => {
			capturedContext = context;
			const stream = new MockAssistantStream();
			queueMicrotask(() => {
				const message = createAssistantMessage();
				stream.push({ type: "done", reason: "stop", message });
			});
			return stream;
		};
		const agent = new Agent({
			initialState: { systemPrompt: "Test", model, tools: [] },
			streamFn,
		});

		await agent.prompt("Describe this video", undefined, [
			{ type: "video", mimeType: "video/mp4", data: "AAAAIGZ0eXBpc29t" },
		]);

		expect(capturedContext?.messages[0]).toMatchObject({
			role: "user",
			content: [
				{ type: "text", text: "Describe this video" },
				{ type: "video", mimeType: "video/mp4", data: "AAAAIGZ0eXBpc29t" },
			],
		});
	});
});
