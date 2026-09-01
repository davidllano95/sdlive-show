import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const availabilityAdmin = await readFile(new URL("../admin/availability-admin.js", import.meta.url), "utf8");

test("Availability Force Mode date-only expiry is formatted without local timezone drift", () => {
  const formatDateMatch = availabilityAdmin.match(/function formatDate\(value\) \{([\s\S]*?)\n  \}/);
  assert.ok(formatDateMatch, "formatDate helper should exist");
  assert.match(formatDateMatch[1], /timeZone:\s*"UTC"/);
  assert.match(formatDateMatch[1], /Date\.UTC\(year, month - 1, day\)/);
});
