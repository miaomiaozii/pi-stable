import type { ImageContent, VideoContent } from "pi-stable-ai";
import { describe, expect, it, vi } from "vitest";
import type { QueuedUserInput } from "../src/core/agent-session.ts";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

type SubmitContext = {
	defaultEditor: { onSubmit?: (text: string) => void };
	editor: {
		addToHistory?: (text: string) => void;
		setText: (text: string) => void;
	};
	session: {
		isCompacting: boolean;
		isStreaming: boolean;
		isBashRunning: boolean;
		prompt: (text: string, options?: unknown) => Promise<void>;
	};
	flushPendingBashComponents: () => void;
	hasRestoredQueuedAttachments: () => boolean;
	isExtensionCommand: (text: string) => boolean;
	takeRestoredQueuedAttachments: () => { images?: ImageContent[]; videos?: VideoContent[] };
	onInputCallback?: (input: QueuedUserInput) => void;
	pendingUserInputs: QueuedUserInput[];
};

type InputContext = {
	onInputCallback?: (input: QueuedUserInput) => void;
	pendingUserInputs: QueuedUserInput[];
	activeUserInput?: QueuedUserInput;
};

type StartupSubmitContext = {
	editor: { setText: (text: string) => void };
	showStatus: (message: string) => void;
};

type InteractiveModePrivate = {
	handleStartupSubmit(this: StartupSubmitContext, text: string): void;
	setupEditorSubmitHandler(this: SubmitContext): void;
	getUserInput(this: InputContext): Promise<string>;
};

const interactiveModePrototype = InteractiveMode.prototype as unknown as InteractiveModePrivate;

function createSubmitContext(): SubmitContext {
	return {
		defaultEditor: {},
		editor: {
			addToHistory: vi.fn(),
			setText: vi.fn(),
		},
		session: {
			isCompacting: false,
			isStreaming: false,
			isBashRunning: false,
			prompt: vi.fn(async () => {}),
		},
		flushPendingBashComponents: vi.fn(),
		hasRestoredQueuedAttachments: vi.fn(() => false),
		isExtensionCommand: vi.fn(() => false),
		takeRestoredQueuedAttachments: vi.fn(() => ({})),
		pendingUserInputs: [],
	};
}

describe("InteractiveMode startup input", () => {
	it("restores a prompt submitted while managed-tool setup is running", () => {
		const context: StartupSubmitContext = {
			editor: { setText: vi.fn() },
			showStatus: vi.fn(),
		};

		interactiveModePrototype.handleStartupSubmit.call(context, "early prompt");

		expect(context.editor.setText).toHaveBeenCalledWith("early prompt");
		expect(context.showStatus).toHaveBeenCalledWith("Startup is still in progress");
	});

	it("queues a normal prompt submitted before the input callback is installed", async () => {
		const context = createSubmitContext();
		interactiveModePrototype.setupEditorSubmitHandler.call(context);

		await context.defaultEditor.onSubmit?.(" early prompt ");

		expect(context.pendingUserInputs).toEqual([{ text: "early prompt" }]);
		expect(context.flushPendingBashComponents).toHaveBeenCalledTimes(1);
		expect(context.editor.addToHistory).toHaveBeenCalledWith("early prompt");
	});

	it("submits an attachment-only input restored from a queue", async () => {
		const video: VideoContent = { type: "video", data: "video-data", mimeType: "video/mp4" };
		const context = createSubmitContext();
		context.hasRestoredQueuedAttachments = vi.fn(() => true);
		context.takeRestoredQueuedAttachments = vi.fn(() => ({ videos: [video] }));
		interactiveModePrototype.setupEditorSubmitHandler.call(context);

		await context.defaultEditor.onSubmit?.("");

		expect(context.pendingUserInputs).toEqual([{ text: "", videos: [video] }]);
		expect(context.flushPendingBashComponents).toHaveBeenCalledTimes(1);
	});

	it("keeps restored attachments queued when submitting an extension command", async () => {
		const context = createSubmitContext();
		context.hasRestoredQueuedAttachments = vi.fn(() => true);
		context.isExtensionCommand = vi.fn((text) => text === "/extension-command");
		interactiveModePrototype.setupEditorSubmitHandler.call(context);

		await context.defaultEditor.onSubmit?.("/extension-command");

		expect(context.takeRestoredQueuedAttachments).not.toHaveBeenCalled();
		expect(context.pendingUserInputs).toEqual([{ text: "/extension-command" }]);
	});

	it("returns queued startup input before installing a new input callback", async () => {
		const video: VideoContent = { type: "video", data: "video-data", mimeType: "video/mp4" };
		const context: InputContext = {
			pendingUserInputs: [{ text: "queued prompt", videos: [video] }],
		};

		await expect(interactiveModePrototype.getUserInput.call(context)).resolves.toBe("queued prompt");
		expect(context.onInputCallback).toBeUndefined();
		expect(context.pendingUserInputs).toEqual([]);
		expect(context.activeUserInput).toEqual({ text: "queued prompt", videos: [video] });
	});
});
