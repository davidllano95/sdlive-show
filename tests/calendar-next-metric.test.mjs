import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const calendarScript = readFileSync(
  new URL("../admin/calendar/calendar.js", import.meta.url),
  "utf8"
);

test("Calendar Next prioritizes tomorrow for ongoing multi-day work", () => {
  assert.ok(calendarScript.includes("const tomorrowIso = isoFromDate(addDays(dateFromIso(todayIso), 1))"));
  assert.ok(calendarScript.includes("event.startDate <= todayIso && event.endDate >= tomorrowIso"));
  assert.ok(calendarScript.includes("date: tomorrowIso"));
  assert.ok(calendarScript.includes("event: ongoing"));
});

test("Calendar Next falls back to the next event start when no work continues tomorrow", () => {
  assert.ok(calendarScript.includes("events.find((event) => event.startDate >= todayIso)"));
  assert.ok(calendarScript.includes("date: upcoming.startDate"));
});
