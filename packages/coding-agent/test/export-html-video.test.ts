import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("export HTML video rendering", () => {
	const templateJs = readFileSync(new URL("../src/core/export-html/template.js", import.meta.url), "utf-8");

	it("renders user and tool-result videos as metadata-only placeholders", () => {
		expect(templateJs).toContain("content.filter(c => c.type === 'video')");
		expect(templateJs).toContain("result.content.filter(c => c.type === 'video')");
		expect(templateJs).toMatch(/\[Video: \$\{escapeHtml\(video\.mimeType \|\| 'video\/unknown'\)\}\]/);
		expect(templateJs).toMatch(/\[Video: \$\{video\.mimeType \|\| 'video\/unknown'\}\]/);
	});
});
