import { describe, expect, it } from "vitest";
import { stream as streamMistral } from "../src/api/mistral-conversations.ts";
import type { Context, FetchFunction, Model } from "../src/types.ts";

function createSseResponse(events: unknown[]): Response {
	const body = `${events.map((event) => `data: ${JSON.stringify(event)}`).join("\r\n\r\n")}\r\n\r\ndata: [DONE]\r\n\r\n`;
	return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

function createTerminalEvent(finishReason = "stop") {
	return {
		id: "mistral-response-id",
		model: "mistral-large-latest",
		choices: [{ index: 0, finish_reason: finishReason, delta: {} }],
		usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
	};
}

const model: Model<"mistral-conversations"> = {
	id: "custom-video-model",
	name: "Custom video model",
	api: "mistral-conversations",
	provider: "mistral",
	baseUrl: "http://mistral.invalid",
	reasoning: false,
	input: ["text", "image", "video"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 32000,
	maxTokens: 4096,
};

describe("Mistral video fallback", () => {
	it("uses text placeholders instead of serializing videos as images", async () => {
		const context: Context = {
			messages: [
				{
					role: "user",
					content: [
						{ type: "video", data: "user-video", mimeType: "video/mp4" },
						{ type: "image", data: "image-data", mimeType: "image/png" },
					],
					timestamp: 1,
				},
				{
					role: "assistant",
					content: [{ type: "toolCall", id: "read-tool", name: "read", arguments: { path: "clip.mp4" } }],
					api: "mistral-conversations",
					provider: "mistral",
					model: model.id,
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "toolUse",
					timestamp: 2,
				},
				{
					role: "toolResult",
					toolCallId: "read-tool",
					toolName: "read",
					content: [{ type: "video", data: "tool-video", mimeType: "video/mp4" }],
					isError: false,
					timestamp: 3,
				},
			],
		};

		let capturedPayload: unknown;
		const fetch: FetchFunction = async () => createSseResponse([createTerminalEvent()]);

		await streamMistral(model, context, {
			apiKey: "test",
			fetch,
			onPayload: (payload) => {
				capturedPayload = payload;
				return payload;
			},
		}).result();

		expect(capturedPayload).toMatchObject({
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "(video omitted: Mistral serializer does not support videos)" },
						{ type: "image_url", imageUrl: "data:image/png;base64,image-data" },
					],
				},
				expect.objectContaining({ role: "assistant" }),
				{
					role: "tool",
					content: [
						{
							type: "text",
							text: "(video omitted: Mistral serializer does not support videos)",
						},
					],
				},
			],
		});
	});
});
