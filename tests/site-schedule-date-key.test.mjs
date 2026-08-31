import test from "node:test";
import assert from "node:assert/strict";

import { syncSiteScheduleToGoogleCalendar } from "../site-schedule-google-projection.js";
import { calendarEventKey } from "../site-schedule-api.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function fakeScheduleDb(schedule) {
  return {
    prepare() {
      return {
        bind() { return this; },
        async first() {
          return {
            id: 1,
            published_blob: JSON.stringify(schedule),
            updated_at: "2026-08-31T19:00:00Z",
            published_at: "2026-08-31T19:00:00Z"
          };
        }
      };
    }
  };
}

test("Site Schedule Google reconciliation uses the same day-first ambiguous date semantics as Admin Calendar", async () => {
  const source = {
    startDate: "2026-08-04",
    endDate: "2026-08-28",
    client: "2 Productores",
    project: "RENT",
    role: "Renta - Wing + DL32x2",
    currency: "COP"
  };
  const eventKey = calendarEventKey(source);
  const schedule = {
    version: 1,
    overrides: {
      [eventKey]: {
        label: "RENT",
        client: source.client,
        sourceStartDate: source.startDate,
        sourceEndDate: source.endDate,
        segments: [
          {
            id: "segment_1",
            startDate: "2026-08-04",
            endDate: "2026-08-09",
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
          ["4/8/2026", "28/8/2026", source.client, source.project, source.role, source.currency, "1b01796e"]
        ]
      });
    }

    if (text.includes("/calendar/v3/calendars/") && method === "GET") {
      return jsonResponse({
        items: [
          {
            id: "broad-rent",
            summary: "RENT",
            start: { date: "2026-08-04" },
            end: { date: "2026-08-29" },
            extendedProperties: {
              private: {
                sdliveRegistroId: "1b01796e",
                sdliveSource: "REGISTRO"
              }
            }
          }
        ]
      });
    }

    if (text.includes("/calendar/v3/calendars/") && method === "POST") {
      operations.push({ method, body: JSON.parse(options.body) });
      return jsonResponse({ id: "rent-segment" });
    }

    if (text.includes("/calendar/v3/calendars/") && method === "DELETE") {
      operations.push({ method, text });
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected request: ${method} ${text}`);
  };

  const result = await syncSiteScheduleToGoogleCalendar(env, {
    fetchImpl,
    now: new Date("2026-08-31T14:00:00-05:00")
  });

  assert.equal(result.projectedBlocks, 1);
  assert.equal(result.overriddenWorks, 1);
  assert.equal(result.created, 1);
  assert.equal(result.deleted, 1);
  assert.equal(result.failed, 0);
  assert.equal(operations.find((entry) => entry.method === "POST")?.body.start.date, "2026-08-04");
  assert.match(operations.find((entry) => entry.method === "DELETE")?.text || "", /broad-rent/);
});
