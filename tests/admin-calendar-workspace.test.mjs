import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const calendarPage = readFileSync(new URL("../admin/calendar/index.html", import.meta.url), "utf8");
const calendarScript = readFileSync(new URL("../admin/calendar/calendar.js", import.meta.url), "utf8");
const calendarStyles = readFileSync(new URL("../admin/calendar/calendar.css", import.meta.url), "utf8");
const mobileMonthStyles = readFileSync(new URL("../admin/calendar/mobile-month.css", import.meta.url), "utf8");
const dashboardScript = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const financePageScript = readFileSync(new URL("../admin/finance-page.js", import.meta.url), "utf8");
const editorShell = readFileSync(new URL("../admin/editor/admin-shell.js", import.meta.url), "utf8");
const router = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("Calendar is a dedicated authenticated Admin operations workspace", () => {
  assert.ok(calendarPage.includes("Calendar · SD.Live Admin"));
  assert.ok(calendarPage.includes('href="/admin/calendar/"'));
  assert.ok(calendarPage.includes("SD.Live Track · REGISTRO"));
  assert.ok(calendarPage.includes("controlled source-field form"));
  assert.ok(calendarPage.includes('id="calendarGrid"'));
  assert.ok(calendarPage.includes('id="calendarAgenda"'));
});

test("Calendar uses the protected Admin API for read and controlled create", () => {
  assert.ok(calendarScript.includes('api("/api/admin/calendar/events")'));
  assert.ok(calendarScript.includes('method: "POST"'));
  assert.ok(calendarScript.includes("createRequestId"));
  assert.ok(router.includes('path === "/api/admin/calendar/events"'));
  assert.ok(router.includes("handleCalendarApi"));
});

test("Calendar is surfaced from sibling Admin workspaces", () => {
  assert.ok(dashboardScript.includes("activateCalendarWorkspace"));
  assert.ok(dashboardScript.includes('calendarModule.href = "./calendar/"'));
  assert.ok(financePageScript.includes('calendarLink.href = "/admin/calendar/"'));
  assert.ok(editorShell.includes('calendar.href = "../calendar/"'));
});

test("Calendar frontend renders multi-day spans and exposes controlled create without edit", () => {
  assert.ok(calendarScript.includes("weekSegments"));
  assert.ok(calendarScript.includes('pill.dataset.multiday = String(segment.event.multiDay)'));
  assert.ok(calendarPage.includes('id="openCreateWork"'));
  assert.ok(calendarPage.includes('id="createWorkDialog"'));
  assert.ok(calendarPage.includes('id="createWorkForm"'));
  assert.ok(calendarPage.includes('name="startDate"'));
  assert.ok(calendarPage.includes('name="endDate"'));
  assert.ok(calendarPage.includes('name="client"'));
  assert.ok(calendarPage.includes('name="project"'));
  assert.ok(calendarPage.includes('name="currency"'));
  assert.ok(calendarPage.includes('name="grossAmount"'));
  assert.ok(calendarPage.includes('name="notes"'));
  assert.ok(calendarPage.includes('name="contactNumber"'));
  assert.ok(calendarPage.includes("Pendiente Envio"));
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

test("Calendar and create UI reuse the shared Admin brand palette", () => {
  assert.ok(calendarStyles.includes("var(--accent)"));
  assert.ok(calendarStyles.includes("rgba(var(--accent-rgb)"));
  assert.ok(calendarStyles.includes(".work-dialog"));
  assert.ok(calendarStyles.includes(".work-field input:focus"));
  assert.ok(mobileMonthStyles.includes("background: var(--accent)"));
  assert.equal(calendarStyles.includes("#dfff69"), false);
  assert.equal(calendarStyles.includes("136, 162, 255"), false);
  assert.equal(mobileMonthStyles.includes("#dfff69"), false);
});
