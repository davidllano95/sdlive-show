import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const file of [
  "../admin/dashboard.js",
  "../admin/finance-dashboard.js",
  "../admin/finance-runtime-stability.js"
]) {
  test(`${file} parses as browser JavaScript`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotThrow(() => new Function(source));
  });
}
