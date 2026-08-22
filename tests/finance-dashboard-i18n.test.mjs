import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const i18n = readFileSync(new URL("../admin/finance-dashboard-i18n.js", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../admin/finance-dashboard-i18n.css", import.meta.url), "utf8");

test("finance dashboard bilingual layer keeps EN/ES in a centralized persisted control", () => {
  assert.match(i18n, /sdlive-finance-language/);
  assert.match(i18n, /data-lang=\"es\"/);
  assert.match(i18n, /data-lang=\"en\"/);
  assert.match(i18n, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(i18n, /Finance dashboard/);
  assert.match(i18n, /Panel financiero/);
  assert.match(i18n, /Tax reserve/);
  assert.match(i18n, /Reserva fiscal/);
  assert.match(i18n, /Generated vs received/);
  assert.match(i18n, /Generado vs recibido/);
  assert.match(i18n, /Jan/);
  assert.match(i18n, /Ene/);
});

test("finance translations load before the finance dashboard and fail open to English", () => {
  const i18nIndex = dashboard.indexOf("finance-dashboard-i18n.js");
  const financeIndex = dashboard.indexOf("finance-dashboard.js");
  assert.ok(i18nIndex >= 0);
  assert.ok(financeIndex >= 0);
  assert.ok(i18nIndex < financeIndex);
  assert.match(dashboard, /continuing in English/);
  assert.match(dashboard, /SDLiveFinanceI18n\?\.refresh/);
});

test("finance language switcher is responsive", () => {
  assert.match(styles, /\.finance-language-control/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /button\.is-active/);
});
