import { fetchGoogleAccessToken } from "./finance-api.js";
import { normalizeCalendarRows } from "./calendar-api.js";
import {
  addIsoDays,
  googleCalendarDiagnostic,
  syncRegistroToGoogleCalendar
} from "./google-calendar-integration.js";
import { calendarEventKey, readSiteSchedule } from "./site-schedule-api.js";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const REGISTRO_RANGE = "REGISTRO!A1:AB3000";
const TIME_ZONE = "America/Bogota";
const PRIVATE_ID_KEY = "sdliveRegistroId";
const PRIVATE_SOURCE_KEY = "sdliveSource";
const PRIVATE_SOURCE_REGISTRO = "REGISTRO";
const PRIVATE_SOURCE_SITE_SCHEDULE = "SITE_SCHEDULE";
const PRIVATE_EVENT_KEY = "sdliveSiteScheduleEventKey";
const PRIVATE_BLOCK_KEY = "sdliveSiteScheduleBlockId";
const MAX_SITE_SCHEDULE_WRITES = 35;
const MAX_COMBINED_SYNC_WRITES = 40;

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

function normalizeIdentity(value) {
  return clean(value).normalize("NFKC").replace(/\s+/g, " ").toLowerCase();
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
  let day = first;
  let month = second;
  if (first <= 12 && second > 12) {
    month = first;
    day = second;
  }
  return validIsoDate(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
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
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function projectionWindow(now = new Date()) {
  const today = bogotaDateFromInstant(now) || now.toISOString().slice(0, 10);
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

function googleError(status, data = null) {
  const error = new Error(`Google Calendar Site Schedule projection failed with status ${status}`);
  error.code = status === 401 || status === 403
    ? "google_calendar_scope_or_permission"
    : `google_calendar_http_${status}`;
  error.status = status;
  error.detail = clean(data?.error?.message || data?.error_description || data?.error || "").slice(0, 300);
  return error;
}

async function googleJson(fetchImpl, url, accessToken, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  const response = await fetchImpl(url, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw googleError(response.status, data);
  return data || {};
}

async function readRegistroRows(env, fetchImpl, accessToken) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER"
  });
  const url = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(REGISTRO_RANGE)}?${params}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Google Sheets Site Schedule projection read failed with status ${response.status}`);
  const data = await response.json().catch(() => null);
  const values = data?.values;
  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    throw new Error("REGISTRO Site Schedule projection header row unavailable");
  }

  const headers = values[0];
  const index = new Map();
  headers.forEach((header, position) => {
    const key = normalizeHeader(header);
    if (key && !index.has(key)) index.set(key, position);
  });
  const fieldIndex = Object.fromEntries(
    ["Fecha trabajo", "Fecha fin", "Cliente", "Proyecto / Show", "Rol", "Moneda", "Estado", "ID"]
      .map((field) => [field, index.get(normalizeHeader(field))])
  );
  const idIndex = fieldIndex.ID;

  return values.slice(1).map((row) => {
    if (!Number.isInteger(idIndex)) return null;
    const id = clean(row?.[idIndex]);
    if (!id) return null;
    const normalized = normalizeCalendarRows([row], fieldIndex).events[0] || null;
    return normalized ? { id, ...normalized } : null;
  }).filter(Boolean);
}

async function listGoogleEvents(env, accessToken, window, fetchImpl) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeZone: TIME_ZONE,
    timeMin: `${window.startDate}T00:00:00-05:00`,
    timeMax: `${addIsoDays(window.endDate, 1)}T00:00:00-05:00`
  });
  return googleJson(fetchImpl, `${calendarApiUrl(env, "/events")}?${params}`, accessToken);
}

function blockIdentity(eventKey, segmentId) {
  return `${clean(eventKey)}:${clean(segmentId)}`;
}

export function siteScheduleBlockResource(sourceEvent, eventKey, override, segment, index = 0) {
  const startDate = validIsoDate(segment?.startDate);
  const endDate = validIsoDate(segment?.endDate);
  const segmentId = clean(segment?.id) || `segment_${index + 1}`;
  if (!sourceEvent?.id || !startDate || !endDate || endDate < startDate) {
    throw new Error("Invalid Site Schedule block for Google Calendar projection");
  }

  const summary = clean(override?.label || sourceEvent.project || sourceEvent.client) || "SD.Live website block";
  const location = clean(segment?.location);
  const lines = [
    clean(override?.client || sourceEvent.client) ? `Client: ${clean(override?.client || sourceEvent.client)}` : "",
    `Website block: ${segmentId}`,
    segment?.showDay === true ? "Show Day: enabled" : "Show Day: disabled",
    location ? `Location: ${location}` : "",
    `REGISTRO ID: ${sourceEvent.id}`,
    "Source: SD.Live Site Schedule · projected read-only to Google Calendar"
  ].filter(Boolean);

  return {
    summary,
    description: lines.join("\n"),
    location: location || undefined,
    start: { date: startDate },
    end: { date: addIsoDays(endDate, 1) },
    transparency: "opaque",
    extendedProperties: {
      private: {
        [PRIVATE_ID_KEY]: sourceEvent.id,
        [PRIVATE_SOURCE_KEY]: PRIVATE_SOURCE_SITE_SCHEDULE,
        [PRIVATE_EVENT_KEY]: eventKey,
        [PRIVATE_BLOCK_KEY]: blockIdentity(eventKey, segmentId)
      }
    }
  };
}

function comparableGoogleEvent(event) {
  const privateProps = event?.extendedProperties?.private || {};
  return JSON.stringify({
    summary: clean(event?.summary),
    description: clean(event?.description),
    location: clean(event?.location),
    start: event?.start?.date || "",
    end: event?.end?.date || "",
    transparency: event?.transparency || "opaque",
    registroId: clean(privateProps[PRIVATE_ID_KEY]),
    source: clean(privateProps[PRIVATE_SOURCE_KEY]),
    eventKey: clean(privateProps[PRIVATE_EVENT_KEY]),
    blockId: clean(privateProps[PRIVATE_BLOCK_KEY])
  });
}

function legacyOverrideForSourceEvent(sourceEvent, overrides) {
  const sourceLabel = normalizeIdentity(sourceEvent.project || sourceEvent.client);
  const sourceClient = normalizeIdentity(sourceEvent.client);
  const candidates = Object.entries(overrides).filter(([, override]) => {
    if (!override || !Array.isArray(override.segments) || !override.segments.length) return false;
    if (validIsoDate(override.sourceStartDate) !== sourceEvent.startDate) return false;
    if (validIsoDate(override.sourceEndDate) !== sourceEvent.endDate) return false;
    if (normalizeIdentity(override.client) !== sourceClient) return false;
    if (normalizeIdentity(override.label) !== sourceLabel) return false;
    return true;
  });
  if (candidates.length !== 1) return null;
  return { eventKey: candidates[0][0], override: candidates[0][1] };
}

function resolvedOverrideForSourceEvent(sourceEvent, overrides) {
  const eventKey = calendarEventKey(sourceEvent);
  const exact = overrides[eventKey];
  if (exact && Array.isArray(exact.segments) && exact.segments.length) {
    return { eventKey, override: exact, match: "event-key" };
  }
  const legacy = legacyOverrideForSourceEvent(sourceEvent, overrides);
  return legacy ? { ...legacy, match: "legacy-metadata" } : null;
}

function desiredBlocksForSource(sourceEvents, schedule, window) {
  const desired = [];
  const overriddenRegistroIds = new Set();
  const overrides = schedule?.overrides || {};
  let legacyMatchedOverrides = 0;

  for (const sourceEvent of sourceEvents) {
    if (sourceEvent.endDate < window.startDate || sourceEvent.startDate > window.endDate) continue;
    const resolved = resolvedOverrideForSourceEvent(sourceEvent, overrides);
    if (!resolved) continue;
    const { eventKey, override, match } = resolved;
    if (match === "legacy-metadata") legacyMatchedOverrides += 1;

    overriddenRegistroIds.add(sourceEvent.id);
    override.segments.forEach((segment, index) => {
      const resource = siteScheduleBlockResource(sourceEvent, eventKey, override, segment, index);
      const privateProps = resource.extendedProperties.private;
      desired.push({
        blockId: privateProps[PRIVATE_BLOCK_KEY],
        registroId: sourceEvent.id,
        eventKey,
        resource
      });
    });
  }

  return { desired, overriddenRegistroIds, legacyMatchedOverrides };
}

async function createGoogleEvent(env, accessToken, resource, fetchImpl) {
  return googleJson(
    fetchImpl,
    `${calendarApiUrl(env, "/events")}?sendUpdates=none`,
    accessToken,
    { method: "POST", body: JSON.stringify(resource) }
  );
}

async function patchGoogleEvent(env, accessToken, eventId, resource, fetchImpl) {
  return googleJson(
    fetchImpl,
    `${calendarApiUrl(env, `/events/${encodeURIComponent(eventId)}`)}?sendUpdates=none`,
    accessToken,
    { method: "PATCH", body: JSON.stringify(resource) }
  );
}

async function deleteGoogleEvent(env, accessToken, eventId, fetchImpl) {
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json"
  });
  const response = await fetchImpl(
    `${calendarApiUrl(env, `/events/${encodeURIComponent(eventId)}`)}?sendUpdates=none`,
    { method: "DELETE", headers }
  );
  if (response.status === 204 || response.status === 404 || response.status === 410) return;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw googleError(response.status, data);
}

function boundedWriteLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MAX_SITE_SCHEDULE_WRITES;
  return Math.max(0, Math.min(MAX_SITE_SCHEDULE_WRITES, Math.floor(parsed)));
}

export async function syncSiteScheduleToGoogleCalendar(
  env,
  { fetchImpl = fetch, now = new Date(), maxWrites = MAX_SITE_SCHEDULE_WRITES } = {}
) {
  const writeLimit = boundedWriteLimit(maxWrites);
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const window = projectionWindow(now);
  const [sourceEvents, currentSchedule, existingData] = await Promise.all([
    readRegistroRows(env, fetchImpl, accessToken),
    readSiteSchedule(env),
    listGoogleEvents(env, accessToken, window, fetchImpl)
  ]);

  const { desired, overriddenRegistroIds, legacyMatchedOverrides } = desiredBlocksForSource(
    sourceEvents,
    currentSchedule.schedule,
    window
  );
  const desiredByBlockId = new Map(desired.map((entry) => [entry.blockId, entry]));
  const existingBlocks = new Map();
  const existingBaseByRegistroId = new Map();

  for (const item of Array.isArray(existingData.items) ? existingData.items : []) {
    const privateProps = item?.extendedProperties?.private || {};
    const source = clean(privateProps[PRIVATE_SOURCE_KEY]);
    const registroId = clean(privateProps[PRIVATE_ID_KEY]);
    const blockId = clean(privateProps[PRIVATE_BLOCK_KEY]);
    if (source === PRIVATE_SOURCE_SITE_SCHEDULE && blockId) {
      existingBlocks.set(blockId, item);
    } else if (source === PRIVATE_SOURCE_REGISTRO && registroId && !existingBaseByRegistroId.has(registroId)) {
      existingBaseByRegistroId.set(registroId, item);
    }
  }

  const result = {
    available: true,
    calendarId: calendarId(env),
    projectedBlocks: desired.length,
    overriddenWorks: overriddenRegistroIds.size,
    legacyMatchedOverrides,
    sourceEvents: sourceEvents.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    failed: 0,
    capped: false,
    errors: []
  };
  let writes = 0;

  for (const desiredBlock of desired) {
    const existing = existingBlocks.get(desiredBlock.blockId) || null;
    if (existing && comparableGoogleEvent(existing) === comparableGoogleEvent(desiredBlock.resource)) {
      result.unchanged += 1;
      continue;
    }
    if (writes >= writeLimit) {
      result.capped = true;
      continue;
    }
    try {
      if (existing?.id) {
        await patchGoogleEvent(env, accessToken, existing.id, desiredBlock.resource, fetchImpl);
        result.updated += 1;
      } else {
        await createGoogleEvent(env, accessToken, desiredBlock.resource, fetchImpl);
        result.created += 1;
      }
      writes += 1;
    } catch (error) {
      result.failed += 1;
      if (result.errors.length < 5) {
        result.errors.push({ blockId: desiredBlock.blockId, ...googleCalendarDiagnostic(error) });
      }
    }
  }

  for (const [blockId, item] of existingBlocks.entries()) {
    if (desiredByBlockId.has(blockId)) continue;
    if (writes >= writeLimit) {
      result.capped = true;
      continue;
    }
    try {
      await deleteGoogleEvent(env, accessToken, item.id, fetchImpl);
      result.deleted += 1;
      writes += 1;
    } catch (error) {
      result.failed += 1;
      if (result.errors.length < 5) {
        result.errors.push({ blockId, ...googleCalendarDiagnostic(error) });
      }
    }
  }

  for (const registroId of overriddenRegistroIds) {
    const baseEvent = existingBaseByRegistroId.get(registroId);
    if (!baseEvent?.id) continue;
    if (writes >= writeLimit) {
      result.capped = true;
      continue;
    }
    try {
      await deleteGoogleEvent(env, accessToken, baseEvent.id, fetchImpl);
      result.deleted += 1;
      writes += 1;
    } catch (error) {
      result.failed += 1;
      if (result.errors.length < 5) {
        result.errors.push({ registroId, ...googleCalendarDiagnostic(error) });
      }
    }
  }

  return result;
}

export async function syncCalendarProjectionToGoogleCalendar(env, options = {}) {
  const registro = await syncRegistroToGoogleCalendar(env, options);
  const registroWrites = registro.created + registro.updated;
  const remainingWrites = Math.max(0, MAX_COMBINED_SYNC_WRITES - registroWrites);
  const siteSchedule = await syncSiteScheduleToGoogleCalendar(env, {
    ...options,
    maxWrites: remainingWrites
  });
  return {
    available: true,
    calendarId: siteSchedule.calendarId || registro.calendarId,
    scanned: registro.scanned,
    created: registro.created + siteSchedule.created,
    updated: registro.updated + siteSchedule.updated,
    unchanged: registro.unchanged + siteSchedule.unchanged,
    deleted: siteSchedule.deleted,
    failed: registro.failed + siteSchedule.failed,
    capped: Boolean(registro.capped || siteSchedule.capped),
    errors: [...(registro.errors || []), ...(siteSchedule.errors || [])].slice(0, 5),
    registro,
    siteSchedule
  };
}
