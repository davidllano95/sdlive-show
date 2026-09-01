import { handleAvailabilityApi } from "./availability-core.js";
import { parseAvailabilityOwnerCommand } from "./availability-owner-command.js";

function jsonRequest(method, body = null) {
  return new Request("https://sdlive.show/api/admin/availability", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
}

function normalizeLanguage(text) {
  const value = String(text || "").trim().toLowerCase();
  return /\b(?:ausente|disponible|limitado|limitada|hasta|volver|regresar|estado)\b/.test(value)
    ? "es"
    : "en";
}

function humanSource(value) {
  return String(value || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function activeTimeZone(state) {
  return String(
    state?.effective?.timeZone ||
    state?.profile?.defaultTimezone ||
    "America/Bogota"
  );
}

function formatExpiry(value, timeZone, language) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function commandHelp(language) {
  return language === "es"
    ? "Comando no reconocido. Usa, por ejemplo: ausente 2h, limitado 30m, ausente hasta 23:00, volver o estado."
    : "Command not recognized. Try: away 2h, limited 30m, away until 23:00, back or status.";
}

function statusReply(state, language) {
  const status = String(state?.effective?.status || "available").toUpperCase();
  const source = humanSource(state?.effective?.source || "availability");
  const timeZone = activeTimeZone(state);

  return language === "es"
    ? `${status} · ${source} · ${timeZone}`
    : `${status} · ${source} · ${timeZone}`;
}

function overrideReply(command, state, language) {
  const effective = String(state?.effective?.status || "available").toUpperCase();
  const mode = String(command?.payload?.mode || "auto").toUpperCase();
  const timeZone = activeTimeZone(state);

  if (mode === "AUTO") {
    return language === "es"
      ? `Temporary status volvió a AUTO. Estado efectivo: ${effective}.`
      : `Temporary status returned to AUTO. Effective status: ${effective}.`;
  }

  const expiry = formatExpiry(state?.override?.expiresAt, timeZone, language);
  if (language === "es") {
    return expiry
      ? `${mode} aplicado hasta ${expiry}. Estado efectivo: ${effective}.`
      : `${mode} aplicado. Estado efectivo: ${effective}.`;
  }

  return expiry
    ? `${mode} applied until ${expiry}. Effective status: ${effective}.`
    : `${mode} applied. Effective status: ${effective}.`;
}

async function availabilityJson(response) {
  if (!response) throw new Error("Availability handler returned no response");
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `Availability request failed (${response.status})`);
  }
  return data;
}

/**
 * Execute one verified-owner command through the exact same Availability API
 * contract used by the Admin. This module deliberately contains no WhatsApp
 * transport/authentication logic.
 */
export async function executeAvailabilityOwnerCommand(
  env,
  text,
  {
    actorEmail = "sam@sdlive.show",
    now = new Date(),
    availabilityHandler = handleAvailabilityApi
  } = {}
) {
  const language = normalizeLanguage(text);
  const verifyOwner = async () => ({ email: actorEmail });

  const current = await availabilityJson(
    await availabilityHandler(jsonRequest("GET"), env, {
      verifyAdmin: verifyOwner
    })
  );

  const command = parseAvailabilityOwnerCommand(text, {
    now,
    timeZone: activeTimeZone(current)
  });

  if (!command.ok) {
    return {
      ok: false,
      type: "invalid",
      error: command.error,
      language,
      reply: commandHelp(language),
      state: current
    };
  }

  if (command.type === "status") {
    return {
      ok: true,
      type: "status",
      language,
      reply: statusReply(current, language),
      state: current
    };
  }

  const saved = await availabilityJson(
    await availabilityHandler(jsonRequest("PUT", command.payload), env, {
      verifyAdmin: verifyOwner
    })
  );

  return {
    ok: true,
    type: "override",
    language,
    command,
    reply: overrideReply(command, saved, language),
    state: saved
  };
}
