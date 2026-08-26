import { fetchGoogleAccessToken } from "./finance-api.js";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const REGISTRO_RANGE = "REGISTRO!A1:AB3000";
const TIME_ZONE = "America/Bogota";
const PRIVATE_ID_KEY = "sdliveRegistroId";
const PRIVATE_SOURCE_KEY = "sdliveSource";
const PRIVATE_SOURCE_VALUE = "REGISTRO";
const MAX_SYNC_WRITES = 35;

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function requiredEnv(env, name) {
  const value = clean(env?.[name]);
  if (!value) throw new Error(`Missing Google Calendar configuration: ${name}`);
  return value;
}

function normalizeHeader(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function validIsoDate(value) {
  const text = clean(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return null;
  return text;
}

function sheetDateToIso(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + Math.round(value * 86400000)).toISOString().slice(0, 10);
  }
  const text = clean(value);
  if (!text) return null;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return validIsoDate(`${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`);
  }
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  let month = first;
  let day = second;
  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  }
  return validIsoDate(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

export function addIsoDays(value, amount) {
  const valid = validIsoDate(value);
  if (!valid) return null;
  const date = new Date(`${valid}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function bogotaDateFromInstant(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentBogotaIso(now = new Date()) {
  return bogotaDateFromInstant(now) || now.toISOString().slice(0, 10);
}

function projectionWindow(now = new Date()) {
  const today = currentBogotaIso(now);
  return {
    startDate: addIsoDays(today, -365),
    endDate: addIsoDays(today, 730)
  };
}

function calendarId(env) {
  return requiredEnv(env, "GOOGLE_CALENDAR_ID");
}

function calendarApiUrl(env, suffix = "") {
  return `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(calendarId(env))}${suffix}`;
}

function googleError(stage, status, data = null) {
  const error = new Error(`Google Calendar ${stage} failed with status ${status}`);
  error.code = status === 401 || status === 403
    ? "google_calendar_scope_or_permission"
    : `google_calendar_http_${status}`;
  error.status = status;
  error.detail = clean(data?.error?.message || data?.error_description || data?.error || "").slice(0, 300);
  return error;
}

export function googleCalendarDiagnostic(error) {
  const code = clean(error?.code) || "google_calendar_unavailable";
  if (code === "google_calendar_scope_or_permission") {
    return {
      available: false,
      code,
      message: "Google Calendar authorization is missing the required calendar scope or calendar permission."
    };
  }
  if (/^Missing Google Calendar configuration:/.test(clean(error?.message))) {
    return {
      available: false,
      code: "google_calendar_configuration_missing",
      message: clean(error.message)
    };
  }
  return {
    available: false,
    code,
    message: clean(error?.message || error || "Google Calendar unavailable").slice(0, 300)
  };
}

async function googleJson(fetchImpl, url, accessToken, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  const response = await fetchImpl(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw googleError("API request", response.status, data);
  return data || {};
}

async function readRegistroProjectionRows(env, fetchImpl = fetch, accessToken = null) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const token = accessToken || await fetchGoogleAccessToken(env, fetchImpl);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER"
  });
  const url = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(REGISTRO_RANGE)}?${params}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Google Sheets Calendar projection read failed with status ${response.status}`);
  const data = await response.json().catch(() => null);
  const values = data?.values;
  if (!Array.isArray(values) || !Array.isArray(values[0])) throw new Error("REGISTRO projection header row unavailable");

  const headers = values[0];
  const index = new Map();
  headers.forEach((header, position) => {
    const key = normalizeHeader(header);
    if (key && !index.has(key)) index.set(key, position);
  });
  const at = (row, name) => row?.[index.get(normalizeHeader(name))];

  return values.slice(1).map((row) => {
    const id = clean(at(row, "ID"));
    const startDate = sheetDateToIso(at(row, "Fecha trabajo"));
    const parsedEnd = sheetDateToIso(at(row, "Fecha fin"));
    const endDate = parsedEnd || startDate;
    if (!id || !startDate || !endDate || endDate < startDate) return null;
    return {
      id,
      startDate,
      endDate,
      client: clean(at(row, "Cliente")),
      project: clean(at(row, "Proyecto / Show")),
      role: clean(at(row, "Rol")),
      state: clean(at(row, "Estado"))
    };
  }).filter(Boolean);
}

export function googleProjectionResource(event) {
  const startDate = validIsoDate(event?.startDate);
  const endDate = validIsoDate(event?.endDate);
  const id = clean(event?.id);
  if (!id || !startDate || !endDate || endDate < startDate) throw new Error("Invalid REGISTRO event for Google Calendar projection");
  const summary = clean(event.project || event.client) || "SD.Live work";
  const lines = [
    clean(event.client) ? `Client: ${clean(event.client)}` : "",
    clean(event.role) ? `Role: ${clean(event.role)}` : "",
    clean(event.state) ? `State: ${clean(event.state)}` : "",
    `REGISTRO ID: ${id}`,
    "Source: SD.Live REGISTRO · projected read-only to Google Calendar"
  ].filter(Boolean);
  return {
    summary,
    description: lines.join("\n"),
    start: { date: startDate },
    end: { date: addIsoDays(endDate, 1) },
    transparency: "opaque",
    extendedProperties: {
      private: {
        [PRIVATE_ID_KEY]: id,
        [PRIVATE_SOURCE_KEY]: PRIVATE_SOURCE_VALUE
      }
    }
  };
}

function comparableGoogleEvent(event) {
  return JSON.stringify({
    summary: clean(event?.summary),
    description: clean(event?.description),
    start: event?.start?.date || "",
    end: event?.end?.date || "",
    transparency: event?.transparency || "opaque",
    registroId: clean(event?.extendedProperties?.private?.[PRIVATE_ID_KEY]),
    source: clean(event?.extendedProperties?.private?.[PRIVATE_SOURCE_KEY])
  });
}

async function listGoogleEvents(env, accessToken, { startDate, endDate, privateId = null } = {}, fetchImpl = fetch) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeZone: TIME_ZONE
  });
  if (startDate) params.set("timeMin", `${startDate}T00:00:00-05:00`);
  if (endDate) params.set("timeMax", `${addIsoDays(endDate, 1)}T00:00:00-05:00`);
  if (privateId) params.append("privateExtendedProperty", `${PRIVATE_ID_KEY}=${privateId}`);
  return googleJson(fetchImpl, `${calendarApiUrl(env, "/events")}?${params}`, accessToken);
}

export async function upsertGoogleCalendarProjection(env, event, { fetchImpl = fetch, accessToken = null, knownEvent = null } = {}) {
  const token = accessToken || await fetchGoogleAccessToken(env, fetchImpl);
  const resource = googleProjectionResource(event);
  let existing = knownEvent;
  if (!existing) {
    const lookup = await listGoogleEvents(env, token, {
      startDate: event.startDate,
      endDate: event.endDate,
      privateId: event.id
    }, fetchImpl);
    existing = Array.isArray(lookup.items) ? lookup.items[0] : null;
  }
  if (existing && comparableGoogleEvent(existing) === comparableGoogleEvent(resource)) {
    return { action: "unchanged", eventId: existing.id, htmlLink: existing.htmlLink || null };
  }
  if (existing?.id) {
    const updated = await googleJson(
      fetchImpl,
      `${calendarApiUrl(env, `/events/${encodeURIComponent(existing.id)}`)}?sendUpdates=none`,
      token,
      { method: "PATCH", body: JSON.stringify(resource) }
    );
    return { action: "updated", eventId: updated.id || existing.id, htmlLink: updated.htmlLink || existing.htmlLink || null };
  }
  const created = await googleJson(
    fetchImpl,
    `${calendarApiUrl(env, "/events")}?sendUpdates=none`,
    token,
    { method: "POST", body: JSON.stringify(resource) }
  );
  return { action: "created", eventId: created.id || null, htmlLink: created.htmlLink || null };
}

function normalizedGoogleDates(item) {
  if (item?.start?.date) {
    const startDate = validIsoDate(item.start.date);
    const exclusiveEnd = validIsoDate(item?.end?.date) || addIsoDays(startDate, 1);
    return {
      startDate,
      endDate: addIsoDays(exclusiveEnd, -1) || startDate
    };
  }
  const startDate = bogotaDateFromInstant(item?.start?.dateTime);
  if (!startDate) return null;
  let endDate = startDate;
  const endInstant = new Date(item?.end?.dateTime || item?.start?.dateTime);
  if (!Number.isNaN(endInstant.getTime())) {
    endInstant.setMilliseconds(endInstant.getMilliseconds() - 1);
    endDate = bogotaDateFromInstant(endInstant) || startDate;
  }
  return { startDate, endDate: endDate < startDate ? startDate : endDate };
}

export function normalizeGoogleCalendarOverlay(items) {
  const overlay = [];
  let projectedFiltered = 0;
  for (const item of Array.isArray(items) ? items : []) {
    if (clean(item?.status).toLowerCase() === "cancelled") continue;
    const registroId = clean(item?.extendedProperties?.private?.[PRIVATE_ID_KEY]);
    if (registroId) {
      projectedFiltered += 1;
      continue;
    }
    const dates = normalizedGoogleDates(item);
    if (!dates?.startDate || !dates?.endDate) continue;
    const summary = clean(item?.summary) || "Google Calendar event";
    overlay.push({
      id: `gcal_${clean(item.id)}`,
      googleEventId: clean(item.id),
      googleHtmlLink: clean(item.htmlLink) || null,
      startDate: dates.startDate,
      endDate: dates.endDate,
      client: "Google Calendar",
      project: `GCal · ${summary}`,
      role: "",
      currency: "",
      state: "Calendar",
      source: "google-calendar",
      multiDay: dates.endDate !== dates.startDate,
      dateIssue: null
    });
  }
  overlay.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.project.localeCompare(b.project));
  return { events: overlay, projectedFiltered };
}

export async function readGoogleCalendarOverlay(env, { fetchImpl = fetch, now = new Date() } = {}) {
  const token = await fetchGoogleAccessToken(env, fetchImpl);
  const window = projectionWindow(now);
  const data = await listGoogleEvents(env, token, window, fetchImpl);
  const normalized = normalizeGoogleCalendarOverlay(data.items);
  return {
    ...normalized,
    available: true,
    calendarId: calendarId(env),
    timeZone: TIME_ZONE,
    window
  };
}

export async function syncRegistroToGoogleCalendar(env, { fetchImpl = fetch, now = new Date() } = {}) {
  const token = await fetchGoogleAccessToken(env, fetchImpl);
  const window = projectionWindow(now);
  const source = (await readRegistroProjectionRows(env, fetchImpl, token)).filter(
    (event) => event.endDate >= window.startDate && event.startDate <= window.endDate
  );
  const existingData = await listGoogleEvents(env, token, window, fetchImpl);
  const existingByRegistroId = new Map();
  for (const item of Array.isArray(existingData.items) ? existingData.items : []) {
    const id = clean(item?.extendedProperties?.private?.[PRIVATE_ID_KEY]);
    if (id && !existingByRegistroId.has(id)) existingByRegistroId.set(id, item);
  }

  const result = {
    available: true,
    calendarId: calendarId(env),
    scanned: source.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    capped: false,
    errors: []
  };
  let writes = 0;

  for (const event of source) {
    const existing = existingByRegistroId.get(event.id) || null;
    if (writes >= MAX_SYNC_WRITES) {
      const desired = googleProjectionResource(event);
      if (!existing || comparableGoogleEvent(existing) !== comparableGoogleEvent(desired)) {
        result.capped = true;
        continue;
      }
    }
    try {
      const action = await upsertGoogleCalendarProjection(env, event, {
        fetchImpl,
        accessToken: token,
        knownEvent: existing
      });
      if (action.action === "created" || action.action === "updated") writes += 1;
      result[action.action] += 1;
    } catch (error) {
      result.failed += 1;
      if (result.errors.length < 5) result.errors.push({ id: event.id, ...googleCalendarDiagnostic(error) });
    }
  }
  return result;
}

export async function projectCreatedWorkToGoogleCalendar(env, requestPayload, { fetchImpl = fetch } = {}) {
  const requestId = clean(requestPayload?.requestId).toLowerCase();
  const id = /^[-0-9a-f]{36}$/.test(requestId) ? `adm_${requestId.replace(/-/g, "")}` : "";
  const event = {
    id,
    startDate: validIsoDate(requestPayload?.startDate),
    endDate: validIsoDate(requestPayload?.endDate) || validIsoDate(requestPayload?.startDate),
    client: clean(requestPayload?.client),
    project: clean(requestPayload?.project),
    role: clean(requestPayload?.role),
    state: "Pendiente Envio"
  };
  return upsertGoogleCalendarProjection(env, event, { fetchImpl });
}

export async function mergeGoogleCalendarOverlayResponse(response, env, { fetchImpl = fetch } = {}) {
  if (!response?.ok || !(response.headers.get("content-type") || "").includes("application/json")) return response;
  const data = await response.json().catch(() => null);
  if (!data?.ok || !Array.isArray(data.events)) return new Response(JSON.stringify(data), { status: response.status, headers: response.headers });

  try {
    const overlay = await readGoogleCalendarOverlay(env, { fetchImpl });
    const events = [...data.events, ...overlay.events].sort((a, b) =>
      clean(a.startDate).localeCompare(clean(b.startDate)) || clean(a.project || a.client).localeCompare(clean(b.project || b.client))
    );
    return new Response(JSON.stringify({
      ...data,
      count: events.length,
      events,
      googleCalendar: {
        available: true,
        calendarId: overlay.calendarId,
        overlayCount: overlay.events.length,
        projectedFiltered: overlay.projectedFiltered,
        timeZone: overlay.timeZone,
        window: overlay.window,
        mode: "registro-projection-plus-readonly-overlay"
      }
    }), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ...data,
      googleCalendar: {
        ...googleCalendarDiagnostic(error),
        calendarId: clean(env?.GOOGLE_CALENDAR_ID) || null,
        mode: "registro-only-degraded"
      }
    }), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}
