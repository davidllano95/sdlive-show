import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("automatic failsafe parses and owns publish-time visual validation", async () => {
  const failsafe = await source("admin/editor/automatic-failsafe.js");

  assert.doesNotThrow(() => new Function(failsafe));
  assert.match(failsafe, /SDLIVE_AUTOMATIC_FAILSAFE/);
  assert.match(failsafe, /PUBLISH_RE/);
  assert.match(failsafe, /window\.fetch = failsafeFetch/);
  assert.match(failsafe, /Failsafe pre-publish check/);
  assert.match(failsafe, /Failsafe blocked publish/);
  assert.match(failsafe, /Published · Failsafe ✓ All running/);
  assert.match(failsafe, /Published · Failsafe failed/);
});

test("automatic failsafe is section-aware and watches editor rebuilds", async () => {
  const failsafe = await source("admin/editor/automatic-failsafe.js");

  assert.match(failsafe, /services: "#services"/);
  assert.match(failsafe, /work: "#work"/);
  assert.match(failsafe, /about: "#about"/);
  assert.match(failsafe, /international: "#international"/);
  assert.match(failsafe, /trusted: "\.trusted-wrap"/);
  assert.match(failsafe, /testimonials: "\.testimonials--public#testimonials"/);
  assert.match(failsafe, /hero: "#hero"/);
  assert.match(failsafe, /MutationObserver/);
  assert.match(failsafe, /scheduleEditingCheck/);
  assert.match(failsafe, /attributeFilter: \["class", "style", "src", "hidden"\]/);
});

test("automatic failsafe repairs only safe preview protection layers before publish", async () => {
  const failsafe = await source("admin/editor/automatic-failsafe.js");

  assert.match(failsafe, /function repairPreviewProtections\(\)/);
  assert.match(failsafe, /data-sdlive-visual-safeguards/);
  assert.match(failsafe, /data-sdlive-vfx/);
  assert.match(failsafe, /SDLiveVisualSafeguards\?\.repair/);
  assert.match(failsafe, /repairableOnly/);
  assert.match(failsafe, /The saved Draft was not promoted to Published/);
  assert.doesNotMatch(failsafe, /\/api\/admin\/content\/.*PUT/);
});

test("automatic failsafe verifies the real published Home in a hidden same-origin frame", async () => {
  const failsafe = await source("admin/editor/automatic-failsafe.js");

  assert.match(failsafe, /function verifyPublished\(section\)/);
  assert.match(failsafe, /failsafe_verify=/);
  assert.match(failsafe, /sdlive-failsafe-verifier/);
  assert.match(failsafe, /sameOriginContext\(frame\)/);
  assert.match(failsafe, /inspectDocument\(context\.doc, context\.win, section\)/);
  assert.match(failsafe, /Published Home verification/);
});

test("automatic failsafe checks known aesthetic and structural contracts", async () => {
  const failsafe = await source("admin/editor/automatic-failsafe.js");

  assert.match(failsafe, /Trusted card sheen/);
  assert.match(failsafe, /Testimonials sheen \+ clipping/);
  assert.match(failsafe, /Trusted carousel motion/);
  assert.match(failsafe, /Supported-brand reveal/);
  assert.match(failsafe, /Aurora ambience/);
  assert.match(failsafe, /Glass surfaces/);
  assert.match(failsafe, /Reveal system/);
  assert.match(failsafe, /Services cards/);
  assert.match(failsafe, /Services filters/);
  assert.match(failsafe, /Selected Work cards/);
  assert.match(failsafe, /About image/);
  assert.match(failsafe, /International content/);
});

test("editor shell loads automatic failsafe after existing safeguard and editor ownership layers", async () => {
  const shell = await source("admin/editor/admin-shell.js");

  assert.match(shell, /automatic-failsafe\.js\?v=20260821-1/);
  assert.ok(
    shell.indexOf("visual-safeguards-editor.js") <
      shell.indexOf("automatic-failsafe.js")
  );
  assert.ok(
    shell.indexOf("safeguards-status-placement.js") <
      shell.indexOf("automatic-failsafe.js")
  );
  assert.ok(
    shell.indexOf("editor-resilience.js") <
      shell.indexOf("automatic-failsafe.js")
  );
});
