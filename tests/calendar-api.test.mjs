import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPECTED_CALENDAR_HEADERS,
  normalizeCalendarRows,
  sheetDateToIso,
  validateCalendarHeaders
} from "../calendar-api.js";

function row(overrides = {}) {
  const values = new Array(EXPECTED_CALENDAR_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(overrides)) {
    const index = EXPECTED_CALENDAR_HEADERS.indexOf(field);
    if (index === -1) throw new Error(`Unknown test field: ${field}`);
    values[index] = value;
  }
  return values;
}

test("Calendar requires only its operational fields and normalizes header text", () => {
  const exact = validateCalendarHeaders([...EXPECTED_CALENDAR_HEADERS]);
  assert.equal(exact.ok, true);
  assert.equal(exact.columnCount, 28);
  assert.deepEqual(exact.missingFields, []);

  const normalized = [...EXPECTED_CALENDAR_HEADERS];
  normalized[27] = "  FECHA   FIN  ";
  normalized[1] = "Unrelated finance helper";
  const normalizedCheck = validateCalendarHeaders(normalized);
  assert.equal(normalizedCheck.ok, true);
  assert.equal(normalizedCheck.fieldIndex["Fecha fin"], 27);

  const missingEnd = EXPECTED_CALENDAR_HEADERS.slice(0, -1);
  const missingCheck = validateCalendarHeaders(missingEnd);
  assert.equal(missingCheck.ok, false);
  assert.deepEqual(missingCheck.missingFields, ["Fecha fin"]);
});

test("Calendar can read required fields even when their columns move", () => {
  const headers = [
    "ID",
    "Proyecto / Show",
    "Fecha fin",
    "Cliente",
    "Estado",
    "Fecha trabajo",
    "Rol",
    "Moneda"
  ];
  const headerCheck = validateCalendarHeaders(headers);
  assert.equal(headerCheck.ok, true);

  const source = [
    "persisted",
    "Tour",
    "2026-08-25",
    "Client",
    "Pendiente Envio",
    "2026-08-23",
    "A1",
    "COP"
  ];
  const { events } = normalizeCalendarRows([source], headerCheck.fieldIndex);
  assert.equal(events.length, 1);
  assert.equal(events[0].project, "Tour");
  assert.equal(events[0].startDate, "2026-08-23");
  assert.equal(events[0].endDate, "2026-08-25");
  assert.equal(events[0].multiDay, true);
});

test("Calendar date conversion handles Sheets serial dates", () => {
  const epoch = Date.UTC(1899, 11, 30);
  const target = Date.UTC(2026, 7, 23);
  const serial = (target - epoch) / 86400000;
  assert.equal(sheetDateToIso(serial), "2026-08-23");
});

test("Calendar exposes only sanitized operational fields and supports multi-day spans", () => {
  const source = row({
    "Fecha trabajo": "2026-08-20",
    "Fecha fin": "2026-08-24",
    Cliente: "Client A",
    "Proyecto / Show": "RENT",
    Rol: "A1",
    Moneda: "COP",
    Estado: "Pendiente Envio",
    ID: "secret-key",
    Notas: "private note",
    "NUM CONTACTO": "+57 300 000 0000"
  });

  const { events, quality } = normalizeCalendarRows([source]);
  assert.equal(events.length, 1);
  assert.equal(events[0].startDate, "2026-08-20");
  assert.equal(events[0].endDate, "2026-08-24");
  assert.equal(events[0].multiDay, true);
  assert.equal(events[0].project, "RENT");
  assert.equal("ID" in events[0], false);
  assert.equal("id" in events[0], false);
  assert.equal("Notas" in events[0], false);
  assert.equal("notes" in events[0], false);
  assert.equal("NUM CONTACTO" in events[0], false);
  assert.deepEqual(quality, {
    missingStartDate: 0,
    invalidEndDate: 0,
    endBeforeStart: 0
  });
});

test("Blank Fecha fin safely falls back to Fecha trabajo", () => {
  const source = row({
    "Fecha trabajo": "2026-08-23",
    "Fecha fin": "",
    Cliente: "Client B",
    ID: "persisted"
  });

  const { events } = normalizeCalendarRows([source]);
  assert.equal(events[0].endDate, "2026-08-23");
  assert.equal(events[0].multiDay, false);
});

test("Invalid end-before-start data cannot create a backwards Calendar span", () => {
  const source = row({
    "Fecha trabajo": "2026-08-23",
    "Fecha fin": "2026-08-20",
    Cliente: "Client C",
    ID: "persisted"
  });

  const { events, quality } = normalizeCalendarRows([source]);
  assert.equal(events[0].endDate, "2026-08-23");
  assert.equal(events[0].dateIssue, "end_before_start");
  assert.equal(quality.endBeforeStart, 1);
});
