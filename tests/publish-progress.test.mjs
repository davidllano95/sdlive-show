import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("publish progress parses and maps failsafe stages to visible button feedback", async () => {
  const progress = await source("admin/editor/publish-progress.js");

  assert.doesNotThrow(() => new Function(progress));
  assert.match(progress, /SDLIVE_PUBLISH_PROGRESS/);
  assert.match(progress, /Checking…/);
  assert.match(progress, /Publishing…/);
  assert.match(progress, /Verifying…/);
  assert.match(progress, /Published ✓/);
  assert.match(progress, /Publish failed/);
  assert.match(progress, /aria-busy/);
  assert.match(progress, /data-publish-stage/);
});

test("publish progress includes an obvious spinner and shimmer while preserving reduced-motion accessibility", async () => {
  const progress = await source("admin/editor/publish-progress.js");

  assert.match(progress, /@keyframes sdlive-publish-spin/);
  assert.match(progress, /@keyframes sdlive-publish-shimmer/);
  assert.match(progress, /#publishContent\.is-publishing::before/);
  assert.match(progress, /#publishContent\.is-publishing::after/);
  assert.match(progress, /prefers-reduced-motion: reduce/);
  assert.match(progress, /animation: none !important/);
});

test("editor shell loads publish progress after the automatic failsafe owner", async () => {
  const shell = await source("admin/editor/admin-shell.js");

  assert.match(shell, /publish-progress\.js\?v=20260821-1/);
  assert.ok(
    shell.indexOf("automatic-failsafe.js") < shell.indexOf("publish-progress.js")
  );
});
