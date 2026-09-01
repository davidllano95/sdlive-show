import {
  readAvailabilityForce,
  readAvailabilityOverride,
  readAvailabilityProfile,
  readAvailabilityTravel,
  resolveAvailability
} from "./availability-core.js";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SEARCH_DAYS = 8;

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

function parseDate(value) {
  const text = cleanString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateIso(value) {
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
  return { year, month, day };
}

function zonedParts(date, timeZone) {
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
  const parts = zonedParts(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function offsetMilliseconds(date, timeZone) {
  const parts = zonedParts(date, timeZone);
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

function localDateTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const nominalUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let resolved = nominalUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
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

function addCalendarDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function weekdayKey(parts) {
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return WEEKDAY_KEYS[day];
}

function timeParts(value) {
  const match = cleanString(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function projectedOverride(override, at) {
  const storedMode = cleanString(override?.storedMode || override?.mode || "auto");
  if (storedMode === "auto") return { ...(override || {}), mode: "auto" };
  const starts = parseDate(override?.startsAt);
  const expires = parseDate(override?.expiresAt);
  const active = Boolean(starts && expires && starts <= at && expires > at);
  return { ...(override || {}), mode: active ? storedMode : "auto" };
}

function projectedTravel(travel, at) {
  const timezone = cleanString(travel?.timezone);
  const starts = parseDate(travel?.startsAt);
  const expires = parseDate(travel?.expiresAt);
  const active = Boolean(timezone && starts && expires && starts <= at && expires > at);
  return {
    ...(travel || {}),
    active,
    timezone: active ? timezone : ""
  };
}

function projectedForce(force, profile, at) {
  const storedMode = cleanString(force?.storedMode || force?.mode || "auto");
  if (storedMode === "auto") return { ...(force || {}), mode: "auto" };
  const expiresOn = cleanString(force?.expiresOn);
  const baseZone = isValidTimeZone(profile?.defaultTimezone)
    ? profile.defaultTimezone
    : "America/Bogota";
  const active = /^\d{4}-\d{2}-\d{2}$/.test(expiresOn) && dateIsoInZone(at, baseZone) === expiresOn;
  return { ...(force || {}), mode: active ? storedMode : "auto" };
}

function forceExpiryInstant(force, profile) {
  const storedMode = cleanString(force?.storedMode || force?.mode || "auto");
  if (storedMode === "auto") return null;
  const parsed = parseDateIso(force?.expiresOn);
  if (!parsed) return null;
  const nextDay = addCalendarDays(parsed, 1);
  const baseZone = isValidTimeZone(profile?.defaultTimezone)
    ? profile.defaultTimezone
    : "America/Bogota";
  return localDateTimeToUtc({ ...nextDay, hour: 0, minute: 0 }, baseZone);
}

function scheduleStartCandidates(profile, timeZone, now) {
  if (!profile?.configured || !isValidTimeZone(timeZone)) return [];
  const schedule = profile.weeklySchedule && typeof profile.weeklySchedule === "object"
    ? profile.weeklySchedule
    : {};
  const today = zonedParts(now, timeZone);
  const candidates = [];

  for (let dayOffset = 0; dayOffset <= SEARCH_DAYS; dayOffset += 1) {
    const localDate = addCalendarDays(today, dayOffset);
    const windows = Array.isArray(schedule[weekdayKey(localDate)])
      ? schedule[weekdayKey(localDate)]
      : [];

    for (const window of windows) {
      if (!Array.isArray(window) || window.length < 2) continue;
      const start = timeParts(window[0]);
      if (!start) continue;
      const instant = localDateTimeToUtc({ ...localDate, ...start }, timeZone);
      if (instant.getTime() >= now.getTime()) candidates.push(instant);
    }
  }

  return candidates;
}

function labelFor(start, timeZone, locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    }).format(start);
  } catch {
    return "";
  }
}

export function computeNextHumanWindow(state, now = new Date()) {
  const profile = state?.profile || {};
  const override = state?.override || {};
  const travel = state?.travel || {};
  const force = state?.force || {};
  const currentEffective = state?.effective || resolveAvailability(profile, override, travel, now, force);

  if (currentEffective?.status === "available") return null;

  const baseZone = isValidTimeZone(profile?.defaultTimezone)
    ? profile.defaultTimezone
    : "America/Bogota";
  const zones = new Set([baseZone]);
  if (travel?.active && isValidTimeZone(travel.timezone)) zones.add(travel.timezone);

  const candidates = [];
  const addCandidate = (value) => {
    const date = value instanceof Date ? value : parseDate(value);
    if (!date || date.getTime() < now.getTime()) return;
    candidates.push(date);
  };

  addCandidate(override?.expiresAt);
  addCandidate(travel?.expiresAt);
  addCandidate(forceExpiryInstant(force, profile));
  for (const zone of zones) {
    for (const candidate of scheduleStartCandidates(profile, zone, now)) addCandidate(candidate);
  }

  const unique = [...new Map(
    candidates.map((date) => [date.getTime(), date])
  ).values()].sort((a, b) => a - b);

  for (const candidate of unique) {
    const projected = {
      override: projectedOverride(override, candidate),
      travel: projectedTravel(travel, candidate),
      force: projectedForce(force, profile, candidate)
    };
    const effective = resolveAvailability(
      profile,
      projected.override,
      projected.travel,
      candidate,
      projected.force
    );
    if (effective?.status !== "available") continue;

    const timeZone = isValidTimeZone(effective.timeZone) ? effective.timeZone : baseZone;
    return {
      startsAt: candidate.toISOString(),
      timeZone,
      labelEn: labelFor(candidate, timeZone, "en-US"),
      labelEs: labelFor(candidate, timeZone, "es-CO")
    };
  }

  return null;
}

async function readState(env, now = new Date()) {
  const profile = await readAvailabilityProfile(env);
  const [override, travel, force] = await Promise.all([
    readAvailabilityOverride(env, now),
    readAvailabilityTravel(env, now),
    readAvailabilityForce(env, profile, now)
  ]);
  const effective = resolveAvailability(profile, override, travel, now, force);
  return { profile, override, travel, force, effective };
}

function publicWindow(window) {
  if (!window) return null;
  return {
    startsAt: window.startsAt,
    labelEn: window.labelEn,
    labelEs: window.labelEs
  };
}

function rebuiltJsonResponse(response, data) {
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.delete("Content-Length");
  return new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function decorateAvailabilityNextWindowResponse(
  response,
  env,
  { publicView = false, now = new Date() } = {}
) {
  if (!response || !(response.headers.get("content-type") || "").includes("application/json")) return response;

  const data = await response.clone().json().catch(() => null);
  if (!data?.ok) return response;

  try {
    if (publicView && data.status !== "away") {
      return rebuiltJsonResponse(response, { ...data, nextHumanWindow: null });
    }

    const state = data.profile && data.override && data.travel && data.force
      ? data
      : await readState(env, now);
    const nextHumanWindow = computeNextHumanWindow(state, now);

    return rebuiltJsonResponse(response, {
      ...data,
      nextHumanWindow: publicView ? publicWindow(nextHumanWindow) : nextHumanWindow
    });
  } catch (error) {
    console.error("Availability next service window unavailable", error);
    return rebuiltJsonResponse(response, { ...data, nextHumanWindow: null });
  }
}
