/**
 * The Message types require `content` to always be present, but untyped
 * callers (custom tools, hand-built histories, old session files) can violate
 * that contract. `transformMessages` is the choke point before every provider
 * request and is intentionally lax: it normalizes null/missing content to an
 * empty array (issues #6259, #6276).
 */

import { describe, expect, it } from "vitest";
import { transformMessages } from "../src/api/transform-messages.ts";
import type { Message, Model } from "../src/types.ts";

// Text-only model so unsupported media downgrade runs, which was the primary
// crash site for null tool result content.
function makeTextOnlyModel(): Model<"openai-completions"> {
	return {
		id: "test-model",
		name: "Test Model",
		api: "openai-completions",
		provider: "openai",
		baseUrl: "https://example.invalid/v1",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16000,
	};
}

describe("lax message content handling", () => {
	it("normalizes null/missing content to an empty array instead of crashing", () => {
		const messages = [
			{ role: "user", content: null, timestamp: Date.now() },
			{
				role: "assistant",
				content: null,
				api: "openai-completions",
				provider: "openai",
				model: "test-model",
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
			},
			{
				role: "toolResult",
				toolCallId: "call_1",
				toolName: "web_search",
				isError: false,
				timestamp: Date.now(),
			},
		] as unknown as Message[];

		const result = transformMessages(messages, makeTextOnlyModel());

		expect(result).toHaveLength(3);
		for (const msg of result) {
			expect(msg.content).toEqual([]);
		}
	});

	it("replaces videos with role-specific placeholders for text-only models", () => {
		const messages: Message[] = [
			{
				role: "user",
				content: [{ type: "video", data: "user-video", mimeType: "video/mp4" }],
				timestamp: 1,
			},
			{
				role: "toolResult",
				toolCallId: "read-1",
				toolName: "read",
				content: [{ type: "video", data: "tool-video", mimeType: "video/mp4" }],
				isError: false,
				timestamp: 2,
			},
		];

		const result = transformMessages(messages, makeTextOnlyModel());

		expect(result[0].content).toEqual([{ type: "text", text: "(video omitted: model does not support videos)" }]);
		expect(result[1].content).toEqual([
			{ type: "text", text: "(tool video omitted: model does not support videos)" },
		]);
	});
});
