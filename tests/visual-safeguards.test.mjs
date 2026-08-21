import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("visual safeguard runtime is valid and self-healing", async () => {
  const runtime = await source("visual-safeguards.js");

  assert.doesNotThrow(() => new Function(runtime));
  assert.match(runtime, /SDLiveVisualSafeguards/);
  assert.match(runtime, /ensureStylesheet/);
  assert.match(runtime, /setAttributeIfNeeded/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /repair/);
  assert.match(runtime, /Card highlights \/ sheen/);
  assert.match(runtime, /Trusted carousel motion/);
  assert.match(runtime, /Supported-brand reveal motion/);
  assert.match(runtime, /visual-safeguards\.css\?v=20260821-2/);
});

test("guard stylesheet preserves core established aesthetics", async () => {
  const css = await source("visual-safeguards.css");

  assert.match(css, /data-sdlive-vfx-surfaces="on"/);
  assert.match(css, /data-sdlive-vfx-ambient="on"/);
  assert.match(css, /data-sdlive-vfx-reveals="on"/);
  assert.match(css, /data-sdlive-vfx-sheen="on"/);
  assert.match(css, /data-sdlive-vfx-trusted-motion="on"/);
  assert.match(css, /data-sdlive-vfx-supported-reveals="on"/);
  assert.match(css, /data-sdlive-vfx-buttons="on"/);
  assert.match(css, /rgba\(255, 255, 255, 0\.2\) 50%/);
  assert.match(css, /900ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(css, /background-position/);
  assert.match(css, /sdlive-guard-trusted-scroll/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("guarded sheen keeps original pacing and cannot paint outside cards", async () => {
  const css = await source("visual-safeguards.css");

  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /border-radius:\s*inherit/);
  assert.match(css, /inset:\s*0/);
  assert.match(css, /background-position:\s*90% 0/);
  assert.match(css, /background-position:\s*10% 0/);
  assert.doesNotMatch(css, /inset:\s*-45% -12%/);
});

test("stable Trusted sheen no longer depends on transformed pseudo-element animation", async () => {
  const [css, trustedRuntime] = await Promise.all([
    source("visual-safeguards.css"),
    source("trusted-published-runtime.js")
  ]);

  const sheenKeyframes = css.match(
    /@keyframes sdlive-guard-card-sheen\s*\{([\s\S]*?)\n\}/
  )?.[1] || "";

  assert.match(sheenKeyframes, /background-position/);
  assert.doesNotMatch(sheenKeyframes, /translateX/);
  assert.doesNotMatch(trustedRuntime, /trusted-live-hover-stability/);
  assert.doesNotMatch(trustedRuntime, /client-strip-card:hover::after[\s\S]*animation:\s*none/);
});

test("public Home always receives safeguards independently of every CMS fallback state", async () => {
  const router = await source("worker-router.js");

  assert.match(router, /VISUAL_SAFEGUARDS_VERSION = "20260821-2"/);
  assert.match(router, /visual-safeguards\.css/);
  assert.match(router, /visual-safeguards\.js/);
  assert.match(router, /data-sdlive-visual-safeguards/);

  const headHandler = router.match(
    /\.on\("head",\s*\{[\s\S]*?\}\)\s*\.on\("\.trusted-wrap"/
  )?.[0] || "";

  assert.match(headHandler, /visual-safeguards\.css/);
  assert.match(headHandler, /visual-safeguards\.js/);
  assert.match(headHandler, /if \(trustedIsCms\)/);
  assert.ok(
    headHandler.indexOf("visual-safeguards.css") <
      headHandler.indexOf("if (trustedIsCms)"),
    "visual safeguards must be injected before optional CMS-specific runtimes"
  );
  assert.doesNotMatch(
    headHandler,
    /if \(!(?:trustedIsCms|testimonialsIsCms)\) return/,
    "visual safeguards must not depend on a section having CMS data"
  );
});

test("Editor exposes diagnostics and one-click restore without saving visual state into content", async () => {
  const [panel, shell] = await Promise.all([
    source("admin/editor/visual-safeguards-editor.js"),
    source("admin/editor/admin-shell.js")
  ]);

  assert.doesNotThrow(() => new Function(panel));
  assert.match(panel, /Visual safeguards/);
  assert.match(panel, /Restore all defaults/);
  assert.match(panel, /Run check/);
  assert.match(panel, /runtime\?\.repair\?\.\(\)/);
  assert.match(panel, /not content settings/);
  assert.match(panel, /visual-safeguards\.css\?v=20260821-2/);
  assert.match(panel, /visual-safeguards\.js\?v=20260821-2/);
  assert.match(panel, /function directStatus\(\)/);
  assert.match(panel, /checked now · run/);
  assert.match(shell, /visual-safeguards-editor\.js\?v=20260821-3/);
});
