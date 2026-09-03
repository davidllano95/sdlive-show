import { LEAD_CORE_SERVICE_CATEGORIES } from "./lead-core.js";

const SERVICE_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);
const SESSION_VERSION = "assistant-session-v1";
const MAX_TURNS = 60;
const LEAD_MARKETS = new Set(["colombia", "international"]);
const LEAD_CONTACT_CHANNELS = new Set(["email", "phone", "whatsapp", "other"]);
const MONTHS = Object.freeze({
  january: 1,
  january: 1,
  enero: 1,
  february: 2,
  febrero: 2,
  march: 3,
  marzo: 3,
  april: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  june: 6,
  junio: 6,
  july: 7,
  julio: 7,
  august: 8,
  agosto: 8,
  september: 9,
  sept: 9,
  septiembre: 9,
  october: 10,
  octubre: 10,
  november: 11,
  noviembre: 11,
  december: 12,
  diciembre: 12
});

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

function normalizedWord(value) {
  return cleanString(value, 40)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.$/, "");
}

function validDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function isoDate(year, month, day) {
  if (!validDateParts(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function leadDateValue(value) {
  const raw = cleanString(value, 40);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const monthFirst = raw.match(/^([A-Za-zÀ-ÿ.]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{4})$/i);
  if (monthFirst) {
    const month = MONTHS[normalizedWord(monthFirst[1])];
    if (month) return isoDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
  }

  const dayFirst = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([A-Za-zÀ-ÿ.]+)(?:\s+de)?\s+(\d{4})$/i);
  if (dayFirst) {
    const month = MONTHS[normalizedWord(dayFirst[2])];
    if (month) return isoDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
  }

  return null;
}

function leadMarketValue(value) {
  const market = cleanString(value, 40).toLowerCase();
  return LEAD_MARKETS.has(market) ? market : null;
}

function leadContactValue(value) {
  const contact = contactValue(value);
  const preferred = cleanString(contact.preferredChannel, 40).toLowerCase();
  return {
    ...contact,
    preferredChannel: LEAD_CONTACT_CHANNELS.has(preferred) ? preferred : null
  };
}

function deterministicLeadSummary(slots) {
  const existing = nullableString(slots.summary, 5000);
  if (existing) return existing;

  const parts = [];
  const service = nullableString(slots.serviceCategory, 80);
  const project = projectValue(slots.project);
  const equipment = equipmentValue(slots.equipment);
  const schedule = nullableString(slots.schedule, 1000);

  if (service) parts.push(`Service: ${service}`);
  if (project.date) parts.push(`Project date: ${project.date}`);
  if (project.city) parts.push(`City: ${project.city}`);
  if (project.venue) parts.push(`Venue: ${project.venue}`);
  if (equipment.length) parts.push(`Equipment / technical needs: ${equipment.join(", ")}`);
  if (schedule) parts.push(`Schedule: ${schedule}`);

  return parts.length ? parts.join(". ").slice(0, 5000) : null;
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
  const project = projectValue(slots.project);
  return {
    serviceCategory: slots.serviceCategory,
    language: languageValue(slots.language),
    market: leadMarketValue(slots.market),
    name: slots.name,
    contact: leadContactValue(slots.contact),
    project: {
      ...project,
      date: leadDateValue(project.date)
    },
    summary: deterministicLeadSummary(slots),
    details: {
      equipment: equipmentValue(slots.equipment),
      schedule: nullableString(slots.schedule, 1000)
    }
  };
}
