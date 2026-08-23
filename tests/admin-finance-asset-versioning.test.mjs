import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const financePage = readFileSync(new URL("../admin/finance/index.html", import.meta.url), "utf8");
const dashboardPage = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");

test("Finance workspace runtime assets are versioned", () => {
  assert.match(financePage, /finance-dashboard\.js\?v=\d{8}-\d+/);
  assert.match(financePage, /finance-dashboard-i18n\.js\?v=\d{8}-\d+/);
  assert.match(financePage, /finance-page\.js\?v=\d{8}-\d+/);
});

test("lightweight Dashboard runtime is cache-busted independently", () => {
  assert.match(dashboardPage, /dashboard\.js\?v=\d{8}-\d+/);
});
