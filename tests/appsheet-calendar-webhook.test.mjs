import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handleAppSheetCalendarWebhook, runCalendarReconciliation } from "../appsheet-calendar-webhook.js";
import { googleProjectionResource, syncRegistroToGoogleCalendar } from "../google-calendar-integration.js";

const secret = "temporary-test-secret-value-that-is-over-thirty-two";
const url = "https://sdlive.show/api/integrations/appsheet/calendar-sync";
const env = { APPSHEET_CALENDAR_WEBHOOK_SECRET: secret };
const request = (authorization) => new Request(url, { method: "POST", headers: authorization ? { Authorization: authorization } : {} });
const okResult = { available: true, created: 1, updated: 0, deleted: 0, unchanged: 2, failed: 0, capped: false };

test("Webhook fails closed when the production secret is missing", async () => {
  const response = await handleAppSheetCalendarWebhook(request(`Bearer ${secret}`), {}, async () => okResult);
  assert.equal(response.status, 503);
});

test("Webhook rejects unauthenticated requests before any Google writes", async () => {
  let calls = 0;
  const callback = async () => { calls += 1; return okResult; };
  const response = await handleAppSheetCalendarWebhook(request("Bearer bad-secret"), env, callback);
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test("Valid AppSheet webhook reconciles and returns limited status only", async () => {
  const response = await handleAppSheetCalendarWebhook(request(`Bearer ${secret}`), env, async () => okResult);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.equal(result.created, 1);
  assert.equal(result.unchanged, 2);
});

test("Capped reconciliation resumes until settled without falsely reporting success", async () => {
  let count = 0;
  const result = await runCalendarReconciliation(async () => {
    count += 1;
    return { ...okResult, capped: count === 1 };
  });
  assert.equal(result.passes, 2);
  assert.equal(count, 2);
  await assert.rejects(
    () => runCalendarReconciliation(async () => ({ ...okResult, failed: 1 })),
    /failed writes/
  );
});

test("Worker routes AppSheet separately and schedules 05:00 Bogotá daily", async () => {
  const [worker, config] = await Promise.all([
    readFile(new URL("../admin-stabilization-worker.js", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  ]);
  assert.match(worker, /APPSHEET_CALENDAR_SYNC_PATH/);
  assert.match(worker, /handleAppSheetCalendarWebhook/);
  assert.match(worker, /async scheduled\(controller, env\)/);
  assert.match(worker, /runCalendarReconciliation/);
  assert.deepEqual(JSON.parse(config).triggers.crons, ["0 10 * * *"]);
});

test("Automated cleanup deletes stale REGISTRO projection only, not personal or malformed-date events", async () => {
  const current = {
    id: "keep", startDate: "2026-11-01", endDate: "2026-11-01",
    client: "Current", project: "Current Job", role: "FOH", state: "Active"
  };
  const env = {
    GOOGLE_OAUTH_CLIENT_ID: "client",
    GOOGLE_OAUTH_CLIENT_SECRET: "secret",
    GOOGLE_OAUTH_REFRESH_TOKEN: "refresh",
    GOOGLE_FINANCE_SPREADSHEET_ID: "sheet",
    GOOGLE_CALENDAR_ID: "sam@sdlive.show"
  };
  const operations = [];
  const fetchImpl = async (url, options = {}) => {
    const target = String(url);
    const method = options.method || "GET";
    const json = (data) => new Response(JSON.stringify(data), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
    if (target === "https://oauth2.googleapis.com/token") {
      return json({ access_token: "token" });
    }
    if (target.includes("sheets.googleapis.com")) {
      return json({ values: [
        ["Fecha trabajo", "Fecha fin", "Cliente", "Proyecto / Show", "Rol", "Estado", "ID"],
        ["2026-11-01", "2026-11-01", "Current", "Current Job", "FOH", "Active", "keep"],
        ["bad-date", "", "Invalid", "Bad date", "", "", "invalid-date"]
      ] });
    }
    if (target.includes("googleapis.com/calendar/v3/calendars") && method === "GET") {
      return json({ items: [
        { id: "g-keep", ...googleProjectionResource(current) },
        { id: "g-stale", extendedProperties: { private: { sdliveRegistroId: "stale", sdliveSource: "REGISTRO" } } },
        { id: "g-invalid", extendedProperties: { private: { sdliveRegistroId: "invalid-date", sdliveSource: "REGISTRO" } } },
        { id: "g-personal", summary: "Personal appointment" },
        { id: "g-site", extendedProperties: { private: { sdliveRegistroId: "stale", sdliveSource: "SITE_SCHEDULE" } } }
      ] });
    }
    if (target.includes("googleapis.com/calendar/v3/calendars") && method === "DELETE") {
      operations.push(target);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request ${method} ${target}`);
  };
  const result = await syncRegistroToGoogleCalendar(env, {
    fetchImpl, now: new Date("2026-11-09T12:00:00Z")
  });
  assert.equal(result.deleted, 1);
  assert.equal(result.failed, 0);
  assert.equal(operations.length, 1);
  assert.match(operations[0], /g-stale/);
});
