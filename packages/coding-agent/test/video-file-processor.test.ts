import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { processFileArguments } from "../src/cli/file-processor.ts";
import { detectSupportedVideoMimeType } from "../src/utils/mime.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("video file processing", () => {
	it("detects common video container signatures", () => {
		expect(detectSupportedVideoMimeType(Buffer.from("000000186674797069736F6D", "hex"))).toBe("video/mp4");
		expect(detectSupportedVideoMimeType(Buffer.from("524946460000000041564920", "hex"))).toBe("video/x-msvideo");
		expect(detectSupportedVideoMimeType(Buffer.from("1A45DFA3010000007765626D", "hex"))).toBe("video/webm");
		expect(detectSupportedVideoMimeType(Buffer.from("000001B32D01E034", "hex"))).toBe("video/mpeg");

		const transportStream = Buffer.alloc(377);
		transportStream[0] = 0x47;
		transportStream[188] = 0x47;
		transportStream[376] = 0x47;
		expect(detectSupportedVideoMimeType(transportStream)).toBe("video/mp2t");

		const m2ts = Buffer.alloc(389);
		m2ts[4] = 0x47;
		m2ts[196] = 0x47;
		m2ts[388] = 0x47;
		expect(detectSupportedVideoMimeType(m2ts)).toBe("video/mp2t");
	});

	it("reads an @file video as base64 VideoContent", async () => {
		const directory = await mkdtemp(join(tmpdir(), "pi-video-test-"));
		temporaryDirectories.push(directory);
		const videoPath = join(directory, "clip.mp4");
		const bytes = Buffer.from("000000186674797069736F6D00000000", "hex");
		await writeFile(videoPath, bytes);

		const result = await processFileArguments([videoPath]);

		expect(result.images).toEqual([]);
		expect(result.videos).toEqual([
			{
				type: "video",
				mimeType: "video/mp4",
				data: bytes.toString("base64"),
			},
		]);
		expect(result.text).toBe(`<file name="${videoPath}"></file>\n`);
	});
});
