import { describe, expect, it, vi } from "vitest";
import { RpcClient } from "../src/modes/rpc/rpc-client.ts";

interface RpcClientPrivate {
	send: (command: { type: string }) => Promise<unknown>;
}

describe("RpcClient video input", () => {
	it("includes videos in prompt commands", async () => {
		const client = new RpcClient();
		const privateClient = client as unknown as RpcClientPrivate;
		const send = vi.fn(async () => ({ type: "response", command: "prompt", success: true }));
		privateClient.send = send;
		const videos = [{ type: "video" as const, mimeType: "video/mp4", data: "AAAAIGZ0eXBpc29t" }];

		await client.prompt("Describe this video", undefined, videos);

		expect(send).toHaveBeenCalledWith({
			type: "prompt",
			message: "Describe this video",
			images: undefined,
			videos,
			streamingBehavior: undefined,
		});
	});

	it("includes videos in steer and follow-up commands", async () => {
		const client = new RpcClient();
		const privateClient = client as unknown as RpcClientPrivate;
		const send = vi.fn(async (command: { type: string }) => ({
			type: "response",
			command: command.type,
			success: true,
		}));
		privateClient.send = send;
		const videos = [{ type: "video" as const, mimeType: "video/webm", data: "GkXfo0AgQoaBAUL" }];

		await client.steer("Inspect this", undefined, videos);
		await client.followUp("Then summarize", undefined, videos);

		expect(send).toHaveBeenNthCalledWith(1, {
			type: "steer",
			message: "Inspect this",
			images: undefined,
			videos,
		});
		expect(send).toHaveBeenNthCalledWith(2, {
			type: "follow_up",
			message: "Then summarize",
			images: undefined,
			videos,
		});
	});
});
