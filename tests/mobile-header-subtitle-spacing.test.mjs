import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../showday-runtime.css", import.meta.url), "utf8");

test("mobile header subtitle keeps the accepted +2px spacing in normal and Show Day modes", () => {
  const mobile = css.match(/@media\s*\(max-width:\s*700px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(mobile, "missing mobile runtime media query");
  assert.match(mobile[1], /\.brand-location\s*\{\s*transform:\s*translateY\(2px\);/);
  assert.equal(/html\.showday-active\s+\.brand-location/.test(mobile[1]), false);
});
