import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");

test("footer brand follows Show Day state and blinks its recording dot", async () => {
  const css = await readFile(path.join(ROOT, "showday-runtime.css"), "utf8");

  assert.match(css, /html\.showday-active \.site-footer \.footer-brand-lockup\s*\{[^}]*opacity:\s*0;/s);
  assert.match(css, /sd-live-header-showday\.png/);
  assert.match(css, /sd-live-header-showday-dot\.png/);
  assert.match(css, /sdlive-footer-showday-dot 1s steps\(1, end\) infinite/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none;/);
});
