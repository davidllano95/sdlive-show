import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Editor Select routes globally to the owning section and closest exact CMS item", async () => {
  const resilience = await source("admin/editor/editor-resilience.js");

  assert.doesNotThrow(() => new Function(resilience));
  assert.match(resilience, /iframe\.contentWindow/);
  assert.match(resilience, /previewWindow\.addEventListener\("click", handlePreviewClick, true\)/);
  assert.match(resilience, /function descriptorFromTarget/);
  assert.match(resilience, /function activateSection/);
  assert.match(resilience, /function focusWhenReady/);
  assert.match(resilience, /ensureInspectorVisible/);
  assert.match(resilience, /button\.click\(\)/);
  assert.match(resilience, /data-core-editor-key/);
  assert.match(resilience, /data-presentation-editor-key/);
  assert.match(resilience, /data-trusted-editor-key/);
  assert.match(resilience, /data-testimonial-editor-id/);
  assert.match(resilience, /rental:item:/);
  assert.match(resilience, /service:/);
  assert.match(resilience, /work:/);
  assert.match(resilience, /contact:form/);
  assert.match(resilience, /about:paragraph:/);
  assert.match(resilience, /international:cta/);
  assert.match(resilience, /trustedTitle/);
  assert.match(resilience, /Section heading/);
  assert.match(resilience, /Global Select routed to the owning CMS section/);
  assert.match(resilience, /details\.editor-section/);
  assert.match(resilience, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
});

test("Global Select can recover Rental from International preview mode", async () => {
  const resilience = await source("admin/editor/editor-resilience.js");
  assert.match(resilience, /section === "rental"/);
  assert.match(resilience, /marketButton\("colombia"\)/);
  assert.match(resilience, /button\?\.disabled/);
  assert.match(resilience, /window\.setTimeout\(activate, 60\)/);
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

test("Editor shell cache-busts the global Select router after all current CMS owners", async () => {
  const shell = await source("admin/editor/admin-shell.js");

  assert.match(shell, /core-sections-editor\.js\?v=20260821-1/);
  assert.match(shell, /presentation-sections-editor\.js\?v=20260821-1/);
  assert.match(shell, /testimonials-editor\.js\?v=20260820-1/);
  assert.match(shell, /visual-safeguards-editor\.js\?v=20260821-3/);
  assert.match(shell, /editor-resilience\.js\?v=20260821-3/);

  assert.ok(shell.indexOf("core-sections-editor.js") < shell.indexOf("editor-resilience.js"));
  assert.ok(shell.indexOf("presentation-sections-editor.js") < shell.indexOf("editor-resilience.js"));
  assert.ok(shell.indexOf("testimonials-editor.js") < shell.indexOf("editor-resilience.js"));
  assert.ok(shell.indexOf("visual-safeguards-editor.js") < shell.indexOf("editor-resilience.js"));
});
