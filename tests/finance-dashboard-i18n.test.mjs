import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const i18nUrl = new URL("../admin/finance-dashboard-i18n.js", import.meta.url);
const financeDashboardUrl = new URL("../admin/finance-dashboard.js", import.meta.url);
const financePageScriptUrl = new URL("../admin/finance-page.js", import.meta.url);
const financePageUrl = new URL("../admin/finance/index.html", import.meta.url);
const i18n = readFileSync(i18nUrl, "utf8");
const financeDashboard = readFileSync(financeDashboardUrl, "utf8");
const financePageScript = readFileSync(financePageScriptUrl, "utf8");
const financePage = readFileSync(financePageUrl, "utf8");
const styles = readFileSync(new URL("../admin/finance-dashboard-i18n.css", import.meta.url), "utf8");

test("finance bilingual browser scripts are syntactically valid", () => {
  execFileSync(process.execPath, ["--check", fileURLToPath(i18nUrl)]);
  execFileSync(process.execPath, ["--check", fileURLToPath(financeDashboardUrl)]);
  execFileSync(process.execPath, ["--check", fileURLToPath(financePageScriptUrl)]);
});

test("finance dashboard bilingual layer keeps EN/ES in a centralized persisted control", () => {
  assert.match(i18n, /sdlive-finance-language/);
  assert.match(i18n, /data-lang=\"es\"/);
  assert.match(i18n, /data-lang=\"en\"/);
  assert.match(i18n, /storageSet\(STORAGE_KEY, language\)/);
  assert.match(i18n, /Finance dashboard/);
  assert.match(i18n, /Panel financiero/);
  assert.match(i18n, /Tax reserve/);
  assert.match(i18n, /Reserva fiscal/);
  assert.match(i18n, /Generated vs received/);
  assert.match(i18n, /Generado vs recibido/);
  assert.match(i18n, /0–30 days/);
  assert.match(i18n, /0–30 días/);
  assert.match(i18n, /Jan/);
  assert.match(i18n, /Ene/);
});

test("dedicated Finance route loads translations before dashboard bootstrap", () => {
  const i18nIndex = financePage.indexOf("finance-dashboard-i18n.js");
  const dashboardIndex = financePage.indexOf("finance-dashboard.js");
  const pageIndex = financePage.indexOf("finance-page.js");
  assert.ok(i18nIndex >= 0);
  assert.ok(dashboardIndex > i18nIndex);
  assert.ok(pageIndex > dashboardIndex);
  assert.match(financePageScript, /SDLiveFinanceDashboard\.load\(\)/);
  assert.match(financePageScript, /SDLiveFinanceI18n\?\.refresh\?\.\(\)/);
  assert.match(financeDashboard, /window\.SDLiveFinanceDashboard = \{ load \}/);
});

test("finance language switcher is responsive", () => {
  assert.match(styles, /\.finance-language-control/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /button\.is-active/);
});
