import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const i18n = readFileSync(new URL("../admin/finance-dashboard-i18n.js", import.meta.url), "utf8");

test("finance i18n does not continuously observe the whole Admin DOM", () => {
  assert.doesNotMatch(i18n, /new MutationObserver/);
  assert.doesNotMatch(i18n, /observer\.observe\(document\.body/);
});

test("finance i18n storage access cannot abort Admin startup", () => {
  assert.match(i18n, /function storageGet/);
  assert.match(i18n, /function storageSet/);
  assert.match(i18n, /catch \{/);
});
