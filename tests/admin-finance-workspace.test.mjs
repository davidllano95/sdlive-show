import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboardPage = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");
const dashboardScript = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const editorShell = readFileSync(new URL("../admin/editor/admin-shell.js", import.meta.url), "utf8");
const financePage = readFileSync(new URL("../admin/finance/index.html", import.meta.url), "utf8");
const financePageScript = readFileSync(new URL("../admin/finance-page.js", import.meta.url), "utf8");

test("Dashboard links to Finance without loading its runtime", () => {
  assert.ok(dashboardPage.includes('href="./finance/"'));
  assert.ok(dashboardPage.includes('<span>Finance</span>'));
  assert.equal(dashboardScript.includes("finance-dashboard"), false);
  assert.equal(dashboardScript.includes("loadFinanceModule"), false);
  assert.equal(dashboardScript.includes("financeMobileLauncher"), false);
});

test("Site Editor exposes Finance as a sibling workspace", () => {
  assert.ok(editorShell.includes('finance.href = "../finance/"'));
  assert.ok(editorShell.includes('<span>Finance</span>'));
  assert.ok(editorShell.includes("SD.Live Track"));
});

test("Finance has its own Admin route and mount", () => {
  assert.ok(financePage.includes("Finance · SD.Live Admin"));
  assert.ok(financePage.includes('href="/admin/"'));
  assert.ok(financePage.includes('href="/admin/editor/"'));
  assert.ok(financePage.includes('href="/admin/finance/"'));
  assert.ok(financePage.includes('id="financeMount"'));
  assert.ok(financePageScript.includes("SDLiveFinanceDashboard.load()"));
});
