import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../admin/calendar/site-schedule/site-schedule.js", import.meta.url), "utf8");

test("Site Schedule source selector uses America/Bogota day boundary", () => {
  assert.ok(script.includes('timeZone: "America/Bogota"'));
  assert.ok(script.includes("function todayInBogotaIso"));
});

test("Site Schedule only renders ongoing or future REGISTRO work", () => {
  assert.ok(script.includes("function isCurrentOrFutureSourceEvent"));
  assert.ok(script.includes("return endDate >= today;"));
  assert.ok(script.includes("sourceEvents.filter((event) => isCurrentOrFutureSourceEvent(event, today))"));
  assert.ok(script.includes("eligible.filter((event) =>"));
});

test("Past work is filtered from the selector without deleting stored overrides", () => {
  assert.ok(script.includes("schedule?.overrides?.[event.eventKey]"));
  assert.equal(script.includes("delete schedule.overrides"), false);
  assert.ok(script.includes("No ongoing or future work."));
});
