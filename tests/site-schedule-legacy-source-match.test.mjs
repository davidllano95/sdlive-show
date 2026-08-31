import test from "node:test";
import assert from "node:assert/strict";

import { syncSiteScheduleToGoogleCalendar } from "../site-schedule-google-projection.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

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

test("legacy Site Schedule metadata can reconcile when the stored event key no longer matches", async () => {
  const legacyEventKey = "evt_0000000000000000";
  const schedule = {
    version: 1,
    overrides: {
      [legacyEventKey]: {
        label: "RENT",
        client: "2 Productores",
        sourceStartDate: "2026-08-04",
        sourceEndDate: "2026-08-28",
        segments: [
          {
            id: "segment_1",
            startDate: "2026-08-04",
            endDate: "2026-08-08",
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
          ["2026-08-04", "2026-08-28", "2 Productores", "RENT", "Renta - Wing + DL32x2", "COP", "1b01796e"]
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
      return jsonResponse({ id: "rent-site-block" });
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

  assert.equal(result.legacyMatchedOverrides, 1);
  assert.equal(result.projectedBlocks, 1);
  assert.equal(result.overriddenWorks, 1);
  assert.equal(result.created, 1);
  assert.equal(result.deleted, 1);
  assert.equal(result.failed, 0);

  const create = operations.find((operation) => operation.method === "POST");
  assert.ok(create);
  assert.equal(create.body.start.date, "2026-08-04");
  assert.equal(create.body.end.date, "2026-08-09");
  assert.equal(create.body.extendedProperties.private.sdliveRegistroId, "1b01796e");
  assert.equal(create.body.extendedProperties.private.sdliveSiteScheduleEventKey, legacyEventKey);

  const removeBroadParent = operations.find((operation) => operation.method === "DELETE");
  assert.ok(removeBroadParent);
  assert.match(removeBroadParent.text, /broad-rent/);
});
