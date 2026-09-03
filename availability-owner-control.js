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

function statusReply(state) {
  const status = String(state?.effective?.status || "available").toUpperCase();
  const source = humanSource(state?.effective?.source || "availability");
  const timeZone = activeTimeZone(state);
  return `${status} · ${source} · ${timeZone}`;
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

function noOpDdlStatement() {
  const result = { success: true, meta: { changes: 0 } };
  return {
    bind() { return this; },
    async run() { return result; },
    async all() { return { results: [] }; },
    async first() { return null; }
  };
}

/**
 * Availability Core predates the current no-public-DDL invariant and performs
 * idempotent CREATE TABLE guards on first use. This transport must not execute
 * them. Mask DDL only; all SELECT/INSERT/UPDATE operations still delegate to
 * the canonical CMS_DB binding and therefore the canonical Availability path.
 */
export function availabilityEnvWithoutPublicDdl(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") return env;

  const shieldedDb = new Proxy(db, {
    get(target, property) {
      if (property === "prepare") {
        return (sql) => {
          const statement = String(sql || "");
          if (/^\s*(?:CREATE|ALTER|DROP)\b/i.test(statement)) return noOpDdlStatement();
          return target.prepare(sql);
        };
      }
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    }
  });

  return { ...env, CMS_DB: shieldedDb };
}

/**
 * Execute one already-authenticated owner command through the canonical
 * Availability API contract. This module has no WhatsApp transport/auth logic
 * and creates no alternate Availability write path.
 */
export async function executeAvailabilityOwnerCommand(
  env,
  text,
  {
    actorEmail,
    now = new Date(),
    availabilityHandler = handleAvailabilityApi
  } = {}
) {
  const configuredActor = String(actorEmail || "").trim().toLowerCase();
  if (!configuredActor || !configuredActor.includes("@")) {
    throw new Error("Availability owner actor email is missing");
  }

  const language = normalizeLanguage(text);
  const verifyOwner = async () => ({ email: configuredActor });
  const runtimeEnv = availabilityEnvWithoutPublicDdl(env);

  const current = await availabilityJson(
    await availabilityHandler(jsonRequest("GET"), runtimeEnv, {
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
      reply: statusReply(current),
      state: current
    };
  }

  const saved = await availabilityJson(
    await availabilityHandler(jsonRequest("PUT", command.payload), runtimeEnv, {
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
