import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const calendarPage = readFileSync(new URL("../admin/calendar/index.html", import.meta.url), "utf8");
const calendarScript = readFileSync(new URL("../admin/calendar/calendar.js", import.meta.url), "utf8");
const mobileMonthStyles = readFileSync(new URL("../admin/calendar/mobile-month.css", import.meta.url), "utf8");
const dashboardScript = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const financePageScript = readFileSync(new URL("../admin/finance-page.js", import.meta.url), "utf8");
const editorShell = readFileSync(new URL("../admin/editor/admin-shell.js", import.meta.url), "utf8");
const router = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("Calendar is a dedicated authenticated Admin workspace", () => {
  assert.ok(calendarPage.includes("Calendar · SD.Live Admin"));
  assert.ok(calendarPage.includes('href="/admin/calendar/"'));
  assert.ok(calendarPage.includes("SD.Live Track · REGISTRO"));
  assert.ok(calendarPage.includes("intentionally read-only"));
  assert.ok(calendarPage.includes('id="calendarGrid"'));
  assert.ok(calendarPage.includes('id="calendarAgenda"'));
});

test("Calendar uses the protected read-only Admin API", () => {
  assert.ok(calendarScript.includes('api("/api/admin/calendar/events")'));
  assert.ok(router.includes('path === "/api/admin/calendar/events"'));
  assert.ok(router.includes("handleCalendarApi"));
});

test("Calendar is surfaced from sibling Admin workspaces", () => {
  assert.ok(dashboardScript.includes("activateCalendarWorkspace"));
  assert.ok(dashboardScript.includes('calendarModule.href = "./calendar/"'));
  assert.ok(financePageScript.includes('calendarLink.href = "/admin/calendar/"'));
  assert.ok(editorShell.includes('calendar.href = "../calendar/"'));
});

test("Calendar frontend renders multi-day spans without edit controls", () => {
  assert.ok(calendarScript.includes("weekSegments"));
  assert.ok(calendarScript.includes('pill.dataset.multiday = String(segment.event.multiDay)'));
  assert.equal(calendarPage.includes("Create event"), false);
  assert.equal(calendarPage.includes("Edit event"), false);
});

test("Mobile Calendar keeps month view available and offers Agenda as an alternate", () => {
  assert.ok(calendarPage.includes('id="calendarViewMonth" checked'));
  assert.ok(calendarPage.includes('id="calendarViewAgenda"'));
  assert.ok(calendarPage.includes('for="calendarViewMonth">Calendar</label>'));
  assert.ok(calendarPage.includes('for="calendarViewAgenda">Agenda</label>'));
  assert.ok(calendarPage.includes("mobile-month.css"));
  assert.ok(mobileMonthStyles.includes("#calendarViewMonth:checked ~ .calendar-weekdays"));
  assert.ok(mobileMonthStyles.includes("#calendarViewMonth:checked ~ .calendar-grid"));
  assert.ok(mobileMonthStyles.includes("#calendarViewAgenda:checked ~ .calendar-agenda"));
});
