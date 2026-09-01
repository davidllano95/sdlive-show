const PROFILE_ROW_ID = 1;
const OVERRIDE_ROW_ID = 1;
const TRAVEL_ROW_ID = 1;
const AVAILABILITY_MODES = new Set(["auto", "available", "limited", "away"]);
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
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

function isValidTimeZone(value) {
  const zone = cleanString(value);
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function validTime(value) {
  const text = cleanString(value);
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return text;
}

function minutesFromTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function normalizeWeeklySchedule(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const schedule = {};
  let windowCount = 0;

  for (const key of WEEKDAY_KEYS) {
    const windows = Array.isArray(source[key]) ? source[key] : [];
    schedule[key] = [];

    for (const raw of windows.slice(0, 6)) {
      if (!Array.isArray(raw) || raw.length < 2) continue;
      const start = validTime(raw[0]);
      const end = validTime(raw[1]);
      if (!start || !end || minutesFromTime(end) <= minutesFromTime(start)) continue;
      schedule[key].push([start, end]);
      windowCount += 1;
    }
  }

  return { schedule, windowCount };
}

function emptyProfile() {
  return {
    defaultTimezone: "America/Bogota",
    weeklySchedule: normalizeWeeklySchedule({}).schedule,
    configured: false,
    updatedAt: null,
    actorEmail: ""
  };
}

function emptyOverride() {
  return {
    mode: "auto",
    storedMode: "auto",
    startsAt: null,
    expiresAt: null,
    expired: false,
    updatedAt: null,
    actorEmail: ""
  };
}

function emptyTravel() {
  return {
    active: false,
    timezone: "",
    startsAt: null,
    expiresAt: null,
    updatedAt: null,
    actorEmail: ""
  };
}

async function ensureSchema(env) {
  if (!env?.CMS_DB) throw new Error("CMS_DB binding unavailable");
  if (!schemaPromise) {
    schemaPromise = Promise.all([
      env.CMS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS availability_profile (
          id INTEGER PRIMARY KEY,
          default_timezone TEXT NOT NULL,
          weekly_schedule_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actor_email TEXT
        )
      `).run(),
      env.CMS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS availability_override_state (
          id INTEGER PRIMARY KEY,
          mode TEXT NOT NULL DEFAULT 'auto',
          starts_at TEXT,
          expires_at TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actor_email TEXT
        )
      `).run(),
      env.CMS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS availability_travel_state (
          id INTEGER PRIMARY KEY,
          timezone TEXT,
          starts_at TEXT,
          expires_at TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actor_email TEXT
        )
      `).run(),
      env.CMS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS availability_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          actor_email TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run()
    ]).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function parseDate(value) {
  const text = cleanString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function activeOverrideFromRow(row, now = new Date()) {
  if (!row) return emptyOverride();
  const storedMode = AVAILABILITY_MODES.has(cleanString(row.mode)) ? cleanString(row.mode) : "auto";
  const starts = parseDate(row.starts_at);
  const expires = parseDate(row.expires_at);
  const activeWindow = storedMode === "auto" || (
    starts && expires && starts.getTime() <= now.getTime() && expires.getTime() > now.getTime()
  );
  const expired = storedMode !== "auto" && !activeWindow;

  return {
    mode: activeWindow ? storedMode : "auto",
    storedMode,
    startsAt: starts?.toISOString() || null,
    expiresAt: expires?.toISOString() || null,
    expired,
    updatedAt: row.updated_at || null,
    actorEmail: cleanString(row.actor_email)
  };
}

function activeTravelFromRow(row, now = new Date()) {
  if (!row) return emptyTravel();
  const timezone = isValidTimeZone(row.timezone) ? cleanString(row.timezone) : "";
  const starts = parseDate(row.starts_at);
  const expires = parseDate(row.expires_at);
  const active = Boolean(
    timezone && starts && expires && starts.getTime() <= now.getTime() && expires.getTime() > now.getTime()
  );
  return {
    active,
    timezone: active ? timezone : "",
    startsAt: starts?.toISOString() || null,
    expiresAt: expires?.toISOString() || null,
    updatedAt: row.updated_at || null,
    actorEmail: cleanString(row.actor_email)
  };
}

export async function readAvailabilityProfile(env) {
  await ensureSchema(env);
  const row = await env.CMS_DB.prepare(`
    SELECT default_timezone, weekly_schedule_json, updated_at, actor_email
    FROM availability_profile
    WHERE id = ?
    LIMIT 1
  `).bind(PROFILE_ROW_ID).first();

  if (!row) return emptyProfile();
  const defaultTimezone = isValidTimeZone(row.default_timezone)
    ? cleanString(row.default_timezone)
    : "America/Bogota";
  let parsed = {};
  try { parsed = JSON.parse(String(row.weekly_schedule_json || "{}")); } catch { parsed = {}; }
  const normalized = normalizeWeeklySchedule(parsed);
  return {
    defaultTimezone,
    weeklySchedule: normalized.schedule,
    configured: normalized.windowCount > 0,
    updatedAt: row.updated_at || null,
    actorEmail: cleanString(row.actor_email)
  };
}

export async function readAvailabilityOverride(env, now = new Date()) {
  await ensureSchema(env);
  const row = await env.CMS_DB.prepare(`
    SELECT mode, starts_at, expires_at, updated_at, actor_email
    FROM availability_override_state
    WHERE id = ?
    LIMIT 1
  `).bind(OVERRIDE_ROW_ID).first();
  return activeOverrideFromRow(row, now);
}

export async function readAvailabilityTravel(env, now = new Date()) {
  await ensureSchema(env);
  const row = await env.CMS_DB.prepare(`
    SELECT timezone, starts_at, expires_at, updated_at, actor_email
    FROM availability_travel_state
    WHERE id = ?
    LIMIT 1
  `).bind(TRAVEL_ROW_ID).first();
  return activeTravelFromRow(row, now);
}

function localClock(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const weekday = get("weekday").toLowerCase().slice(0, 3);
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { weekday, minuteOfDay: hour * 60 + minute };
}

export function evaluateWeeklySchedule(profile, travel, now = new Date()) {
  const safeProfile = profile && typeof profile === "object" ? profile : emptyProfile();
  const safeTravel = travel && typeof travel === "object" ? travel : emptyTravel();
  const timeZone = safeTravel.active && isValidTimeZone(safeTravel.timezone)
    ? safeTravel.timezone
    : (isValidTimeZone(safeProfile.defaultTimezone) ? safeProfile.defaultTimezone : "America/Bogota");
  const normalized = normalizeWeeklySchedule(safeProfile.weeklySchedule || {});

  if (!safeProfile.configured || normalized.windowCount === 0) {
    return {
      status: "available",
      source: "compatibility-default",
      timeZone,
      nextTransition: null
    };
  }

  const clock = localClock(now, timeZone);
  const windows = normalized.schedule[clock.weekday] || [];
  const available = windows.some(([start, end]) => {
    const startMinutes = minutesFromTime(start);
    const endMinutes = minutesFromTime(end);
    return clock.minuteOfDay >= startMinutes && clock.minuteOfDay < endMinutes;
  });

  return {
    status: available ? "available" : "away",
    source: "weekly-schedule",
    timeZone,
    nextTransition: null
  };
}

export function resolveAvailability(profile, override, travel, now = new Date()) {
  const safeOverride = override && typeof override === "object" ? override : emptyOverride();
  if (safeOverride.mode !== "auto" && AVAILABILITY_MODES.has(safeOverride.mode)) {
    return {
      status: safeOverride.mode,
      source: "manual-override",
      timeZone: travel?.active && travel?.timezone ? travel.timezone : profile?.defaultTimezone || "America/Bogota",
      nextTransition: safeOverride.expiresAt || null
    };
  }
  return evaluateWeeklySchedule(profile, travel, now);
}

function publicSnapshot(effective) {
  const status = ["available", "limited", "away"].includes(effective?.status)
    ? effective.status
    : "available";
  return {
    ok: true,
    status,
    humanAvailable: status === "available",
    humanReachable: status !== "away",
    contactMode: status === "away" ? "leave_message" : "whatsapp",
    nextTransition: effective?.nextTransition || null,
    source: effective?.source || "compatibility-default"
  };
}

async function writeHistory(env, action, payload, actorEmail) {
  await env.CMS_DB.prepare(`
    INSERT INTO availability_history (action, payload_json, actor_email)
    VALUES (?, ?, ?)
  `).bind(
    cleanString(action).slice(0, 80),
    JSON.stringify(payload || {}),
    cleanString(actorEmail).slice(0, 320)
  ).run();
}

export function normalizeAvailabilityOverrideInput(payload, now = new Date()) {
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const mode = cleanString(body.mode).toLowerCase();
  if (!AVAILABILITY_MODES.has(mode)) return { ok: false, error: "invalid_mode" };
  if (mode === "auto") {
    return { ok: true, value: { mode: "auto", startsAt: null, expiresAt: null } };
  }

  const durationMinutes = Number(body.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 1440) {
    return { ok: false, error: "invalid_duration" };
  }
  const startsAt = new Date(now);
  const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60000);
  return {
    ok: true,
    value: {
      mode,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    }
  };
}

async function persistOverride(env, value, actorEmail, now = new Date()) {
  await ensureSchema(env);
  await env.CMS_DB.prepare(`
    INSERT INTO availability_override_state (id, mode, starts_at, expires_at, updated_at, actor_email)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(id) DO UPDATE SET
      mode = excluded.mode,
      starts_at = excluded.starts_at,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP,
      actor_email = excluded.actor_email
  `).bind(
    OVERRIDE_ROW_ID,
    value.mode,
    value.startsAt,
    value.expiresAt,
    cleanString(actorEmail).slice(0, 320)
  ).run();
  await writeHistory(env, "override", value, actorEmail);
  return readAvailabilityOverride(env, now);
}

async function snapshot(env, now = new Date()) {
  const [profile, override, travel] = await Promise.all([
    readAvailabilityProfile(env),
    readAvailabilityOverride(env, now),
    readAvailabilityTravel(env, now)
  ]);
  const effective = resolveAvailability(profile, override, travel, now);
  return { profile, override, travel, effective };
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const text = await request.text();
  if (text.length > 12000) throw new Error("Request body is too large");
  return JSON.parse(text || "{}");
}

async function verify(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") return null;
  const user = await verifyAdmin(request, env);
  return user?.email ? user : null;
}

export async function handleAvailabilityApi(request, env, { verifyAdmin } = {}) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/availability") {
    if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
    try {
      return json(publicSnapshot((await snapshot(env)).effective));
    } catch (error) {
      console.error("Availability public status unavailable", error);
      return json({
        ok: true,
        status: "available",
        humanAvailable: true,
        humanReachable: true,
        contactMode: "whatsapp",
        nextTransition: null,
        source: "degraded-compatibility-default",
        degraded: true
      });
    }
  }

  if (path !== "/api/admin/availability") return null;
  const user = await verify(request, env, verifyAdmin);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 403);

  try {
    if (request.method === "GET") {
      const state = await snapshot(env);
      return json({ ok: true, ...state });
    }
    if (request.method !== "PUT") return json({ ok: false, error: "Method not allowed" }, 405);

    const body = await readJsonBody(request);
    const normalized = normalizeAvailabilityOverrideInput(body);
    if (!normalized.ok) {
      return json({ ok: false, error: "Invalid Availability override", code: normalized.error }, 400);
    }
    await persistOverride(env, normalized.value, user.email);
    const state = await snapshot(env);
    return json({ ok: true, saved: true, ...state });
  } catch (error) {
    console.error("Availability admin operation failed", error);
    return json({
      ok: false,
      error: "Could not update Availability state",
      code: "availability_d1_write_failed",
      detail: String(error?.message || error).slice(0, 300)
    }, 503);
  }
}
