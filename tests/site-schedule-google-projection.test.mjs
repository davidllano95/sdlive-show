import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeGoogleCalendarOverlay } from "../google-calendar-integration.js";
import {
  siteScheduleBlockResource,
  syncSiteScheduleToGoogleCalendar
} from "../site-schedule-google-projection.js";

function fakeScheduleDb(schedule) {
  return {
    prepare(sql) {
      return {
        bind() {
          return this;
        },
        async run() {
          return { success: true };
        },
        async first() {
          if (!String(sql).includes("site_schedule_state")) return null;
          return {
            content_json: JSON.stringify(schedule),
            updated_at: "2026-08-31T19:00:00Z"
          };
        }
      };
    }
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("Site Schedule block resources keep stable private identity and all-day dates", () => {
  const resource = siteScheduleBlockResource(
    {
      id: "registro-123",
      client: "Client",
      project: "Project"
    },
    "evt_0123456789abcdef",
    { label: "Website dates", client: "Client" },
    {
      id: "segment_a",
      startDate: "2026-09-03",
      endDate: "2026-09-05",
      showDay: true,
      location: "Bogotá"
    }
  );

  assert.equal(resource.summary, "Website dates");
  assert.deepEqual(resource.start, { date: "2026-09-03" });
  assert.deepEqual(resource.end, { date: "2026-09-06" });
  assert.equal(resource.location, "Bogotá");
  assert.equal(resource.extendedProperties.private.sdliveRegistroId, "registro-123");
  assert.equal(resource.extendedProperties.private.sdliveSource, "SITE_SCHEDULE");
  assert.equal(
    resource.extendedProperties.private.sdliveSiteScheduleBlockId,
    "evt_0123456789abcdef:segment_a"
  );
});

test("Site Schedule projections are filtered from the Google overlay to avoid Admin duplicates", () => {
  const normalized = normalizeGoogleCalendarOverlay([
    {
      id: "projected-block",
      status: "confirmed",
      summary: "Website dates",
      start: { date: "2026-09-03" },
      end: { date: "2026-09-06" },
      extendedProperties: {
        private: {
          sdliveRegistroId: "registro-123",
          sdliveSource: "SITE_SCHEDULE",
          sdliveSiteScheduleBlockId: "evt_0123456789abcdef:segment_a"
        }
      }
    }
  ]);

  assert.equal(normalized.events.length, 0);
  assert.equal(normalized.projectedFiltered, 1);
});

test("Site Schedule sync creates blocks and removes the broad REGISTRO parent projection", async () => {
  const sourceEvent = {
    startDate: "2026-09-01",
    endDate: "2026-09-10",
    client: "Client",
    project: "Project",
    role: "FOH",
    currency: "COP"
  };

  const eventKey = "evt_b01a11a69beb9b3e";
  const schedule = {
    version: 1,
    overrides: {
      [eventKey]: {
        label: "Project · website dates",
        client: "Client",
        sourceStartDate: "2026-09-01",
        sourceEndDate: "2026-09-10",
        segments: [
          {
            id: "segment_1",
            startDate: "2026-09-03",
            endDate: "2026-09-04",
            showDay: false,
            location: ""
          }
        ]
      }
    }
  };

  const env = {
    GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
    GOOGLE_OAUTH_CLIENT_SECRET: "secret",
    GOOGLE_OAUTH_REFRESH_TOKEN: "refresh",
    GOOGLE_FINANCE_SPREADSHEET_ID: "sheet-id",
    GOOGLE_CALENDAR_ID: "sam@sdlive.show",
    CMS_DB: fakeScheduleDb(schedule)
  };

  const operations = [];
  const fetchImpl = async (url, options = {}) => {
    const text = String(url);
    const method = options.method || "GET";

    if (text === "https://oauth2.googleapis.com/token") {
      return jsonResponse({ access_token: "access-token" });
    }

    if (text.startsWith("https://sheets.googleapis.com/")) {
      return jsonResponse({
        values: [
          ["Fecha trabajo", "Fecha fin", "Cliente", "Proyecto / Show", "Rol", "Moneda", "ID"],
          [sourceEvent.startDate, sourceEvent.endDate, sourceEvent.client, sourceEvent.project, sourceEvent.role, sourceEvent.currency, "registro-123"]
        ]
      });
    }

    if (text.includes("/calendar/v3/calendars/") && method === "GET") {
      return jsonResponse({
        items: [
          {
            id: "base-google-event",
            summary: "Project",
            start: { date: "2026-09-01" },
            end: { date: "2026-09-11" },
            extendedProperties: {
              private: {
                sdliveRegistroId: "registro-123",
                sdliveSource: "REGISTRO"
              }
            }
          }
        ]
      });
    }

    if (text.includes("/calendar/v3/calendars/") && method === "POST") {
      const body = JSON.parse(options.body);
      operations.push({ method, text, body });
      return jsonResponse({ id: "site-block-google-event" });
    }

    if (text.includes("/calendar/v3/calendars/") && method === "DELETE") {
      operations.push({ method, text });
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected request: ${method} ${text}`);
  };

  // The exact event key is produced from source operational fields. Keep the
  // fixture coupled to the same public contract instead of hard-coding a
  // production record identifier.
  const { calendarEventKey } = await import("../site-schedule-api.js");
  const computedKey = calendarEventKey(sourceEvent);
  schedule.overrides[computedKey] = schedule.overrides[eventKey];
  if (computedKey !== eventKey) delete schedule.overrides[eventKey];

  const result = await syncSiteScheduleToGoogleCalendar(env, {
    fetchImpl,
    now: new Date("2026-08-26T12:00:00-05:00")
  });

  assert.equal(result.created, 1);
  assert.equal(result.deleted, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.projectedBlocks, 1);
  assert.equal(result.overriddenWorks, 1);

  const create = operations.find((operation) => operation.method === "POST");
  assert.ok(create);
  assert.equal(create.body.start.date, "2026-09-03");
  assert.equal(create.body.end.date, "2026-09-05");
  assert.equal(create.body.extendedProperties.private.sdliveRegistroId, "registro-123");
  assert.equal(create.body.extendedProperties.private.sdliveSource, "SITE_SCHEDULE");

  const removeParent = operations.find((operation) => operation.method === "DELETE");
  assert.ok(removeParent);
  assert.match(removeParent.text, /base-google-event/);
});

test("Site Schedule saves sync in the background without creating a reverse write path", async () => {
  const worker = await readFile(new URL("../admin-stabilization-worker.js", import.meta.url), "utf8");
  assert.match(worker, /ADMIN_SITE_SCHEDULE_EVENT_PREFIX/);
  assert.match(worker, /ctx\.waitUntil/);
  assert.match(worker, /request\.method === "DELETE"\s*\? syncCalendarProjectionToGoogleCalendar\(env\)\s*:\s*syncSiteScheduleToGoogleCalendar\(env\)/s);
  assert.doesNotMatch(worker, /Google Calendar.*(?:write|update).*REGISTRO/i);
});
