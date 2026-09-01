import {
  readAvailabilityForce,
  readAvailabilityOverride,
  readAvailabilityProfile,
  readAvailabilityTravel,
  resolveAvailability
} from "./availability-core.js";

const TRAVEL_ROW_ID = 1;
const MAX_TRAVEL_DAYS = 90;

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

function partsInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second")
  };
}

function dateIsoInZone(date, timeZone) {
  const parts = partsInZone(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseDateIso(value) {
  const text = cleanString(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) return null;
  return { text, year, month, day };
}

function dayDistance(fromIso, toIso) {
  const from = parseDateIso(fromIso);
  const to = parseDateIso(toIso);
  if (!from || !to) return NaN;
  return Math.round((
    Date.UTC(to.year, to.month - 1, to.day) -
    Date.UTC(from.year, from.month - 1, from.day)
  ) / 86400000);
}

function offsetMilliseconds(date, timeZone) {
  const parts = partsInZone(date, timeZone);
  const representedUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const actualWholeSecond = Math.floor(date.getTime() / 1000) * 1000;
  return representedUtc - actualWholeSecond;
}

function localDateTimeToUtc({ year, month, day, hour, minute, second, millisecond }, timeZone) {
  const nominalUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let resolved = nominalUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = offsetMilliseconds(new Date(resolved), timeZone);
    const next = nominalUtc - offset;
    if (Math.abs(next - resolved) < 1000) {
      resolved = next;
      break;
    }
    resolved = next;
  }

  return new Date(resolved);
}

function endOfDateInZone(dateIso, timeZone) {
  const parsed = parseDateIso(dateIso);
  if (!parsed) return null;
  return localDateTimeToUtc({
    ...parsed,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999
  }, timeZone);
}

export function normalizeAvailabilityTravelInput(payload, now = new Date()) {
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

  if (body.enabled === false) {
    return {
      ok: true,
      value: {
        enabled: false,
        timezone: null,
        startsAt: null,
        expiresAt: null,
        endDate: null
      }
    };
  }

  if (body.enabled !== true) return { ok: false, error: "invalid_travel_enabled" };

  const timezone = cleanString(body.timezone);
  if (!isValidTimeZone(timezone)) return { ok: false, error: "invalid_travel_timezone" };

  const endDate = parseDateIso(body.endDate);
  if (!endDate) return { ok: false, error: "invalid_travel_end_date" };

  const today = dateIsoInZone(now, timezone);
  const distance = dayDistance(today, endDate.text);
  if (!Number.isInteger(distance) || distance < 0 || distance > MAX_TRAVEL_DAYS) {
    return { ok: false, error: "invalid_travel_end_date" };
  }

  const expiresAt = endOfDateInZone(endDate.text, timezone);
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: "invalid_travel_end_date" };
  }

  return {
    ok: true,
    value: {
      enabled: true,
      timezone,
      startsAt: new Date(now).toISOString(),
      expiresAt: expiresAt.toISOString(),
      endDate: endDate.text
    }
  };
}

async function writeHistory(env, payload, actorEmail) {
  await env.CMS_DB.prepare(`
    INSERT INTO availability_history (action, payload_json, actor_email)
    VALUES (?, ?, ?)
  `).bind(
    "travel",
    JSON.stringify(payload || {}),
    cleanString(actorEmail).slice(0, 320)
  ).run();
}

async function persistTravel(env, value, actorEmail, now = new Date()) {
  // This read also guarantees the canonical Availability schema exists before
  // the bounded travel mutation touches its dedicated table.
  await readAvailabilityTravel(env, now);

  await env.CMS_DB.prepare(`
    INSERT INTO availability_travel_state (id, timezone, starts_at, expires_at, updated_at, actor_email)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(id) DO UPDATE SET
      timezone = excluded.timezone,
      starts_at = excluded.starts_at,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP,
      actor_email = excluded.actor_email
  `).bind(
    TRAVEL_ROW_ID,
    value.enabled ? value.timezone : null,
    value.enabled ? value.startsAt : null,
    value.enabled ? value.expiresAt : null,
    cleanString(actorEmail).slice(0, 320)
  ).run();

  await writeHistory(env, value, actorEmail);
  return readAvailabilityTravel(env, now);
}

async function snapshot(env, now = new Date()) {
  const profile = await readAvailabilityProfile(env);
  const [override, travel, force] = await Promise.all([
    readAvailabilityOverride(env, now),
    readAvailabilityTravel(env, now),
    readAvailabilityForce(env, profile, now)
  ]);
  const effective = resolveAvailability(profile, override, travel, now, force);
  return { profile, override, travel, force, effective };
}

export async function handleAvailabilityTravelPut(request, env, body, { verifyAdmin } = {}) {
  if (request.method !== "PUT") return null;

  const user = typeof verifyAdmin === "function" ? await verifyAdmin(request, env) : null;
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 403);

  const normalized = normalizeAvailabilityTravelInput(body);
  if (!normalized.ok) {
    return json({
      ok: false,
      error: "Invalid Availability travel mode",
      code: normalized.error
    }, 400);
  }

  try {
    await persistTravel(env, normalized.value, user.email);
    const state = await snapshot(env);
    return json({ ok: true, saved: true, action: "travel", ...state });
  } catch (error) {
    console.error("Availability travel-mode operation failed", error);
    return json({
      ok: false,
      error: "Could not update Availability travel mode",
      code: "availability_travel_d1_write_failed",
      detail: String(error?.message || error).slice(0, 300)
    }, 503);
  }
}
