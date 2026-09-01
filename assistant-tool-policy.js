import {
  LEAD_CORE_SERVICE_CATEGORIES
} from "./lead-core.js";

export const ASSISTANT_IDENTITY = Object.freeze({
  name: "SD.Live Assistant",
  owner: "SD.Live",
  humanName: "Samuel",
  isHuman: false
});

export const ASSISTANT_TOOL_NAMES = Object.freeze({
  CURRENT_AVAILABILITY: "current_availability",
  CAPTURE_LEAD: "capture_lead"
});

const TOOL_SET = new Set(Object.values(ASSISTANT_TOOL_NAMES));
const SERVICE_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);

const MODEL_SAFE_AVAILABILITY_STATUSES = new Set([
  "available",
  "limited",
  "away",
  "unknown"
]);

function cleanString(value, maxLength = 1000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function cleanNullableString(value, maxLength = 1000) {
  const text = cleanString(value, maxLength);
  return text || null;
}

function safeLanguage(value) {
  return cleanString(value, 8).toLowerCase() === "es" ? "es" : "en";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickNextWindow(value) {
  if (!isPlainObject(value)) return null;
  return {
    startsAt: cleanNullableString(value.startsAt, 80),
    labelEn: cleanNullableString(value.labelEn, 160),
    labelEs: cleanNullableString(value.labelEs, 160)
  };
}

export function assistantPolicy(language = "en") {
  const lang = safeLanguage(language);
  const common = Object.freeze([
    "You are SD.Live Assistant, an automated assistant for SD.Live. Never claim to be Samuel or imply that Samuel personally wrote an automated reply.",
    "Use deterministic tools for availability and lead capture. Never invent tool results.",
    "Never invent, estimate, negotiate, discount or promise prices. Rental and commercial pricing remain backend/human authoritative.",
    "Never promise future availability. Current human availability may only be stated when the availability tool reports availabilityKnown=true.",
    "Do not expose internal admin state, travel timezone, Force Mode, actor emails, Finance data, private phone numbers, secrets, tokens or implementation details.",
    "Do not create a lead before explicit privacy consent has been obtained by the product flow.",
    "A newly captured Assistant lead must start with status new. The Assistant may not choose any later pipeline status.",
    "If required information is missing, ask only for information needed to understand or hand off the request. Do not fabricate missing details.",
    "When a request needs a human decision, say that the details will be handed off to the SD.Live team rather than promising an outcome."
  ]);

  return {
    id: "sdlive-assistant-policy-v1",
    language: lang,
    identity: ASSISTANT_IDENTITY,
    instructions: common,
    serviceCategories: [...LEAD_CORE_SERVICE_CATEGORIES],
    tools: Object.values(ASSISTANT_TOOL_NAMES)
  };
}

export function validateAssistantToolCall(name, input) {
  const tool = cleanString(name, 80);
  if (!TOOL_SET.has(tool)) {
    return { ok: false, error: "tool_not_allowed" };
  }

  const body = isPlainObject(input) ? input : {};

  if (tool === ASSISTANT_TOOL_NAMES.CURRENT_AVAILABILITY) {
    return {
      ok: true,
      tool,
      input: {}
    };
  }

  const serviceCategory = cleanString(body.serviceCategory, 80).toLowerCase();
  if (!SERVICE_SET.has(serviceCategory)) {
    return { ok: false, error: "invalid_service_category" };
  }

  if (body.privacyConsent !== true) {
    return { ok: false, error: "privacy_consent_required" };
  }

  const status = cleanString(body.status || "new", 40).toLowerCase();
  if (status !== "new") {
    return { ok: false, error: "assistant_lead_must_start_new" };
  }

  const nameValue = cleanString(body.name, 240);
  const summary = cleanString(body.summary, 4000);
  const contact = isPlainObject(body.contact) ? body.contact : {};
  const safeContact = {
    email: cleanNullableString(contact.email, 320),
    phone: cleanNullableString(contact.phone, 80),
    whatsapp: cleanNullableString(contact.whatsapp, 80),
    other: cleanNullableString(contact.other, 320),
    preferredChannel: cleanNullableString(contact.preferredChannel, 40)
  };

  if (!nameValue) {
    return { ok: false, error: "name_required" };
  }

  if (!summary) {
    return { ok: false, error: "summary_required" };
  }

  if (![
    safeContact.email,
    safeContact.phone,
    safeContact.whatsapp,
    safeContact.other
  ].some(Boolean)) {
    return { ok: false, error: "contact_required" };
  }

  const project = isPlainObject(body.project) ? body.project : {};

  return {
    ok: true,
    tool,
    input: {
      source: "assistant",
      status: "new",
      serviceCategory,
      language: safeLanguage(body.language),
      market: cleanNullableString(body.market, 40),
      name: nameValue,
      contact: safeContact,
      project: {
        date: cleanNullableString(project.date, 80),
        city: cleanNullableString(project.city, 240),
        venue: cleanNullableString(project.venue, 320)
      },
      summary,
      details: isPlainObject(body.details) ? body.details : {},
      privacyConsent: true
    }
  };
}

export function sanitizeAvailabilityForAssistant(value) {
  const source = isPlainObject(value) ? value : {};
  const availabilityKnown = source.availabilityKnown === true && source.degraded !== true;
  const rawStatus = cleanString(source.status, 40).toLowerCase();
  const status = availabilityKnown && MODEL_SAFE_AVAILABILITY_STATUSES.has(rawStatus)
    ? rawStatus
    : "unknown";

  return {
    availabilityKnown,
    status,
    humanAvailable: availabilityKnown ? source.humanAvailable === true : false,
    humanReachable: availabilityKnown ? source.humanReachable === true : false,
    contactMode: availabilityKnown
      ? cleanNullableString(source.contactMode, 40)
      : null,
    nextHumanWindow: availabilityKnown ? pickNextWindow(source.nextHumanWindow) : null
  };
}

export function assertNoPrivilegedAssistantFields(value) {
  const serialized = JSON.stringify(value || {}).toLowerCase();
  const forbidden = [
    "actoremail",
    "defaulttimezone",
    "timezone",
    "traveltimezone",
    "forcemode",
    "force_on",
    "force_off",
    "finance",
    "api_key",
    "apikey",
    "token",
    "secret"
  ];

  const match = forbidden.find((needle) => serialized.includes(needle));
  return match
    ? { ok: false, error: "privileged_field_detected", match }
    : { ok: true };
}
