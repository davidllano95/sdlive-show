const SITE_SCHEDULE_KEY = Object.freeze({
  section: "site_schedule",
  market: "global",
  route: "/admin/calendar"
});

const SITE_SCHEDULE_VERSION = 1;
const MAX_SEGMENTS_PER_EVENT = 40;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function emptySchedule() {
  return {
    version: SITE_SCHEDULE_VERSION,
    overrides: {}
  };
}

function decodeBlobText(blob) {
  if (typeof blob === "string") return blob;
  if (blob instanceof ArrayBuffer) {
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(blob));
  }
  if (ArrayBuffer.isView(blob)) {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(blob.buffer, blob.byteOffset, blob.byteLength)
    );
  }
  if (Array.isArray(blob)) {
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(blob));
  }
  throw new Error("Expected D1 text/blob value");
}

function cloneSchedule(value) {
  return JSON.parse(JSON.stringify(value));
}

function validIsoDate(value) {
  const text = cleanString(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return text;
}

function normalizeKeyPart(value) {
  return cleanString(value).normalize("NFKC").replace(/\s+/g, " ").toLowerCase();
}

function hash32(value, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}

export function calendarEventKey(event) {
  const source = event && typeof event === "object" ? event : {};
  const seed = [
    cleanString(source.startDate),
    normalizeKeyPart(source.client),
    normalizeKeyPart(source.project),
    normalizeKeyPart(source.role),
    cleanString(source.currency).toUpperCase()
  ].join("\u001f");
  const first = hash32(seed, 0x811c9dc5).toString(16).padStart(8, "0");
  const second = hash32(seed.split("").reverse().join(""), 0x9e3779b9)
    .toString(16)
    .padStart(8, "0");
  return `evt_${first}${second}`;
}

function normalizeStoredSchedule(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptySchedule();
  const overrides = value.overrides && typeof value.overrides === "object" && !Array.isArray(value.overrides)
    ? value.overrides
    : {};
  return {
    version: SITE_SCHEDULE_VERSION,
    overrides
  };
}

async function getScheduleRow(env) {
  if (!env?.CMS_DB) throw new Error("CMS_DB binding unavailable");
  return env.CMS_DB
    .prepare(`
      SELECT
        id,
        CAST(published_json AS BLOB) AS published_blob,
        updated_at,
        published_at
      FROM cms_entries
      WHERE section = ?
        AND market = ?
        AND route = ?
      LIMIT 1
    `)
    .bind(
      SITE_SCHEDULE_KEY.section,
      SITE_SCHEDULE_KEY.market,
      SITE_SCHEDULE_KEY.route
    )
    .first();
}

export async function readSiteSchedule(env) {
  const row = await getScheduleRow(env);
  if (!row) {
    return {
      schedule: emptySchedule(),
      updatedAt: null,
      source: "empty"
    };
  }

  const parsed = JSON.parse(decodeBlobText(row.published_blob));
  return {
    schedule: normalizeStoredSchedule(parsed),
    updatedAt: row.updated_at || row.published_at || null,
    source: "d1"
  };
}

async function saveSiteSchedule(env, schedule, userEmail, revisionType = "site-schedule-save") {
  const serialized = JSON.stringify(normalizeStoredSchedule(schedule));
  const current = await getScheduleRow(env);

  if (current) {
    await env.CMS_DB.batch([
      env.CMS_DB
        .prepare(`
          UPDATE cms_entries
          SET
            draft_json = ?,
            published_json = ?,
            updated_at = CURRENT_TIMESTAMP,
            published_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(serialized, serialized, current.id),
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_revisions (
            section,
            market,
            route,
            content_json,
            revision_type,
            actor_email
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          SITE_SCHEDULE_KEY.section,
          SITE_SCHEDULE_KEY.market,
          SITE_SCHEDULE_KEY.route,
          serialized,
          revisionType,
          userEmail
        )
    ]);
  } else {
    await env.CMS_DB.batch([
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_entries (
            section,
            market,
            route,
            draft_json,
            published_json,
            updated_at,
            published_at
          )
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          SITE_SCHEDULE_KEY.section,
          SITE_SCHEDULE_KEY.market,
          SITE_SCHEDULE_KEY.route,
          serialized,
          serialized
        ),
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_revisions (
            section,
            market,
            route,
            content_json,
            revision_type,
            actor_email
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          SITE_SCHEDULE_KEY.section,
          SITE_SCHEDULE_KEY.market,
          SITE_SCHEDULE_KEY.route,
          serialized,
          revisionType,
          userEmail
        )
    ]);
  }

  return readSiteSchedule(env);
}

function normalizeSegment(segment, sourceStartDate, sourceEndDate, index, errors) {
  const raw = segment && typeof segment === "object" ? segment : {};
  const startDate = validIsoDate(raw.startDate);
  const endDate = validIsoDate(raw.endDate);
  const showDay = raw.showDay === true;
  const location = cleanString(raw.location);
  const prefix = `segments.${index}`;

  if (!startDate) errors[`${prefix}.startDate`] = "invalid";
  if (!endDate) errors[`${prefix}.endDate`] = "invalid";
  if (startDate && endDate && endDate < startDate) {
    errors[`${prefix}.endDate`] = "before_start";
  }
  if (startDate && (startDate < sourceStartDate || startDate > sourceEndDate)) {
    errors[`${prefix}.startDate`] = "outside_source_range";
  }
  if (endDate && (endDate < sourceStartDate || endDate > sourceEndDate)) {
    errors[`${prefix}.endDate`] = "outside_source_range";
  }
  if (location.length > 160) errors[`${prefix}.location`] = "too_long";
  if (showDay && !location) errors[`${prefix}.location`] = "required_for_show_day";

  return {
    id: cleanString(raw.id) || `segment_${index + 1}`,
    startDate,
    endDate,
    showDay,
    location
  };
}

export function normalizeSiteScheduleOverride(payload) {
  const body = payload && typeof payload === "object" ? payload : {};
  const errors = {};
  const label = cleanString(body.label);
  const client = cleanString(body.client);
  const sourceStartDate = validIsoDate(body.sourceStartDate);
  const sourceEndDate = validIsoDate(body.sourceEndDate);

  if (!label || label.length > 200) errors.label = !label ? "required" : "too_long";
  if (client.length > 160) errors.client = "too_long";
  if (!sourceStartDate) errors.sourceStartDate = "invalid";
  if (!sourceEndDate) errors.sourceEndDate = "invalid";
  if (sourceStartDate && sourceEndDate && sourceEndDate < sourceStartDate) {
    errors.sourceEndDate = "before_start";
  }

  const rawSegments = Array.isArray(body.segments) ? body.segments : [];
  if (!rawSegments.length) errors.segments = "required";
  if (rawSegments.length > MAX_SEGMENTS_PER_EVENT) errors.segments = "too_many";

  const segments = rawSegments.slice(0, MAX_SEGMENTS_PER_EVENT).map((segment, index) =>
    normalizeSegment(
      segment,
      sourceStartDate || "0000-00-00",
      sourceEndDate || "9999-99-99",
      index,
      errors
    )
  );

  segments.sort((a, b) => {
    if (a.startDate !== b.startDate) return String(a.startDate).localeCompare(String(b.startDate));
    return String(a.endDate).localeCompare(String(b.endDate));
  });

  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const current = segments[index];
    if (previous.endDate && current.startDate && current.startDate <= previous.endDate) {
      errors.segments = "overlap";
      break;
    }
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: {},
    value: {
      label,
      client,
      sourceStartDate,
      sourceEndDate,
      segments
    }
  };
}

function displayEventsFromSchedule(sourceEvents, schedule, { applyOverrides = true } = {}) {
  const overrides = schedule?.overrides || {};
  const displayEvents = [];
  let appliedOverrides = 0;

  for (const rawEvent of Array.isArray(sourceEvents) ? sourceEvents : []) {
    const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};
    const eventKey = calendarEventKey(event);
    const base = {
      ...event,
      eventKey,
      sourceStartDate: event.startDate,
      sourceEndDate: event.endDate,
      siteSchedule: false,
      showDay: false,
      location: ""
    };
    const override = applyOverrides ? overrides[eventKey] : null;

    if (!override || !Array.isArray(override.segments) || override.segments.length === 0) {
      displayEvents.push(base);
      continue;
    }

    appliedOverrides += 1;
    override.segments.forEach((segment, index) => {
      const startDate = validIsoDate(segment.startDate) || event.startDate;
      const endDate = validIsoDate(segment.endDate) || startDate;
      displayEvents.push({
        ...base,
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        multiDay: endDate !== startDate,
        siteSchedule: true,
        showDay: segment.showDay === true,
        location: cleanString(segment.location),
        segmentId: cleanString(segment.id) || `segment_${index + 1}`
      });
    });
  }

  displayEvents.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.endDate !== b.endDate) return b.endDate.localeCompare(a.endDate);
    return cleanString(a.project || a.client).localeCompare(cleanString(b.project || b.client));
  });

  return { events: displayEvents, appliedOverrides };
}

export async function decorateCalendarResponse(
  response,
  env,
  { applyOverrides = true } = {}
) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response;

  const data = await response.json().catch(() => null);
  if (!data?.ok || !Array.isArray(data.events)) {
    return jsonResponse(data || { ok: false, error: "Invalid Calendar response" }, response.status);
  }

  let schedule = emptySchedule();
  let scheduleAvailable = true;
  try {
    schedule = (await readSiteSchedule(env)).schedule;
  } catch (error) {
    scheduleAvailable = false;
    console.error("Site Schedule overlay unavailable; serving REGISTRO dates", error);
  }

  const sourceCount = data.events.length;
  const decorated = displayEventsFromSchedule(
    data.events,
    schedule,
    { applyOverrides: applyOverrides && scheduleAvailable }
  );

  return jsonResponse({
    ...data,
    count: decorated.events.length,
    sourceCount,
    events: decorated.events,
    siteSchedule: {
      available: scheduleAvailable,
      view: applyOverrides ? "display" : "source",
      appliedOverrides: decorated.appliedOverrides
    }
  }, response.status);
}

export function bogotaDateIso(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function showDayStatusForSchedule(schedule, todayIso) {
  const overrides = schedule?.overrides || {};
  const active = [];

  for (const override of Object.values(overrides)) {
    if (!override || !Array.isArray(override.segments)) continue;
    for (const segment of override.segments) {
      if (
        segment?.showDay === true &&
        cleanString(segment.location) &&
        validIsoDate(segment.startDate) &&
        validIsoDate(segment.endDate) &&
        segment.startDate <= todayIso &&
        segment.endDate >= todayIso
      ) {
        active.push({
          startDate: segment.startDate,
          endDate: segment.endDate,
          location: cleanString(segment.location),
          label: cleanString(override.label)
        });
      }
    }
  }

  active.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.endDate !== b.endDate) return a.endDate.localeCompare(b.endDate);
    return a.label.localeCompare(b.label);
  });

  return {
    active: active.length > 0,
    location: active[0]?.location || "",
    activeCount: active.length
  };
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const text = await request.text();
  if (text.length > 80000) throw new Error("Request body is too large");
  return JSON.parse(text);
}

async function handleAdminScheduleRequest(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") {
    return jsonResponse({ ok: false, error: "Site Schedule auth unavailable" }, 503);
  }
  const user = await verifyAdmin(request, env);
  if (!user?.email) return jsonResponse({ ok: false, error: "Unauthorized" }, 403);

  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/admin/site-schedule" && request.method === "GET") {
    const current = await readSiteSchedule(env);
    return jsonResponse({
      ok: true,
      source: "CMS_DB",
      updatedAt: current.updatedAt,
      schedule: cloneSchedule(current.schedule)
    });
  }

  const match = path.match(/^\/api\/admin\/site-schedule\/events\/(evt_[0-9a-f]{16})$/);
  if (!match) return null;
  const eventKey = match[1];
  const current = await readSiteSchedule(env);
  const next = cloneSchedule(current.schedule);

  if (request.method === "DELETE") {
    delete next.overrides[eventKey];
    const saved = await saveSiteSchedule(env, next, user.email, "site-schedule-delete");
    return jsonResponse({
      ok: true,
      deleted: true,
      eventKey,
      updatedAt: saved.updatedAt,
      schedule: cloneSchedule(saved.schedule)
    });
  }

  if (request.method !== "PUT") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "Invalid JSON body" }, 400);
  }

  const normalized = normalizeSiteScheduleOverride(body);
  if (!normalized.ok) {
    return jsonResponse({
      ok: false,
      error: "Invalid Site Schedule override",
      fields: normalized.errors
    }, 400);
  }

  next.overrides[eventKey] = normalized.value;
  const saved = await saveSiteSchedule(env, next, user.email);
  return jsonResponse({
    ok: true,
    saved: true,
    eventKey,
    updatedAt: saved.updatedAt,
    override: cloneSchedule(saved.schedule.overrides[eventKey])
  });
}

async function handlePublicStatus(env) {
  try {
    const current = await readSiteSchedule(env);
    const today = bogotaDateIso();
    const status = showDayStatusForSchedule(current.schedule, today);
    return jsonResponse({
      ok: true,
      active: status.active,
      location: status.location,
      activeCount: status.activeCount,
      date: today,
      timeZone: "America/Bogota"
    });
  } catch (error) {
    console.error("Show Day status unavailable; failing closed to normal mode", error);
    return jsonResponse({
      ok: true,
      active: false,
      location: "",
      activeCount: 0,
      date: bogotaDateIso(),
      timeZone: "America/Bogota",
      degraded: true
    });
  }
}

export async function handleSiteScheduleApi(
  request,
  env,
  { verifyAdmin } = {}
) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/site/showday-status") {
    if (request.method !== "GET") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
    }
    return handlePublicStatus(env);
  }

  if (path === "/api/admin/site-schedule" || path.startsWith("/api/admin/site-schedule/events/")) {
    try {
      return await handleAdminScheduleRequest(request, env, verifyAdmin);
    } catch (error) {
      console.error("Site Schedule operation failed", error);
      return jsonResponse({ ok: false, error: "Could not update Site Schedule" }, 503);
    }
  }

  return null;
}
