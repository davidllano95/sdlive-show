const FINANCE_UPSTREAM_TIMEOUT_MS = 7000;
const GOOGLE_SHEETS_HOST = "sheets.googleapis.com";
const DATE_HEADERS = new Set([
  "fecha trabajo",
  "fecha cuenta enviada",
  "fecha evaluacion",
  "fecha firma",
  "fecha pago",
  "fecha fin"
]);

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function validUtcDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formattedSheetDateToSerial(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return value;

  let year;
  let month;
  let day;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (!match) return value;
    const first = Number(match[1]);
    const second = Number(match[2]);
    year = Number(match[3]);

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }
  }

  const date = validUtcDate(year, month, day);
  if (!date) return value;
  const sheetEpoch = Date.UTC(1899, 11, 30);
  return Math.round((date.getTime() - sheetEpoch) / 86400000);
}

export function normalizeFinanceDateValues(values) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return values;
  const indexes = values[0]
    .map((header, index) => DATE_HEADERS.has(normalizeHeader(header)) ? index : -1)
    .filter((index) => index >= 0);

  if (!indexes.length) return values;

  return values.map((row, rowIndex) => {
    if (rowIndex === 0 || !Array.isArray(row)) return row;
    const next = [...row];
    indexes.forEach((index) => {
      if (index < next.length) next[index] = formattedSheetDateToSerial(next[index]);
    });
    return next;
  });
}

export function financeUpstreamUrl(input) {
  const raw = typeof input === "string" ? input : input?.url || String(input);
  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  if (url.hostname === GOOGLE_SHEETS_HOST) {
    url.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");
  }
  return url.toString();
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FINANCE_UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Finance upstream request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function financeUpstreamFetch(input, init = {}) {
  const target = financeUpstreamUrl(input);
  const response = await fetchWithTimeout(target, init);

  let parsed;
  try {
    const url = new URL(target);
    if (url.hostname !== GOOGLE_SHEETS_HOST || !response.ok) return response;
    parsed = await response.clone().json();
  } catch {
    return response;
  }

  if (!Array.isArray(parsed?.values)) return response;
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({
    ...parsed,
    values: normalizeFinanceDateValues(parsed.values)
  }), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
