import { describe, expect, it } from "vitest";
import { getTextOutput } from "../src/core/tools/render-utils.ts";

describe("tool video rendering", () => {
	it("shows a video placeholder without embedding base64 data", () => {
		const output = getTextOutput(
			{
				content: [{ type: "video", data: "raw-video-base64", mimeType: "video/mp4" }],
			},
			true,
		);

		expect(output).toBe("[Video: video/mp4]");
		expect(output).not.toContain("raw-video-base64");
	});
});
