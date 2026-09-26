import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../admin/finance-dashboard.js", import.meta.url), "utf8");
const history = readFileSync(new URL("../admin/finance-third-party-history.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../admin/finance/index.html", import.meta.url), "utf8");

test("Finance Admin makes owner money primary while keeping full transaction totals explicit", () => {
  assert.match(dashboard, /Received all-time · yours/);
  assert.match(dashboard, /Generated vs received · yours/);
  assert.match(dashboard, /Full transaction facts/);
  assert.match(dashboard, /Total billed/);
  assert.match(dashboard, /Bank received/);
  assert.match(dashboard, /Third-party payable/);
  assert.match(dashboard, /ownerSummary/);
  assert.match(dashboard, /ownerAnalytics/);
});

test("Finance Admin includes read-only third-party payment history filters", () => {
  assert.match(page, /finance-third-party-history\.js\?v=\d{8}-\d+/);
  assert.match(history, /Registered payments to third parties/);
  assert.match(history, /Pagos registrados a terceros/);
  assert.match(history, /Filter by third party/);
  assert.match(history, /All years/);
  assert.match(history, /All currencies/);
  assert.match(history, /event-level log/);
});
