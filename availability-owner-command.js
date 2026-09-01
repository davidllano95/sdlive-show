const STATUS_ALIASES = new Map([
  ["available", "available"],
  ["disponible", "available"],
  ["limited", "limited"],
  ["limitado", "limited"],
  ["limitada", "limited"],
  ["away", "away"],
  ["ausente", "away"]
]);

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 1440;

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeCommandText(value) {
  return cleanString(value).toLowerCase().replace(/\s+/g, " ");
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

function validateDuration(minutes) {
  if (!Number.isInteger(minutes) || minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
    return { ok: false, error: "invalid_duration" };
  }
  return { ok: true, minutes };
}

function parseRelativeDuration(value) {
  const text = normalizeCommandText(value);

  let match = text.match(/^(\d{1,4})\s*(?:m|min|mins|minute|minutes|minuto|minutos)$/);
  if (match) return validateDuration(Number(match[1]));

  match = text.match(/^(\d{1,2})\s*(?:h|hr|hrs|hour|hours|hora|horas)(?:\s*(\d{1,2})\s*(?:m|min|mins|minute|minutes|minuto|minutos))?$/);
  if (match) {
    const minutes = Number(match[1]) * 60 + Number(match[2] || 0);
    return validateDuration(minutes);
  }

  return { ok: false, error: "invalid_duration" };
}

function durationUntilClock(value, now, timeZone) {
  const match = normalizeCommandText(value).match(/^(?:until|hasta)\s+(\d{1,2}):(\d{2})$/);
  if (!match) return { ok: false, error: "invalid_until_time" };
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { ok: false, error: "invalid_until_time" };

  const current = zonedParts(now, timeZone);
  const currentMinuteOfDay = current.hour * 60 + current.minute;
  const targetMinuteOfDay = hour * 60 + minute;
  const targetDate = targetMinuteOfDay <= currentMinuteOfDay
    ? addCalendarDays(current, 1)
    : current;
  const target = localDateTimeToUtc({ ...targetDate, hour, minute }, timeZone);
  const durationMinutes = Math.ceil((target.getTime() - now.getTime()) / 60000);
  return validateDuration(durationMinutes);
}

export function parseAvailabilityOwnerCommand(text, {
  now = new Date(),
  timeZone = "America/Bogota"
} = {}) {
  const command = normalizeCommandText(text);
  const zone = isValidTimeZone(timeZone) ? timeZone : "America/Bogota";

  if (!command) return { ok: false, error: "empty_command" };
  if (["status", "estado"].includes(command)) {
    return { ok: true, type: "status" };
  }
  if (["back", "auto", "volver", "regresar"].includes(command)) {
    return {
      ok: true,
      type: "override",
      payload: { action: "override", mode: "auto" }
    };
  }

  const firstSpace = command.indexOf(" ");
  if (firstSpace < 1) return { ok: false, error: "missing_duration" };
  const rawStatus = command.slice(0, firstSpace);
  const mode = STATUS_ALIASES.get(rawStatus);
  if (!mode) return { ok: false, error: "invalid_mode" };

  const durationText = command.slice(firstSpace + 1);
  const duration = /^(?:until|hasta)\b/.test(durationText)
    ? durationUntilClock(durationText, now, zone)
    : parseRelativeDuration(durationText);
  if (!duration.ok) return duration;

  return {
    ok: true,
    type: "override",
    payload: {
      action: "override",
      mode,
      durationMinutes: duration.minutes
    },
    timeZone: zone
  };
}

export const AVAILABILITY_OWNER_COMMAND_LIMITS = Object.freeze({
  minDurationMinutes: MIN_DURATION_MINUTES,
  maxDurationMinutes: MAX_DURATION_MINUTES
});
