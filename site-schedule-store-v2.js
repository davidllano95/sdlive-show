import {
  bogotaDateIso,
  calendarEventKey,
  normalizeSiteScheduleOverride,
  showDayStatusForSchedule
} from "./site-schedule-api.js";

const SITE_SCHEDULE_VERSION = 1;
const SITE_SCHEDULE_ROW_ID = 1;
const SHOWDAY_OVERRIDE_ROW_ID = 1;
const SHOWDAY_OVERRIDE_MODES = new Set(["auto", "force_on", "force_off"]);
let schemaPromise = null;
let showDayOverrideSchemaPromise = null;

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

function emptyShowDayOverride() {
  return {
    mode: "auto",
    storedMode: "auto",
    location: "",
    expiresOn: null,
    expired: false,
    updatedAt: null,
    actorEmail: ""
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

async function ensureShowDayOverrideSchema(env) {
  if (!env?.CMS_DB) throw new Error("CMS_DB binding unavailable");

  if (!showDayOverrideSchemaPromise) {
    showDayOverrideSchemaPromise = env.CMS_DB
      .prepare(`
        CREATE TABLE IF NOT EXISTS showday_override_state (
          id INTEGER PRIMARY KEY,
          mode TEXT NOT NULL DEFAULT 'auto',
          location TEXT NOT NULL DEFAULT '',
          expires_on TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actor_email TEXT
        )
      `)
      .run()
      .catch((error) => {
        showDayOverrideSchemaPromise = null;
        throw error;
      });
  }

  return showDayOverrideSchemaPromise;
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

export function normalizeShowDayOverrideInput(payload, todayIso = bogotaDateIso()) {
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const mode = cleanString(body.mode).toLowerCase();
  const location = cleanString(body.location);
  const errors = {};

  if (!SHOWDAY_OVERRIDE_MODES.has(mode)) errors.mode = "invalid";
  if (location.length > 160) errors.location = "too_long";
  if (mode === "force_on" && !location) errors.location = "required_for_force_on";

  if (Object.keys(errors).length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: {},
    value: {
      mode,
      location: mode === "force_on" ? location : "",
      expiresOn: mode === "auto" ? null : todayIso
    }
  };
}

export async function readShowDayOverrideV2(env, todayIso = bogotaDateIso()) {
  await ensureShowDayOverrideSchema(env);

  const row = await env.CMS_DB
    .prepare(`
      SELECT mode, location, expires_on, updated_at, actor_email
      FROM showday_override_state
      WHERE id = ?
      LIMIT 1
    `)
    .bind(SHOWDAY_OVERRIDE_ROW_ID)
    .first();

  if (!row) return emptyShowDayOverride();

  const storedMode = SHOWDAY_OVERRIDE_MODES.has(cleanString(row.mode))
    ? cleanString(row.mode)
    : "auto";
  const expiresOn = validIsoDate(row.expires_on);
  const expired = storedMode !== "auto" && (!expiresOn || todayIso > expiresOn);
  const mode = expired ? "auto" : storedMode;

  return {
    mode,
    storedMode,
    location: mode === "force_on" ? cleanString(row.location) : "",
    expiresOn,
    expired,
    updatedAt: row.updated_at || null,
    actorEmail: cleanString(row.actor_email)
  };
}

export async function persistShowDayOverrideV2(env, value, userEmail) {
  await ensureShowDayOverrideSchema(env);

  const actorEmail = cleanString(userEmail).slice(0, 320);
  await env.CMS_DB
    .prepare(`
      INSERT INTO showday_override_state (
        id,
        mode,
        location,
        expires_on,
        updated_at,
        actor_email
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(id) DO UPDATE SET
        mode = excluded.mode,
        location = excluded.location,
        expires_on = excluded.expires_on,
        updated_at = CURRENT_TIMESTAMP,
        actor_email = excluded.actor_email
    `)
    .bind(
      SHOWDAY_OVERRIDE_ROW_ID,
      value.mode,
      value.location || "",
      value.expiresOn || null,
      actorEmail
    )
    .run();

  return readShowDayOverrideV2(env);
}

export function resolveShowDayStatus(automaticStatus, override) {
  const automatic = automaticStatus && typeof automaticStatus === "object"
    ? automaticStatus
    : { active: false, location: "", activeCount: 0 };
  const state = override && typeof override === "object"
    ? override
    : emptyShowDayOverride();

  if (state.mode === "force_on") {
    return {
      active: true,
      location: cleanString(state.location),
      activeCount: 1,
      source: "admin-override",
      overrideMode: "force_on"
    };
  }

  if (state.mode === "force_off") {
    return {
      active: false,
      location: "",
      activeCount: 0,
      source: "admin-override",
      overrideMode: "force_off"
    };
  }

  return {
    active: automatic.active === true,
    location: cleanString(automatic.location),
    activeCount: Number(automatic.activeCount) || 0,
    source: "site-schedule",
    overrideMode: "auto"
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

async function automaticShowDaySnapshot(env, todayIso) {
  const current = await readSiteScheduleV2(env);
  return showDayStatusForSchedule(current.schedule, todayIso);
}

async function handleAdmin(request, env, verifyAdmin) {
  const user = await verify(request, env, verifyAdmin);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 403);

  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/admin/showday-override") {
    const today = bogotaDateIso();

    if (request.method === "GET") {
      const override = await readShowDayOverrideV2(env, today);
      const automatic = await automaticShowDaySnapshot(env, today);
      return json({
        ok: true,
        date: today,
        timeZone: "America/Bogota",
        override,
        automatic,
        effective: resolveShowDayStatus(automatic, override)
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

    const normalized = normalizeShowDayOverrideInput(body, today);
    if (!normalized.ok) {
      return json({
        ok: false,
        error: "Invalid Show Day override",
        fields: normalized.errors
      }, 400);
    }

    const override = await persistShowDayOverrideV2(env, normalized.value, user.email);
    const automatic = await automaticShowDaySnapshot(env, today);
    return json({
      ok: true,
      saved: true,
      date: today,
      timeZone: "America/Bogota",
      override,
      automatic,
      effective: resolveShowDayStatus(automatic, override)
    });
  }

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
  const today = bogotaDateIso();
  let automatic = { active: false, location: "", activeCount: 0 };
  let override = emptyShowDayOverride();
  let scheduleDegraded = false;
  let overrideDegraded = false;

  try {
    automatic = await automaticShowDaySnapshot(env, today);
  } catch (error) {
    scheduleDegraded = true;
    console.error("Show Day V2 schedule status unavailable; automatic mode fails closed", error);
  }

  try {
    override = await readShowDayOverrideV2(env, today);
  } catch (error) {
    overrideDegraded = true;
    console.error("Show Day override unavailable; falling back to automatic mode", error);
  }

  const status = resolveShowDayStatus(automatic, override);
  return json({
    ok: true,
    active: status.active,
    location: status.location,
    activeCount: status.activeCount,
    source: status.source,
    overrideMode: status.overrideMode,
    date: today,
    timeZone: "America/Bogota",
    degraded: scheduleDegraded || overrideDegraded
  });
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

  if (
    path === "/api/admin/showday-override" ||
    path === "/api/admin/site-schedule" ||
    path.startsWith("/api/admin/site-schedule/events/")
  ) {
    try {
      return await handleAdmin(request, env, verifyAdmin);
    } catch (error) {
      console.error("Site Schedule V2 operation failed", error);
      return json({
        ok: false,
        error: "Could not update Site Schedule / Show Day state",
        code: "site_schedule_d1_write_failed",
        detail: String(error?.message || error).slice(0, 400)
      }, 503);
    }
  }

  return null;
}