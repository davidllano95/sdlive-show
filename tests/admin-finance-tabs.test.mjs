import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const financePage = readFileSync(new URL("../admin/finance/index.html", import.meta.url), "utf8");
const tabs = readFileSync(new URL("../admin/finance-tabs.js", import.meta.url), "utf8");

test("Finance loads a cache-busted tab runtime before the dashboard", () => {
  assert.match(financePage, /finance-tabs\.js\?v=\d{8}-\d+/);
  assert.ok(financePage.indexOf("finance-tabs.js") < financePage.indexOf("finance-dashboard.js"));
});

test("Finance defaults to Overview and classifies third-party sections separately", () => {
  assert.match(tabs, /active:\s*"overview"/);
  assert.match(tabs, /financeThirdPartyReconciliation/);
  assert.match(tabs, /financeThirdPartyHistory/);
  assert.match(tabs, /dataset\.financeTabContent/);
  assert.match(tabs, /element\.hidden = element\.dataset\.financeTabContent !== state\.active/);
});

test("Finance tabs observe only the finance root and do not persist tab state", () => {
  assert.match(tabs, /state\.observer\.observe\(root, \{ childList: true \}\)/);
  assert.doesNotMatch(tabs, /observe\(document\.(?:body|documentElement)/);
  assert.doesNotMatch(tabs, /localStorage|sessionStorage/);
});

test("Finance tab runtime parses as browser JavaScript", () => {
  assert.doesNotThrow(() => new Function(tabs));
});
