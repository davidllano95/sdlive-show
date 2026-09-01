import { LEAD_CORE_SERVICE_CATEGORIES } from "./lead-core.js";

export const ASSISTANT_NEXT_ACTIONS = Object.freeze([
  "reply",
  "check_availability",
  "request_consent",
  "capture_lead",
  "handoff"
]);

const ACTION_SET = new Set(ASSISTANT_NEXT_ACTIONS);
const SERVICE_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);
const ALLOWED_LEAD_DRAFT_KEYS = new Set([
  "serviceCategory",
  "language",
  "market",
  "name",
  "contact",
  "project",
  "summary",
  "details"
]);
const FORBIDDEN_MODEL_KEYS = [
  "price",
  "pricing",
  "quote",
  "quoted",
  "discount",
  "rate",
  "total",
  "status",
  "source",
  "privacyconsent",
  "availabilityconfirmed",
  "humanavailable",
  "forcemode",
  "timezone",
  "finance"
];

function cleanString(value, maxLength = 2000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeLanguage(value) {
  const lang = cleanString(value, 8).toLowerCase();
  return lang === "es" ? "es" : "en";
}

function normalizedService(value) {
  const service = cleanString(value, 80).toLowerCase();
  if (!service) return null;
  if (!SERVICE_SET.has(service)) throw new Error("serviceCategory is invalid");
  return service;
}

function suspiciousKey(key) {
  const normalized = cleanString(key, 100).toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  return FORBIDDEN_MODEL_KEYS.find((needle) => normalized.includes(needle)) || null;
}

function findForbiddenKey(value, path = "root", depth = 0) {
  if (depth > 6 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${path}[${index}]`, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isPlainObject(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    const forbidden = suspiciousKey(key);
    if (forbidden) return { path: `${path}.${key}`, key, forbidden };
    const found = findForbiddenKey(child, `${path}.${key}`, depth + 1);
    if (found) return found;
  }
  return null;
}

function normalizeContact(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    email: cleanString(source.email, 320) || null,
    phone: cleanString(source.phone, 80) || null,
    whatsapp: cleanString(source.whatsapp, 80) || null,
    other: cleanString(source.other, 320) || null,
    preferredChannel: cleanString(source.preferredChannel, 40) || null
  };
}

function normalizeProject(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    date: cleanString(source.date, 40) || null,
    city: cleanString(source.city, 240) || null,
    venue: cleanString(source.venue, 500) || null
  };
}

function normalizeDetails(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) throw new Error("leadDraft.details must be an object");
  const serialized = JSON.stringify(value);
  if (serialized.length > 12000) throw new Error("leadDraft.details is too large");
  const forbidden = findForbiddenKey(value, "leadDraft.details");
  if (forbidden) {
    throw new Error(`forbidden model field: ${forbidden.path}`);
  }
  return JSON.parse(serialized);
}

function normalizeLeadDraft(value, defaultLanguage) {
  if (!isPlainObject(value)) throw new Error("leadDraft is required");

  for (const key of Object.keys(value)) {
    if (!ALLOWED_LEAD_DRAFT_KEYS.has(key)) {
      throw new Error(`leadDraft field is not allowed: ${key}`);
    }
  }

  const serviceCategory = normalizedService(value.serviceCategory);
  if (!serviceCategory) throw new Error("leadDraft.serviceCategory is required");

  const name = cleanString(value.name, 160);
  const summary = cleanString(value.summary, 5000);
  if (!name) throw new Error("leadDraft.name is required");
  if (!summary) throw new Error("leadDraft.summary is required");

  const contact = normalizeContact(value.contact);
  if (![contact.email, contact.phone, contact.whatsapp, contact.other].some(Boolean)) {
    throw new Error("leadDraft requires a real contact channel");
  }

  return {
    serviceCategory,
    language: safeLanguage(value.language || defaultLanguage),
    market: cleanString(value.market, 40) || null,
    name,
    contact,
    project: normalizeProject(value.project),
    summary,
    details: normalizeDetails(value.details)
  };
}

export function validateAssistantModelOutput(value, context = {}) {
  if (!isPlainObject(value)) {
    return { ok: false, error: "model_output_must_be_object" };
  }

  const forbidden = findForbiddenKey(value);
  if (forbidden) {
    return {
      ok: false,
      error: "forbidden_model_field",
      path: forbidden.path
    };
  }

  const reply = cleanString(value.reply, 3000);
  if (!reply) return { ok: false, error: "reply_required" };

  const language = safeLanguage(value.language);
  const nextAction = cleanString(value.nextAction, 80).toLowerCase();
  if (!ACTION_SET.has(nextAction)) {
    return { ok: false, error: "next_action_not_allowed" };
  }

  let serviceCategory;
  try {
    serviceCategory = normalizedService(value.serviceCategory);
  } catch {
    return { ok: false, error: "invalid_service_category" };
  }

  if (nextAction === "capture_lead" && context.privacyConsentGranted !== true) {
    return { ok: false, error: "capture_requires_server_consent" };
  }

  let leadDraft = null;
  if (value.leadDraft !== undefined && value.leadDraft !== null) {
    try {
      leadDraft = normalizeLeadDraft(value.leadDraft, language);
    } catch (error) {
      return {
        ok: false,
        error: "invalid_lead_draft",
        detail: cleanString(error?.message, 300)
      };
    }
  }

  if (nextAction === "capture_lead" && !leadDraft) {
    return { ok: false, error: "capture_requires_lead_draft" };
  }

  return {
    ok: true,
    output: {
      version: "assistant-model-output-v1",
      language,
      reply,
      serviceCategory,
      nextAction,
      leadDraft
    }
  };
}
