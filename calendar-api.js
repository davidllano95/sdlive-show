import { fetchGoogleAccessToken } from "./finance-api.js";

const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const CALENDAR_RANGE = "REGISTRO!A1:AB3000";

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

function calendarFieldIndex(headers) {
  if (!Array.isArray(headers)) return null;

  const byNormalizedHeader = new Map();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !byNormalizedHeader.has(normalized)) {
      byNormalizedHeader.set(normalized, index);
    }
  });

  return Object.fromEntries(
    REQUIRED_CALENDAR_FIELDS.map((field) => [
      field,
      byNormalizedHeader.get(normalizeHeader(field))
    ])
  );
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

async function readCalendarValues(env, fetchImpl = fetch) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
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
        Authorization: `Bearer ${accessToken}`,
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

export async function handleCalendarApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch } = {}
) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (path !== "/api/admin/calendar/events") return null;

  if (request.method !== "GET") {
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
      source: "REGISTRO",
      timeZone: "America/Bogota",
      generatedAt: new Date().toISOString(),
      count: events.length,
      quality,
      events
    });
  } catch (error) {
    console.error("Calendar read failed", error);
    return jsonResponse(
      {
        ok: false,
        error: "Could not read Calendar data"
      },
      503
    );
  }
}
