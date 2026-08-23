import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");

test("Finance Admin runtime assets are versioned", () => {
  assert.match(dashboard, /finance-dashboard\.js\?v=\d{8}-\d+/);
  assert.match(dashboard, /finance-dashboard-i18n\.js\?v=\d{8}-\d+/);
});
