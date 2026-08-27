import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const uuidState = vi.hoisted(() => ({ value: 0 }));

vi.mock("pi-stable-ai", () => ({
	uuidv7: () => `00000000-0000-7000-8000-${String(++uuidState.value).padStart(12, "0")}`,
}));

import { SessionManager } from "../src/core/session-manager.ts";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		if (existsSync(dir)) rmSync(dir, { recursive: true });
	}
});

describe("video session persistence", () => {
	it("round-trips user video content through JSONL", () => {
		const tempDir = join(tmpdir(), `pi-video-session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(tempDir, { recursive: true });
		tempDirs.push(tempDir);
		const session = SessionManager.create(tempDir, tempDir);
		const userMessage = {
			role: "user" as const,
			content: [
				{ type: "text" as const, text: "Describe this video" },
				{ type: "video" as const, mimeType: "video/mp4", data: "AAAAIGZ0eXBpc29t" },
			],
			timestamp: Date.now(),
		};
		session.appendMessage(userMessage);
		session.appendMessage({
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
		});

		const sessionFile = session.getSessionFile();
		expect(sessionFile).toBeDefined();
		const reopened = SessionManager.open(sessionFile!);
		const userEntry = reopened
			.getEntries()
			.find((entry) => entry.type === "message" && entry.message.role === "user");

		expect(userEntry).toMatchObject({ type: "message", message: userMessage });
	});
});
