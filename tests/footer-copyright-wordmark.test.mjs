import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("footer copyright keeps the branded floating dot without rendering the literal period glyph", async () => {
  const css = await readFile(path.join(ROOT, "showday-runtime.css"), "utf8");
  const match = css.match(/\.site-footer \.footer-bottom \.brand-wordmark-text__dot\s*\{([\s\S]*?)\}/);

  assert.ok(match, "missing footer copyright wordmark override");
  assert.match(match[1], /display:\s*inline-block;/);
  assert.match(match[1], /background:\s*var\(--color-accent\);/);
  assert.match(match[1], /color:\s*transparent;/);
  assert.match(match[1], /overflow:\s*hidden;/);
  assert.match(match[1], /text-indent:\s*-999px;/);
});

test("Show Day runtime version is bumped so the footer fix is not masked by cached CSS", async () => {
  const edge = await readFile(path.join(ROOT, "showday-edge.js"), "utf8");
  assert.match(edge, /SHOWDAY_RUNTIME_VERSION\s*=\s*"20260823-3"/);
});
