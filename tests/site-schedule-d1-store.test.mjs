import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../site-schedule-store-v2.js", import.meta.url), "utf8");
const router = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("Site Schedule uses its own D1 table instead of CMS content tables", () => {
  assert.ok(store.includes("CREATE TABLE IF NOT EXISTS site_schedule_state"));
  assert.ok(store.includes("INSERT INTO site_schedule_state"));
  assert.ok(store.includes("ON CONFLICT(id) DO UPDATE SET"));
  assert.equal(store.includes("INSERT INTO cms_entries"), false);
  assert.equal(store.includes("INSERT INTO cms_revisions"), false);
});

test("Calendar decoration and Show Day status read the same dedicated store", () => {
  assert.ok(store.includes("readSiteScheduleV2(env)"));
  assert.ok(store.includes("decorateCalendarResponseV2"));
  assert.ok(store.includes("handleSiteScheduleApiV2"));
  assert.ok(router.includes('from "./site-schedule-store-v2.js"'));
  assert.ok(router.includes("handleSiteScheduleApiV2"));
  assert.ok(router.includes("decorateCalendarResponseV2"));
  assert.equal(router.includes("handleSiteScheduleApiCompat"), false);
});

test("Authenticated D1 failures expose a bounded diagnostic detail", () => {
  assert.ok(store.includes('code: "site_schedule_d1_write_failed"'));
  assert.ok(store.includes("String(error?.message || error).slice(0, 400)"));
});
