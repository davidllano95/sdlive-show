import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const writer = readFileSync(new URL("../site-schedule-write-compat.js", import.meta.url), "utf8");
const router = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("Site Schedule writes use the established CMS revision contract", () => {
  assert.ok(writer.includes("revision_type"));
  assert.ok(writer.includes("'publish'"));
  assert.equal(writer.includes("site-schedule-save"), false);
  assert.equal(writer.includes("site-schedule-delete"), false);
});

test("Site Schedule mutations use the D1-compatible writer", () => {
  assert.ok(router.includes('import { handleSiteScheduleApiCompat } from "./site-schedule-write-compat.js"'));
  assert.ok(router.includes("handleSiteScheduleApiCompat(request, env"));
});
