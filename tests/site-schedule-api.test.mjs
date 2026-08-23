import test from "node:test";
import assert from "node:assert/strict";

import {
  calendarEventKey,
  normalizeSiteScheduleOverride,
  showDayStatusForSchedule
} from "../site-schedule-api.js";

test("Site Schedule event keys use only browser-safe operational fields", () => {
  const event = {
    startDate: "2026-08-04",
    endDate: "2026-08-28",
    client: "2 Productores",
    project: "RENT",
    role: "Renta - Wing + DL32x2",
    currency: "COP",
    state: "Pendiente Envio"
  };

  const first = calendarEventKey(event);
  const second = calendarEventKey({ ...event, endDate: "2026-08-30", state: "Pagado" });
  assert.match(first, /^evt_[0-9a-f]{16}$/);
  assert.equal(first, second);
});

test("Site Schedule accepts non-overlapping blocks and requires Location for Show Day", () => {
  const valid = normalizeSiteScheduleOverride({
    label: "RENT",
    client: "2 Productores",
    sourceStartDate: "2026-08-04",
    sourceEndDate: "2026-08-28",
    segments: [
      { startDate: "2026-08-04", endDate: "2026-08-09", showDay: false, location: "" },
      { startDate: "2026-08-20", endDate: "2026-08-24", showDay: true, location: "Bogotá, Colombia" },
      { startDate: "2026-08-27", endDate: "2026-08-28", showDay: false, location: "" }
    ]
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.value.segments.length, 3);
  assert.equal(valid.value.segments[1].showDay, true);
  assert.equal(valid.value.segments[1].location, "Bogotá, Colombia");

  const missingLocation = normalizeSiteScheduleOverride({
    label: "RENT",
    sourceStartDate: "2026-08-04",
    sourceEndDate: "2026-08-28",
    segments: [
      { startDate: "2026-08-23", endDate: "2026-08-24", showDay: true, location: "" }
    ]
  });
  assert.equal(missingLocation.ok, false);
  assert.equal(missingLocation.errors["segments.0.location"], "required_for_show_day");
});

test("Site Schedule rejects overlaps and blocks outside the REGISTRO range", () => {
  const invalid = normalizeSiteScheduleOverride({
    label: "RENT",
    sourceStartDate: "2026-08-04",
    sourceEndDate: "2026-08-28",
    segments: [
      { startDate: "2026-08-03", endDate: "2026-08-09", showDay: false, location: "" },
      { startDate: "2026-08-09", endDate: "2026-08-12", showDay: false, location: "" }
    ]
  });

  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors["segments.0.startDate"], "outside_source_range");
  assert.equal(invalid.errors.segments, "overlap");
});

test("Show Day status activates only inside opted-in blocks and returns their Location", () => {
  const schedule = {
    version: 1,
    overrides: {
      evt_example: {
        label: "RENT",
        segments: [
          { startDate: "2026-08-20", endDate: "2026-08-24", showDay: true, location: "Bogotá, Colombia" },
          { startDate: "2026-08-27", endDate: "2026-08-28", showDay: false, location: "Medellín, Colombia" }
        ]
      }
    }
  };

  assert.deepEqual(showDayStatusForSchedule(schedule, "2026-08-23"), {
    active: true,
    location: "Bogotá, Colombia",
    activeCount: 1
  });
  assert.deepEqual(showDayStatusForSchedule(schedule, "2026-08-25"), {
    active: false,
    location: "",
    activeCount: 0
  });
  assert.deepEqual(showDayStatusForSchedule(schedule, "2026-08-27"), {
    active: false,
    location: "",
    activeCount: 0
  });
});
