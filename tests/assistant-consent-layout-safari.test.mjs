import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Safari consent layout keeps chrome rows intrinsic and conversation flexible", async () => {
  const css = await source("assistant-public-widget-layout.css");
  assert.match(css, /grid-template-rows:\s*max-content minmax\(0, 1fr\) max-content max-content;/);
  assert.match(css, /\.assistant-panel__conversation\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /\.assistant-panel__messages\s*\{[\s\S]*?flex:\s*1 1 0%;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.assistant-panel__consent\s*\{[\s\S]*?flex:\s*0 0 auto;/);
});

test("public Assistant injects the Safari layout override after the base widget CSS", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const baseIndex = edge.indexOf("/assistant-public-widget.css?v=");
  const layoutIndex = edge.indexOf("/assistant-public-widget-layout.css?v=");
  assert.ok(baseIndex >= 0);
  assert.ok(layoutIndex > baseIndex);
  assert.match(edge, /ASSISTANT_WIDGET_VERSION = "20\d{6}-\d+"/);
});
