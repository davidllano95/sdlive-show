import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addIsoDays,
  googleCalendarDiagnostic,
  googleProjectionResource,
  normalizeGoogleCalendarOverlay
} from "../google-calendar-integration.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Google projection uses REGISTRO ID and exclusive all-day end", () => {
  const resource = googleProjectionResource({
    id: "evt_registro_123",
    startDate: "2026-09-02",
    endDate: "2026-09-04",
    client: "Client",
    project: "Three-day show",
    role: "FOH",
    state: "Pendiente Envio"
  });

  assert.equal(resource.summary, "Three-day show");
  assert.deepEqual(resource.start, { date: "2026-09-02" });
  assert.deepEqual(resource.end, { date: "2026-09-05" });
  assert.equal(resource.extendedProperties.private.sdliveRegistroId, "evt_registro_123");
  assert.equal(resource.extendedProperties.private.sdliveSource, "REGISTRO");
  assert.equal(resource.transparency, "opaque");
});

test("Google overlay filters REGISTRO projections and retains manual events", () => {
  const result = normalizeGoogleCalendarOverlay([
    {
      id: "projection-1",
      summary: "Projected show",
      status: "confirmed",
      start: { date: "2026-09-10" },
      end: { date: "2026-09-11" },
      extendedProperties: { private: { sdliveRegistroId: "source-1" } }
    },
    {
      id: "manual-1",
      summary: "SD.Live · Se abre ventana de cobro",
      status: "confirmed",
      start: { dateTime: "2026-09-05T09:00:00-05:00" },
      end: { dateTime: "2026-09-05T09:15:00-05:00" },
      htmlLink: "https://calendar.google.com/example"
    }
  ]);

  assert.equal(result.projectedFiltered, 1);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].source, "google-calendar");
  assert.equal(result.events[0].project, "GCal · SD.Live · Se abre ventana de cobro");
  assert.equal(result.events[0].startDate, "2026-09-05");
  assert.equal(result.events[0].endDate, "2026-09-05");
});

test("all-day overlay converts Google exclusive end back to inclusive Admin range", () => {
  const result = normalizeGoogleCalendarOverlay([{
    id: "manual-multiday",
    summary: "External booking",
    status: "confirmed",
    start: { date: "2026-10-01" },
    end: { date: "2026-10-04" }
  }]);
  assert.equal(result.events[0].startDate, "2026-10-01");
  assert.equal(result.events[0].endDate, "2026-10-03");
  assert.equal(result.events[0].multiDay, true);
});

test("date helper handles month boundaries deterministically", () => {
  assert.equal(addIsoDays("2026-08-31", 1), "2026-09-01");
  assert.equal(addIsoDays("2026-03-01", -1), "2026-02-28");
});

test("Calendar scope failures surface a bounded diagnostic", () => {
  const diagnostic = googleCalendarDiagnostic({ code: "google_calendar_scope_or_permission" });
  assert.equal(diagnostic.available, false);
  assert.equal(diagnostic.code, "google_calendar_scope_or_permission");
  assert.match(diagnostic.message, /scope|permission/i);
});

test("integration uses privateExtendedProperty lookup rather than title/date dedup", () => {
  const source = read("google-calendar-integration.js");
  assert.match(source, /privateExtendedProperty/);
  assert.match(source, /sdliveRegistroId/);
  assert.doesNotMatch(source, /summary\s*===.*project/);
});

test("Site Schedule source view remains REGISTRO-only", () => {
  const worker = read("admin-stabilization-worker.js");
  assert.match(worker, /searchParams\.get\("view"\) === "source"/);
  assert.match(worker, /return response;/);
});

test("successful REGISTRO create is never rolled back by Google projection", () => {
  const worker = read("admin-stabilization-worker.js");
  assert.match(worker, /Never roll back/);
  assert.match(worker, /projection: "degraded"/);
  assert.match(worker, /response\.status/);
});

test("Google Calendar target is the verified SD.Live Workspace calendar", () => {
  const wrangler = read("wrangler.jsonc");
  assert.match(wrangler, /"GOOGLE_CALENDAR_ID"\s*:\s*"sam@sdlive\.show"/);
});
