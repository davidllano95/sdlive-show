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

test("Safeguards Run check is owned by the Safeguards panel and always has a direct diagnostic fallback", async () => {
  const [panel, resilience] = await Promise.all([
    source("admin/editor/visual-safeguards-editor.js"),
    source("admin/editor/editor-resilience.js")
  ]);

  assert.doesNotThrow(() => new Function(panel));
  assert.match(panel, /function runVisualCheck\(\)/);
  assert.match(panel, /Running visual diagnostics/);
  assert.match(panel, /checked now · run/);
  assert.match(panel, /function directStatus\(\)/);
  assert.match(panel, /win\.getComputedStyle/);
  assert.match(panel, /data-guard-check/);
  assert.match(panel, /addEventListener\(\s*"click",\s*runVisualCheck/);
  assert.match(panel, /ensurePreviewBaseline/);
  assert.match(panel, /tryInstallPreviewRuntime/);
  assert.doesNotMatch(resilience, /data-guard-check/);
  assert.doesNotMatch(resilience, /visual-safeguards\.js/);
});

test("Editor shell cache-busts the repaired Safeguards owner and preserves exact Select resilience", async () => {
  const shell = await source("admin/editor/admin-shell.js");

  assert.match(shell, /core-sections-editor\.js\?v=20260821-1/);
  assert.match(shell, /visual-safeguards-editor\.js\?v=20260821-3/);
  assert.match(shell, /editor-resilience\.js\?v=20260821-2/);

  assert.ok(
    shell.indexOf("core-sections-editor.js") <
      shell.indexOf("editor-resilience.js")
  );
  assert.ok(
    shell.indexOf("visual-safeguards-editor.js") <
      shell.indexOf("editor-resilience.js")
  );
});
