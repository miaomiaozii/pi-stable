import type { VideoContent } from "pi-stable-ai";
import { describe, expect, it } from "vitest";
import { ExtensionRunner } from "../src/core/extensions/runner.ts";
import type {
	BeforeAgentStartEvent,
	Extension,
	ExtensionRuntime,
	InputEvent,
	InputEventResult,
} from "../src/core/extensions/types.ts";
import type { ModelRegistry } from "../src/core/model-registry.ts";
import type { SessionManager } from "../src/core/session-manager.ts";

const originalVideo: VideoContent = { type: "video", mimeType: "video/mp4", data: "AAAA" };
const transformedVideo: VideoContent = { type: "video", mimeType: "video/webm", data: "BBBB" };

function isInputEvent(event: unknown): event is InputEvent {
	return typeof event === "object" && event !== null && "type" in event && event.type === "input";
}

function isBeforeAgentStartEvent(event: unknown): event is BeforeAgentStartEvent {
	return typeof event === "object" && event !== null && "type" in event && event.type === "before_agent_start";
}

describe("extension video input events", () => {
	it("chains transformed videos and exposes them before the agent starts", async () => {
		const seen: VideoContent[][] = [];
		const inputHandler = async (event: unknown): Promise<InputEventResult> => {
			if (!isInputEvent(event)) throw new Error("Expected input event");
			expect(event.videos).toEqual([originalVideo]);
			return { action: "transform", text: `${event.text}!`, videos: [transformedVideo] };
		};
		const beforeStartHandler = async (event: unknown): Promise<void> => {
			if (!isBeforeAgentStartEvent(event)) throw new Error("Expected before_agent_start event");
			seen.push(event.videos ?? []);
		};
		const extension: Extension = {
			path: "video-test",
			resolvedPath: "video-test",
			sourceInfo: { path: "video-test", source: "video-test", scope: "temporary", origin: "top-level" },
			handlers: new Map([
				["input", [inputHandler]],
				["before_agent_start", [beforeStartHandler]],
			]),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};
		const runner = new ExtensionRunner(
			[extension],
			{} as ExtensionRuntime,
			process.cwd(),
			{} as SessionManager,
			{} as ModelRegistry,
		);

		const inputResult = await runner.emitInput("describe", undefined, "interactive", undefined, [originalVideo]);
		expect(inputResult).toEqual({
			action: "transform",
			text: "describe!",
			images: undefined,
			videos: [transformedVideo],
		});

		await runner.emitBeforeAgentStart("describe!", undefined, "system", { cwd: process.cwd() }, [transformedVideo]);
		expect(seen).toEqual([[transformedVideo]]);
	});
});
