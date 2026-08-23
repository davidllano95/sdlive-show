import {
  bogotaDateIso,
  calendarEventKey,
  normalizeSiteScheduleOverride,
  showDayStatusForSchedule
} from "./site-schedule-api.js";

const SITE_SCHEDULE_VERSION = 1;
const SITE_SCHEDULE_ROW_ID = 1;
let schemaPromise = null;

function json(data, status = 200) {
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptySchedule() {
  return {
    version: SITE_SCHEDULE_VERSION,
    overrides: {}
  };
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
  ) return null;
  return text;
}

async function ensureSiteScheduleSchema(env) {
  if (!env?.CMS_DB) throw new Error("CMS_DB binding unavailable");

  if (!schemaPromise) {
    schemaPromise = env.CMS_DB
      .prepare(`
        CREATE TABLE IF NOT EXISTS site_schedule_state (
          id INTEGER PRIMARY KEY,
          content_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actor_email TEXT
        )
      `)
      .run()
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }

  return schemaPromise;
}

export async function readSiteScheduleV2(env) {
  await ensureSiteScheduleSchema(env);

  const row = await env.CMS_DB
    .prepare(`
      SELECT content_json, updated_at
      FROM site_schedule_state
      WHERE id = ?
      LIMIT 1
    `)
    .bind(SITE_SCHEDULE_ROW_ID)
    .first();

  if (!row) {
    return {
      schedule: emptySchedule(),
      updatedAt: null,
      source: "empty"
    };
  }

  const parsed = JSON.parse(String(row.content_json || "{}"));
  return {
    schedule: normalizeStoredSchedule(parsed),
    updatedAt: row.updated_at || null,
    source: "d1-site-schedule"
  };
}

export async function persistSiteScheduleV2(env, schedule, userEmail) {
  await ensureSiteScheduleSchema(env);

  const serialized = JSON.stringify(normalizeStoredSchedule(schedule));
  const actorEmail = cleanString(userEmail).slice(0, 320);

  await env.CMS_DB
    .prepare(`
      INSERT INTO site_schedule_state (
        id,
        content_json,
        updated_at,
        actor_email
      )
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(id) DO UPDATE SET
        content_json = excluded.content_json,
        updated_at = CURRENT_TIMESTAMP,
        actor_email = excluded.actor_email
    `)
    .bind(SITE_SCHEDULE_ROW_ID, serialized, actorEmail)
    .run();

  return readSiteScheduleV2(env);
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

export async function decorateCalendarResponseV2(
  response,
  env,
  { applyOverrides = true } = {}
) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response;

  const data = await response.json().catch(() => null);
  if (!data?.ok || !Array.isArray(data.events)) {
    return json(data || { ok: false, error: "Invalid Calendar response" }, response.status);
  }

  let schedule = emptySchedule();
  let scheduleAvailable = true;
  try {
    schedule = (await readSiteScheduleV2(env)).schedule;
  } catch (error) {
    scheduleAvailable = false;
    console.error("Site Schedule V2 overlay unavailable; serving REGISTRO dates", error);
  }

  const sourceCount = data.events.length;
  const decorated = displayEventsFromSchedule(
    data.events,
    schedule,
    { applyOverrides: applyOverrides && scheduleAvailable }
  );

  return json({
    ...data,
    count: decorated.events.length,
    sourceCount,
    events: decorated.events,
    siteSchedule: {
      available: scheduleAvailable,
      view: applyOverrides ? "display" : "source",
      appliedOverrides: decorated.appliedOverrides,
      store: "site_schedule_state"
    }
  }, response.status);
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

async function verify(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") return null;
  const user = await verifyAdmin(request, env);
  return user?.email ? user : null;
}

async function handleAdmin(request, env, verifyAdmin) {
  const user = await verify(request, env, verifyAdmin);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 403);

  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/admin/site-schedule" && request.method === "GET") {
    const current = await readSiteScheduleV2(env);
    return json({
      ok: true,
      source: "CMS_DB/site_schedule_state",
      updatedAt: current.updatedAt,
      schedule: clone(current.schedule)
    });
  }

  const match = path.match(/^\/api\/admin\/site-schedule\/events\/(evt_[0-9a-f]{16})$/);
  if (!match) return null;
  const eventKey = match[1];
  const current = await readSiteScheduleV2(env);
  const next = clone(current.schedule);

  if (request.method === "DELETE") {
    delete next.overrides[eventKey];
    const saved = await persistSiteScheduleV2(env, next, user.email);
    return json({
      ok: true,
      deleted: true,
      eventKey,
      updatedAt: saved.updatedAt,
      schedule: clone(saved.schedule)
    });
  }

  if (request.method !== "PUT") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return json({ ok: false, error: error.message || "Invalid JSON body" }, 400);
  }

  const normalized = normalizeSiteScheduleOverride(body);
  if (!normalized.ok) {
    return json({
      ok: false,
      error: "Invalid Site Schedule override",
      fields: normalized.errors
    }, 400);
  }

  next.overrides[eventKey] = normalized.value;
  const saved = await persistSiteScheduleV2(env, next, user.email);
  return json({
    ok: true,
    saved: true,
    eventKey,
    updatedAt: saved.updatedAt,
    override: clone(saved.schedule.overrides[eventKey])
  });
}

async function handlePublic(env) {
  try {
    const current = await readSiteScheduleV2(env);
    const today = bogotaDateIso();
    const status = showDayStatusForSchedule(current.schedule, today);
    return json({
      ok: true,
      active: status.active,
      location: status.location,
      activeCount: status.activeCount,
      date: today,
      timeZone: "America/Bogota"
    });
  } catch (error) {
    console.error("Show Day V2 status unavailable; failing closed to normal mode", error);
    return json({
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

export async function handleSiteScheduleApiV2(
  request,
  env,
  { verifyAdmin } = {}
) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/site/showday-status") {
    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }
    return handlePublic(env);
  }

  if (path === "/api/admin/site-schedule" || path.startsWith("/api/admin/site-schedule/events/")) {
    try {
      return await handleAdmin(request, env, verifyAdmin);
    } catch (error) {
      console.error("Site Schedule V2 operation failed", error);
      return json({
        ok: false,
        error: "Could not update Site Schedule",
        code: "site_schedule_d1_write_failed",
        detail: String(error?.message || error).slice(0, 400)
      }, 503);
    }
  }

  return null;
}
