import { fetchGoogleAccessToken } from "./finance-api.js";

const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const CALENDAR_SHEET = "REGISTRO";
const CALENDAR_RANGE = `${CALENDAR_SHEET}!A1:AB3000`;
const CREATE_INITIAL_STATE = "Pendiente Envio";
const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);
const SUPPORTED_PAYMENT_METHODS = Object.freeze([
  "Transferencia",
  "Wise",
  "PayPal",
  "Efectivo",
  "Otro"
]);

export const EXPECTED_CALENDAR_HEADERS = Object.freeze([
  "Fecha trabajo",
  "Mes",
  "Año",
  "Cliente",
  "Proyecto / Show",
  "Rol",
  "Moneda",
  "Valor bruto",
  "Impuestos / Fees",
  "Valor Neto",
  "Estado",
  "Fecha cuenta enviada",
  "Fecha evaluación",
  "Fecha firma",
  "Fecha pago",
  "Método de pago",
  "Días sin pagar",
  "Notas",
  "Month Number",
  "Año Pago",
  "Month Number (pago)",
  "Mes de pago",
  "Rango Aging",
  "ID",
  "Valor Recibido",
  "MES PAGO KEY",
  "NUM CONTACTO",
  "Fecha fin"
]);

const REQUIRED_CALENDAR_FIELDS = Object.freeze([
  "Fecha trabajo",
  "Fecha fin",
  "Cliente",
  "Proyecto / Show",
  "Rol",
  "Moneda",
  "Estado",
  "ID"
]);

const CREATE_WRITE_FIELDS = Object.freeze([
  "Fecha trabajo",
  "Cliente",
  "Proyecto / Show",
  "Rol",
  "Moneda",
  "Valor bruto",
  "Estado",
  "Método de pago",
  "Notas",
  "ID",
  "NUM CONTACTO",
  "Fecha fin"
]);

const DEFAULT_FIELD_INDEX = Object.freeze(
  Object.fromEntries(
    EXPECTED_CALENDAR_HEADERS.map((header, index) => [header, index])
  )
);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function requiredEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`Missing calendar configuration: ${name}`);
  return value;
}

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeHeader(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function fieldIndexFor(headers, fields) {
  if (!Array.isArray(headers)) return null;

  const byNormalizedHeader = new Map();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !byNormalizedHeader.has(normalized)) {
      byNormalizedHeader.set(normalized, index);
    }
  });

  return Object.fromEntries(
    fields.map((field) => [
      field,
      byNormalizedHeader.get(normalizeHeader(field))
    ])
  );
}

function calendarFieldIndex(headers) {
  return fieldIndexFor(headers, REQUIRED_CALENDAR_FIELDS);
}

function createFieldIndex(headers) {
  return fieldIndexFor(headers, CREATE_WRITE_FIELDS);
}

function recordCell(row, field, fieldIndex = DEFAULT_FIELD_INDEX) {
  const index = fieldIndex?.[field];
  if (!Number.isInteger(index)) return undefined;
  return row?.[index];
}

function hasPersistedId(row, fieldIndex) {
  return Boolean(cleanString(recordCell(row, "ID", fieldIndex)));
}

function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function inputIsoDate(value) {
  const text = cleanString(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const normalized = isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  return normalized === text ? normalized : null;
}

function sheetSerialFromIso(value) {
  const parsed = inputIsoDate(value);
  if (!parsed) return null;
  const [year, month, day] = parsed.split("-").map(Number);
  const epoch = Date.UTC(1899, 11, 30);
  return (Date.UTC(year, month - 1, day) - epoch) / 86400000;
}

function canonicalPaymentMethod(value) {
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) return "";
  return SUPPORTED_PAYMENT_METHODS.find(
    (method) => method.toLowerCase() === normalized
  ) || null;
}

function columnLetter(index) {
  if (!Number.isInteger(index) || index < 0) return null;
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function parseAppendedRow(updatedRange) {
  const match = cleanString(updatedRange).match(/![A-Z]+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function sheetsWriteError(stage, status) {
  const error = new Error(`Google Sheets calendar ${stage} failed with status ${status}`);
  error.code = `sheets_write_http_${status}`;
  return error;
}

export function sheetDateToIso(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + Math.round(value * 86400000));
    if (Number.isNaN(date.getTime())) return null;
    return isoDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  const text = cleanString(value);
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    let day = first;
    let month = second;

    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    }

    return isoDate(year, month, day);
  }

  return null;
}

export function validateCalendarHeaders(headers) {
  if (!Array.isArray(headers)) {
    return {
      ok: false,
      columnCount: 0,
      missingFields: [...REQUIRED_CALENDAR_FIELDS],
      fieldIndex: null
    };
  }

  const fieldIndex = calendarFieldIndex(headers);
  const missingFields = REQUIRED_CALENDAR_FIELDS.filter(
    (field) => !Number.isInteger(fieldIndex?.[field])
  );

  return {
    ok: missingFields.length === 0,
    columnCount: headers.length,
    missingFields,
    fieldIndex
  };
}

export function validateCalendarCreateHeaders(headers) {
  if (!Array.isArray(headers)) {
    return {
      ok: false,
      columnCount: 0,
      missingFields: [...CREATE_WRITE_FIELDS],
      fieldIndex: null
    };
  }

  const fieldIndex = createFieldIndex(headers);
  const missingFields = CREATE_WRITE_FIELDS.filter(
    (field) => !Number.isInteger(fieldIndex?.[field])
  );

  return {
    ok: missingFields.length === 0,
    columnCount: headers.length,
    missingFields,
    fieldIndex
  };
}

export function normalizeCreateWorkPayload(payload) {
  const body = payload && typeof payload === "object" ? payload : {};
  const errors = {};

  const requestId = cleanString(body.requestId).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) {
    errors.requestId = "invalid";
  }

  const startDate = inputIsoDate(body.startDate);
  if (!startDate) errors.startDate = "invalid";

  const rawEnd = cleanString(body.endDate);
  const endDate = rawEnd ? inputIsoDate(rawEnd) : startDate;
  if (!endDate) errors.endDate = "invalid";
  if (startDate && endDate && endDate < startDate) errors.endDate = "before_start";

  const client = cleanString(body.client);
  if (!client || client.length > 160) errors.client = !client ? "required" : "too_long";

  const project = cleanString(body.project);
  if (!project || project.length > 200) errors.project = !project ? "required" : "too_long";

  const role = cleanString(body.role);
  if (role.length > 160) errors.role = "too_long";

  const currency = cleanString(body.currency).toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(currency)) errors.currency = "unsupported";

  const grossAmount = body.grossAmount === "" || body.grossAmount === null || body.grossAmount === undefined
    ? null
    : Number(body.grossAmount);
  if (grossAmount === null || !Number.isFinite(grossAmount) || grossAmount < 0) {
    errors.grossAmount = "invalid";
  }

  const paymentMethod = canonicalPaymentMethod(body.paymentMethod);
  if (paymentMethod === null) errors.paymentMethod = "unsupported";

  const notes = cleanString(body.notes);
  if (notes.length > 3000) errors.notes = "too_long";

  const contactNumber = cleanString(body.contactNumber);
  if (contactNumber && !/^\d{7,20}$/.test(contactNumber)) {
    errors.contactNumber = "digits_only";
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: {},
    value: {
      requestId,
      recordId: `adm_${requestId.replace(/-/g, "")}`,
      startDate,
      endDate,
      client,
      project,
      role,
      currency,
      grossAmount,
      paymentMethod,
      notes,
      contactNumber,
      state: CREATE_INITIAL_STATE
    }
  };
}

export function normalizeCalendarRows(rows, fieldIndex = DEFAULT_FIELD_INDEX) {
  const sourceRows = Array.isArray(rows)
    ? rows.filter((row) => hasPersistedId(row, fieldIndex))
    : [];
  const events = [];
  const quality = {
    missingStartDate: 0,
    invalidEndDate: 0,
    endBeforeStart: 0
  };

  for (const row of sourceRows) {
    const startDate = sheetDateToIso(recordCell(row, "Fecha trabajo", fieldIndex));
    if (!startDate) {
      quality.missingStartDate += 1;
      continue;
    }

    const rawEnd = recordCell(row, "Fecha fin", fieldIndex);
    const parsedEnd = sheetDateToIso(rawEnd);
    let endDate = parsedEnd || startDate;
    let dateIssue = null;

    if (cleanString(rawEnd) && !parsedEnd) {
      quality.invalidEndDate += 1;
      dateIssue = "invalid_end_date";
      endDate = startDate;
    }

    if (endDate < startDate) {
      quality.endBeforeStart += 1;
      dateIssue = "end_before_start";
      endDate = startDate;
    }

    events.push({
      startDate,
      endDate,
      client: cleanString(recordCell(row, "Cliente", fieldIndex)),
      project: cleanString(recordCell(row, "Proyecto / Show", fieldIndex)),
      role: cleanString(recordCell(row, "Rol", fieldIndex)),
      currency: cleanString(recordCell(row, "Moneda", fieldIndex)),
      state: cleanString(recordCell(row, "Estado", fieldIndex)),
      multiDay: endDate !== startDate,
      dateIssue
    });
  }

  events.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.endDate !== b.endDate) return b.endDate.localeCompare(a.endDate);
    return (a.project || a.client).localeCompare(b.project || b.client);
  });

  return { events, quality };
}

async function readCalendarValues(env, fetchImpl = fetch, accessToken = null) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const token = accessToken || await fetchGoogleAccessToken(env, fetchImpl);
  const spreadsheet = encodeURIComponent(spreadsheetId);
  const range = encodeURIComponent(CALENDAR_RANGE);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER"
  });

  const response = await fetchImpl(
    `${GOOGLE_SHEETS_API_BASE}/${spreadsheet}/values/${range}?${params}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets calendar read failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const values = data?.values;
  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    throw new Error("Google Sheets returned no REGISTRO calendar header row");
  }

  return {
    headers: values[0],
    rows: values.slice(1)
  };
}

function expectedCreateValues(input) {
  return {
    "Fecha trabajo": input.startDate,
    "Cliente": input.client,
    "Proyecto / Show": input.project,
    "Rol": input.role,
    "Moneda": input.currency,
    "Valor bruto": input.grossAmount,
    "Estado": input.state,
    "Método de pago": input.paymentMethod,
    "Notas": input.notes,
    "ID": input.recordId,
    "NUM CONTACTO": input.contactNumber,
    "Fecha fin": input.endDate
  };
}

function comparableCreateValue(field, rawValue) {
  if (field === "Fecha trabajo" || field === "Fecha fin") {
    return sheetDateToIso(rawValue) || "";
  }
  if (field === "Valor bruto") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) return "";
    const number = Number(rawValue);
    return Number.isFinite(number) ? number : cleanString(rawValue);
  }
  if (field === "Moneda") return cleanString(rawValue).toUpperCase();
  return cleanString(rawValue);
}

function createRowConflicts(row, input, fieldIndex) {
  const expected = expectedCreateValues(input);
  const conflicts = [];

  for (const field of CREATE_WRITE_FIELDS) {
    const raw = recordCell(row, field, fieldIndex);
    const actualBlank = raw === "" || raw === null || raw === undefined;
    if (actualBlank) continue;

    const actual = comparableCreateValue(field, raw);
    const wanted = comparableCreateValue(field, expected[field]);
    if (actual !== wanted) conflicts.push(field);
  }

  return conflicts;
}

async function appendRecordId(env, accessToken, recordId, idIndex, fetchImpl) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const spreadsheet = encodeURIComponent(spreadsheetId);
  const idColumn = columnLetter(idIndex);
  if (!idColumn) throw new Error("Could not resolve REGISTRO ID column");
  const range = encodeURIComponent(`${CALENDAR_SHEET}!${idColumn}2:${idColumn}`);
  const params = new URLSearchParams({
    valueInputOption: "RAW",
    insertDataOption: "OVERWRITE"
  });

  const response = await fetchImpl(
    `${GOOGLE_SHEETS_API_BASE}/${spreadsheet}/values/${range}:append?${params}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [[recordId]]
      })
    }
  );

  if (!response.ok) throw sheetsWriteError("append", response.status);
  const data = await response.json().catch(() => null);
  const rowNumber = parseAppendedRow(data?.updates?.updatedRange);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error("Google Sheets calendar append returned no row number");
  }
  return rowNumber;
}

async function writeCreateValues(env, accessToken, rowNumber, input, fieldIndex, fetchImpl) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const spreadsheet = encodeURIComponent(spreadsheetId);
  const expected = expectedCreateValues(input);
  const data = [];

  for (const field of CREATE_WRITE_FIELDS) {
    const value = expected[field];
    if ((value === "" || value === null || value === undefined) && field !== "ID") continue;
    const index = fieldIndex[field];
    const column = columnLetter(index);
    if (!column) throw new Error(`Could not resolve REGISTRO column: ${field}`);

    let writeValue = value;
    if (field === "Fecha trabajo" || field === "Fecha fin") {
      writeValue = sheetSerialFromIso(value);
    }

    data.push({
      range: `${CALENDAR_SHEET}!${column}${rowNumber}`,
      majorDimension: "ROWS",
      values: [[writeValue]]
    });
  }

  const response = await fetchImpl(
    `${GOOGLE_SHEETS_API_BASE}/${spreadsheet}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        includeValuesInResponse: false,
        data
      })
    }
  );

  if (!response.ok) throw sheetsWriteError("batch update", response.status);
}

async function handleCalendarCreate(request, env, fetchImpl) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const normalized = normalizeCreateWorkPayload(body);
  if (!normalized.ok) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid work entry",
        fields: normalized.errors
      },
      400
    );
  }

  const input = normalized.value;
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const { headers, rows } = await readCalendarValues(env, fetchImpl, accessToken);
  const headerCheck = validateCalendarCreateHeaders(headers);

  if (!headerCheck.ok) {
    return jsonResponse(
      {
        ok: false,
        error: "Calendar create schema mismatch",
        schema: {
          ok: false,
          columnCount: headerCheck.columnCount,
          missingFields: headerCheck.missingFields
        }
      },
      503
    );
  }

  const existingIndex = rows.findIndex(
    (row) => cleanString(recordCell(row, "ID", headerCheck.fieldIndex)) === input.recordId
  );

  let rowNumber;
  let created = false;

  if (existingIndex >= 0) {
    const conflicts = createRowConflicts(rows[existingIndex], input, headerCheck.fieldIndex);
    if (conflicts.length) {
      return jsonResponse(
        {
          ok: false,
          error: "Idempotency key conflict",
          fields: conflicts
        },
        409
      );
    }
    rowNumber = existingIndex + 2;
  } else {
    rowNumber = await appendRecordId(
      env,
      accessToken,
      input.recordId,
      headerCheck.fieldIndex.ID,
      fetchImpl
    );
    created = true;
  }

  await writeCreateValues(
    env,
    accessToken,
    rowNumber,
    input,
    headerCheck.fieldIndex,
    fetchImpl
  );

  return jsonResponse({
    ok: true,
    created,
    idempotentReplay: !created,
    source: CALENDAR_SHEET,
    startDate: input.startDate,
    endDate: input.endDate,
    state: input.state
  }, created ? 201 : 200);
}

export async function handleCalendarApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch } = {}
) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (path !== "/api/admin/calendar/events") return null;

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  if (typeof verifyAdmin !== "function") {
    return jsonResponse({ ok: false, error: "Calendar auth unavailable" }, 503);
  }

  const user = await verifyAdmin(request, env);
  if (!user?.email) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 403);
  }

  try {
    if (request.method === "POST") {
      return await handleCalendarCreate(request, env, fetchImpl);
    }

    const { headers, rows } = await readCalendarValues(env, fetchImpl);
    const headerCheck = validateCalendarHeaders(headers);

    if (!headerCheck.ok) {
      return jsonResponse(
        {
          ok: false,
          error: "Calendar source schema mismatch",
          schema: {
            ok: false,
            columnCount: headerCheck.columnCount,
            missingFields: headerCheck.missingFields
          }
        },
        503
      );
    }

    const { events, quality } = normalizeCalendarRows(
      rows,
      headerCheck.fieldIndex
    );

    return jsonResponse({
      ok: true,
      readOnly: true,
      source: CALENDAR_SHEET,
      timeZone: "America/Bogota",
      generatedAt: new Date().toISOString(),
      count: events.length,
      quality,
      events
    });
  } catch (error) {
    console.error("Calendar operation failed", error);

    if (error?.code?.startsWith("sheets_write_http_")) {
      return jsonResponse(
        {
          ok: false,
          error: "Could not create work entry",
          code: error.code
        },
        503
      );
    }

    return jsonResponse(
      {
        ok: false,
        error: request.method === "POST"
          ? "Could not create work entry"
          : "Could not read Calendar data"
      },
      503
    );
  }
}
