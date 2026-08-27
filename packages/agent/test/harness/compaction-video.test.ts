import type { AgentMessage } from "pi-stable-agent-core";
import { describe, expect, it } from "vitest";
import { estimateTokens } from "../../src/harness/compaction/compaction.ts";

describe("video compaction estimates", () => {
	it("includes video blocks in user-message token estimates", () => {
		const message: AgentMessage = {
			role: "user",
			content: [{ type: "video", data: "raw-video-base64", mimeType: "video/mp4" }],
			timestamp: 1,
		};

		expect(estimateTokens(message)).toBe(1200);
	});
});
