import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const i18n = readFileSync(new URL("../admin/finance-dashboard-i18n.js", import.meta.url), "utf8");

test("Finance translations use explicit refresh instead of DOM-wide observation", () => {
  assert.match(i18n, /function refresh\(\)/);
  assert.doesNotMatch(i18n, /MutationObserver/);
});
