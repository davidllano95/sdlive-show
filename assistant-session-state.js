import { LEAD_CORE_SERVICE_CATEGORIES } from "./lead-core.js";

const SERVICE_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);
const SESSION_VERSION = "assistant-session-v1";
const MAX_TURNS = 60;

export const ASSISTANT_SESSION_STORAGE_POLICY = Object.freeze({
  persistence: "none",
  retentionDecision: "not_configured",
  transcriptStored: false,
  rawUserMessagesStored: false,
  rawAssistantMessagesStored: false
});

const ALLOWED_SLOT_KEYS = new Set([
  "serviceCategory",
  "language",
  "market",
  "name",
  "contact",
  "project",
  "equipment",
  "schedule",
  "summary"
]);

function cleanString(value, maxLength = 1000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function nullableString(value, maxLength = 1000) {
  return cleanString(value, maxLength) || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isoNow(now) {
  const value = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(value.getTime())) throw new Error("Invalid session timestamp");
  return value.toISOString();
}

function languageValue(value, fallback = "en") {
  const language = cleanString(value, 8).toLowerCase();
  return language === "es" ? "es" : language === "en" ? "en" : fallback;
}

function serviceValue(value) {
  const service = cleanString(value, 80).toLowerCase();
  if (!service) return null;
  if (!SERVICE_SET.has(service)) throw new Error("Invalid Assistant service category");
  return service;
}

function contactValue(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    email: nullableString(source.email, 320),
    phone: nullableString(source.phone, 80),
    whatsapp: nullableString(source.whatsapp, 80),
    other: nullableString(source.other, 320),
    preferredChannel: nullableString(source.preferredChannel, 40)
  };
}

function projectValue(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    date: nullableString(source.date, 40),
    city: nullableString(source.city, 240),
    venue: nullableString(source.venue, 500)
  };
}

function equipmentValue(value) {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  return source
    .slice(0, 20)
    .map((item) => cleanString(item, 240))
    .filter(Boolean);
}

function emptySlots(language = "en") {
  return {
    serviceCategory: null,
    language,
    market: null,
    name: null,
    contact: contactValue({}),
    project: projectValue({}),
    equipment: [],
    schedule: null,
    summary: null
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function validateBaseState(state) {
  if (!isPlainObject(state) || state.version !== SESSION_VERSION) {
    throw new Error("Invalid Assistant session state");
  }
  if (!cleanString(state.sessionId, 160)) {
    throw new Error("Assistant sessionId is required");
  }
  const turns = Number(state.turnCount);
  if (!Number.isInteger(turns) || turns < 0 || turns > MAX_TURNS) {
    throw new Error("Invalid Assistant turn count");
  }
}

export function createAssistantSessionState({
  sessionId,
  language = "en",
  now = new Date()
} = {}) {
  const id = cleanString(sessionId, 160);
  if (!id) throw new Error("Assistant sessionId is required");
  const timestamp = isoNow(now);
  const safeLanguage = languageValue(language);

  return {
    version: SESSION_VERSION,
    sessionId: id,
    storagePolicy: ASSISTANT_SESSION_STORAGE_POLICY,
    turnCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    consent: {
      granted: false,
      policyVersion: null,
      grantedAt: null
    },
    slots: emptySlots(safeLanguage)
  };
}

export function applyAssistantTurnSlots(
  state,
  patch,
  { now = new Date() } = {}
) {
  validateBaseState(state);
  if (!isPlainObject(patch)) throw new Error("Assistant slot patch must be an object");

  for (const key of Object.keys(patch)) {
    if (!ALLOWED_SLOT_KEYS.has(key)) {
      throw new Error(`Assistant slot field is not allowed: ${key}`);
    }
  }

  if (state.turnCount >= MAX_TURNS) {
    throw new Error("Assistant session turn limit reached");
  }

  const next = cloneState(state);
  const slots = next.slots || emptySlots("en");

  if (Object.hasOwn(patch, "serviceCategory")) {
    slots.serviceCategory = serviceValue(patch.serviceCategory);
  }
  if (Object.hasOwn(patch, "language")) {
    slots.language = languageValue(patch.language, slots.language || "en");
  }
  if (Object.hasOwn(patch, "market")) {
    slots.market = nullableString(patch.market, 40);
  }
  if (Object.hasOwn(patch, "name")) {
    slots.name = nullableString(patch.name, 160);
  }
  if (Object.hasOwn(patch, "contact")) {
    slots.contact = {
      ...contactValue(slots.contact),
      ...Object.fromEntries(
        Object.entries(contactValue(patch.contact))
          .filter(([, value]) => value !== null)
      )
    };
  }
  if (Object.hasOwn(patch, "project")) {
    slots.project = {
      ...projectValue(slots.project),
      ...Object.fromEntries(
        Object.entries(projectValue(patch.project))
          .filter(([, value]) => value !== null)
      )
    };
  }
  if (Object.hasOwn(patch, "equipment")) {
    slots.equipment = equipmentValue(patch.equipment);
  }
  if (Object.hasOwn(patch, "schedule")) {
    slots.schedule = nullableString(patch.schedule, 1000);
  }
  if (Object.hasOwn(patch, "summary")) {
    slots.summary = nullableString(patch.summary, 5000);
  }

  next.slots = slots;
  next.turnCount += 1;
  next.updatedAt = isoNow(now);
  return next;
}

export function applyAssistantConsentState(
  state,
  {
    granted,
    policyVersion = null,
    grantedAt = null
  } = {},
  { now = new Date() } = {}
) {
  validateBaseState(state);
  if (typeof granted !== "boolean") {
    throw new Error("Assistant consent state requires an explicit boolean");
  }

  const next = cloneState(state);
  if (!granted) {
    next.consent = {
      granted: false,
      policyVersion: null,
      grantedAt: null
    };
  } else {
    const version = cleanString(policyVersion, 80);
    if (!version) throw new Error("Privacy policy version is required for granted consent");
    next.consent = {
      granted: true,
      policyVersion: version,
      grantedAt: isoNow(grantedAt || now)
    };
  }
  next.updatedAt = isoNow(now);
  return next;
}

export function assistantSessionModelContext(state) {
  validateBaseState(state);
  const safe = cloneState(state);
  return {
    version: safe.version,
    turnCount: safe.turnCount,
    consentGranted: safe.consent?.granted === true,
    slots: safe.slots
  };
}

export function assistantSessionLeadDraft(state) {
  validateBaseState(state);
  const slots = cloneState(state.slots || emptySlots("en"));
  return {
    serviceCategory: slots.serviceCategory,
    language: slots.language,
    market: slots.market,
    name: slots.name,
    contact: slots.contact,
    project: slots.project,
    summary: slots.summary,
    details: {
      equipment: slots.equipment,
      schedule: slots.schedule
    }
  };
}
