import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../site-schedule-store-v2.js", import.meta.url), "utf8");
const router = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("Site Schedule no longer depends on CMS revision compatibility", () => {
  assert.ok(store.includes("site_schedule_state"));
  assert.equal(store.includes("cms_revisions"), false);
  assert.equal(store.includes("revision_type"), false);
});

test("Site Schedule mutations use the dedicated D1 store", () => {
  assert.ok(router.includes('from "./site-schedule-store-v2.js"'));
  assert.ok(router.includes("handleSiteScheduleApiV2(request, env"));
  assert.equal(router.includes("handleSiteScheduleApiCompat"), false);
});
