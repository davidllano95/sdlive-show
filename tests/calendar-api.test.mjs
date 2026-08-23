import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPECTED_CALENDAR_HEADERS,
  handleCalendarApi,
  normalizeCalendarRows,
  normalizeCreateWorkPayload,
  sheetDateToIso,
  validateCalendarCreateHeaders,
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const env = {
  GOOGLE_OAUTH_CLIENT_ID: "client",
  GOOGLE_OAUTH_CLIENT_SECRET: "secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh",
  GOOGLE_FINANCE_SPREADSHEET_ID: "sheet-id"
};

const validCreatePayload = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  startDate: "2026-08-25",
  endDate: "2026-08-27",
  client: "Client A",
  project: "Admin smoke",
  role: "A1",
  currency: "COP",
  grossAmount: "1250000",
  paymentMethod: "Transferencia",
  notes: "Controlled create",
  contactNumber: "3001234567"
};

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

test("Controlled create validates source fields and defaults one-day end date", () => {
  const normalized = normalizeCreateWorkPayload({
    ...validCreatePayload,
    endDate: "",
    currency: "cop",
    paymentMethod: "wise"
  });

  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.endDate, "2026-08-25");
  assert.equal(normalized.value.currency, "COP");
  assert.equal(normalized.value.paymentMethod, "Wise");
  assert.equal(normalized.value.state, "Pendiente Envio");
  assert.match(normalized.value.recordId, /^adm_[0-9a-f]{32}$/);

  const invalid = normalizeCreateWorkPayload({
    ...validCreatePayload,
    endDate: "2026-08-20",
    currency: "EUR",
    contactNumber: "+57 300 123 4567"
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.endDate, "before_start");
  assert.equal(invalid.errors.currency, "unsupported");
  assert.equal(invalid.errors.contactNumber, "digits_only");
});

test("Controlled create requires every mapped source column but not formula columns", () => {
  const exact = validateCalendarCreateHeaders([...EXPECTED_CALENDAR_HEADERS]);
  assert.equal(exact.ok, true);
  assert.deepEqual(exact.missingFields, []);

  const headers = [...EXPECTED_CALENDAR_HEADERS];
  headers[8] = "Different formula helper";
  assert.equal(validateCalendarCreateHeaders(headers).ok, true);

  headers[17] = "Private notes moved away";
  const missingNotes = validateCalendarCreateHeaders(headers);
  assert.equal(missingNotes.ok, false);
  assert.deepEqual(missingNotes.missingFields, ["Notas"]);
});

test("POST create writes only mapped source columns and never formula-owned columns", async () => {
  const calls = [];
  let batchBody = null;

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });

    if (String(url).includes("oauth2.googleapis.com/token")) {
      return jsonResponse({ access_token: "token" });
    }

    if ((options.method || "GET") === "GET" && String(url).includes("sheets.googleapis.com")) {
      return jsonResponse({ values: [[...EXPECTED_CALENDAR_HEADERS]] });
    }

    if (String(url).includes(":append")) {
      return jsonResponse({ updates: { updatedRange: "REGISTRO!X2" } });
    }

    if (String(url).endsWith("/values:batchUpdate")) {
      batchBody = JSON.parse(options.body);
      return jsonResponse({ totalUpdatedCells: batchBody.data.length });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const request = new Request("https://sdlive.show/api/admin/calendar/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validCreatePayload)
  });

  const response = await handleCalendarApi(request, env, {
    verifyAdmin: async () => ({ email: "admin@sdlive.show" }),
    fetchImpl
  });
  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.ok, true);
  assert.equal(data.created, true);
  assert.equal(data.state, "Pendiente Envio");
  assert.ok(batchBody);

  const ranges = batchBody.data.map((entry) => entry.range);
  for (const expectedRange of ["REGISTRO!A2", "REGISTRO!D2", "REGISTRO!E2", "REGISTRO!F2", "REGISTRO!G2", "REGISTRO!H2", "REGISTRO!K2", "REGISTRO!P2", "REGISTRO!R2", "REGISTRO!X2", "REGISTRO!AA2", "REGISTRO!AB2"]) {
    assert.ok(ranges.includes(expectedRange), `missing ${expectedRange}`);
  }

  for (const forbidden of ["B", "C", "I", "J", "Q", "S", "T", "U", "V", "W", "Z"]) {
    assert.equal(ranges.some((range) => range === `REGISTRO!${forbidden}2`), false, `formula column ${forbidden} was written`);
  }

  const stateWrite = batchBody.data.find((entry) => entry.range === "REGISTRO!K2");
  assert.deepEqual(stateWrite.values, [["Pendiente Envio"]]);
  assert.equal(calls.filter((call) => call.url.includes(":append")).length, 1);
});

test("POST create reuses an existing idempotent row instead of appending a duplicate", async () => {
  const normalized = normalizeCreateWorkPayload(validCreatePayload);
  assert.equal(normalized.ok, true);

  const existing = row({
    "Fecha trabajo": "2026-08-25",
    "Fecha fin": "2026-08-27",
    Cliente: "Client A",
    "Proyecto / Show": "Admin smoke",
    Rol: "A1",
    Moneda: "COP",
    "Valor bruto": 1250000,
    Estado: "Pendiente Envio",
    "Método de pago": "Transferencia",
    Notas: "Controlled create",
    ID: normalized.value.recordId,
    "NUM CONTACTO": "3001234567"
  });

  let appendCalls = 0;
  let batchCalls = 0;
  const fetchImpl = async (url, options = {}) => {
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return jsonResponse({ access_token: "token" });
    }
    if ((options.method || "GET") === "GET" && String(url).includes("sheets.googleapis.com")) {
      return jsonResponse({ values: [[...EXPECTED_CALENDAR_HEADERS], existing] });
    }
    if (String(url).includes(":append")) {
      appendCalls += 1;
      return jsonResponse({ updates: { updatedRange: "REGISTRO!X3" } });
    }
    if (String(url).endsWith("/values:batchUpdate")) {
      batchCalls += 1;
      return jsonResponse({});
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const request = new Request("https://sdlive.show/api/admin/calendar/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validCreatePayload)
  });

  const response = await handleCalendarApi(request, env, {
    verifyAdmin: async () => ({ email: "admin@sdlive.show" }),
    fetchImpl
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.created, false);
  assert.equal(data.idempotentReplay, true);
  assert.equal(appendCalls, 0);
  assert.equal(batchCalls, 1);
});
