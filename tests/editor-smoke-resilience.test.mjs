import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("P2.4 exact Select wins before the generic preview selector", async () => {
  const resilience = await source("admin/editor/editor-resilience.js");

  assert.doesNotThrow(() => new Function(resilience));
  assert.match(resilience, /services:\s*"service:"/);
  assert.match(resilience, /work:\s*"work:"/);
  assert.match(resilience, /iframe\.contentWindow/);
  assert.match(resilience, /previewWindow\.addEventListener\("click", handlePreviewClick, true\)/);
  assert.match(resilience, /event\.stopImmediatePropagation\(\)/);
  assert.match(resilience, /data-core-editor-key/);
  assert.match(resilience, /details\.open = true/);
  assert.match(resilience, /ensureInspectorVisible/);
  assert.match(resilience, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(resilience, /Editing the exact CMS item selected in the preview/);
});

test("Safeguards Run check has an authoritative retryable Editor bridge", async () => {
  const resilience = await source("admin/editor/editor-resilience.js");

  assert.match(resilience, /visual-safeguards\.css\?v=20260821-2/);
  assert.match(resilience, /visual-safeguards\.js\?v=20260821-2/);
  assert.match(resilience, /\[data-guard-check\]/);
  assert.match(resilience, /document\.addEventListener\("click", \(event\) => \{/);
  assert.match(resilience, /event\.stopImmediatePropagation\(\)/);
  assert.match(resilience, /runtime\?\.status\?\.\(\)/);
  assert.match(resilience, /Checking preview visual contracts/);
  assert.match(resilience, /checked now/);
  assert.match(resilience, /Restore all defaults/);
  assert.doesNotMatch(resilience, /api\/admin\/content/);
  assert.doesNotMatch(resilience, /localStorage/);
});

test("Editor shell loads resilience after core CMS and visual safeguards", async () => {
  const shell = await source("admin/editor/admin-shell.js");

  assert.match(shell, /core-sections-editor\.js\?v=20260821-1/);
  assert.match(shell, /visual-safeguards-editor\.js\?v=20260821-2/);
  assert.match(shell, /editor-resilience\.js\?v=20260821-1/);

  assert.ok(
    shell.indexOf("core-sections-editor.js") <
      shell.indexOf("editor-resilience.js")
  );
  assert.ok(
    shell.indexOf("visual-safeguards-editor.js") <
      shell.indexOf("editor-resilience.js")
  );
});
