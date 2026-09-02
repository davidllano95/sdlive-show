import { LEAD_CORE_SERVICE_CATEGORIES } from "./lead-core.js";

export const ASSISTANT_NEXT_ACTIONS = Object.freeze([
  "reply",
  "check_availability",
  "check_rental",
  "request_consent",
  "capture_lead",
  "handoff"
]);

const ACTION_SET = new Set(ASSISTANT_NEXT_ACTIONS);
const SERVICE_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);
const ALLOWED_ROOT_KEYS = new Set([
  "language",
  "reply",
  "serviceCategory",
  "nextAction",
  "slotPatch",
  "rentalQuery",
  "leadDraft"
]);
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
const ALLOWED_SLOT_PATCH_KEYS = new Set([
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
const ALLOWED_CONTACT_KEYS = new Set([
  "email",
  "phone",
  "whatsapp",
  "other",
  "preferredChannel"
]);
const ALLOWED_PROJECT_KEYS = new Set(["date", "city", "venue"]);
const ALLOWED_DETAILS_KEYS = new Set(["equipment", "schedule"]);
const ALLOWED_RENTAL_QUERY_KEYS = new Set(["items", "services"]);
const ALLOWED_RENTAL_ITEM_KEYS = new Set(["name", "quantity"]);
const ALLOWED_RENTAL_SERVICE_KEYS = new Set(["name"]);
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

function assertAllowedKeys(value, allowed, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${label} field is not allowed: ${key}`);
  }
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

function normalizeContact(value, { partial = false } = {}) {
  const source = isPlainObject(value) ? value : {};
  assertAllowedKeys(source, ALLOWED_CONTACT_KEYS, "contact");

  const all = {
    email: cleanString(source.email, 320) || null,
    phone: cleanString(source.phone, 80) || null,
    whatsapp: cleanString(source.whatsapp, 80) || null,
    other: cleanString(source.other, 320) || null,
    preferredChannel: cleanString(source.preferredChannel, 40) || null
  };

  if (!partial) return all;
  return Object.fromEntries(
    Object.keys(source)
      .filter((key) => all[key] !== null)
      .map((key) => [key, all[key]])
  );
}

function normalizeProject(value, { partial = false } = {}) {
  const source = isPlainObject(value) ? value : {};
  assertAllowedKeys(source, ALLOWED_PROJECT_KEYS, "project");

  const all = {
    date: cleanString(source.date, 40) || null,
    city: cleanString(source.city, 240) || null,
    venue: cleanString(source.venue, 500) || null
  };

  if (!partial) return all;
  return Object.fromEntries(
    Object.keys(source)
      .filter((key) => all[key] !== null)
      .map((key) => [key, all[key]])
  );
}

function normalizeEquipment(value, label = "equipment") {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > 20) throw new Error(`${label} has too many items`);
  return value.map((item) => {
    const text = cleanString(item, 240);
    if (!text) throw new Error(`${label} contains an empty item`);
    return text;
  });
}

function normalizeDetails(value) {
  if (value === undefined || value === null) {
    return { equipment: [], schedule: null };
  }
  assertAllowedKeys(value, ALLOWED_DETAILS_KEYS, "leadDraft.details");
  return {
    equipment: value.equipment === undefined || value.equipment === null
      ? []
      : normalizeEquipment(value.equipment, "leadDraft.details.equipment"),
    schedule: cleanString(value.schedule, 1000) || null
  };
}

function normalizeLeadDraft(value, defaultLanguage) {
  assertAllowedKeys(value, ALLOWED_LEAD_DRAFT_KEYS, "leadDraft");

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

function normalizeSlotPatch(value) {
  if (value === undefined || value === null) return null;
  assertAllowedKeys(value, ALLOWED_SLOT_PATCH_KEYS, "slotPatch");

  const patch = {};
  if (Object.hasOwn(value, "serviceCategory") && value.serviceCategory !== null) {
    patch.serviceCategory = normalizedService(value.serviceCategory);
  }
  if (Object.hasOwn(value, "language") && value.language !== null) {
    patch.language = safeLanguage(value.language);
  }
  if (Object.hasOwn(value, "market") && value.market !== null) {
    patch.market = cleanString(value.market, 40) || null;
  }
  if (Object.hasOwn(value, "name") && value.name !== null) {
    patch.name = cleanString(value.name, 160) || null;
  }
  if (Object.hasOwn(value, "contact") && value.contact !== null) {
    patch.contact = normalizeContact(value.contact, { partial: true });
  }
  if (Object.hasOwn(value, "project") && value.project !== null) {
    patch.project = normalizeProject(value.project, { partial: true });
  }
  if (Object.hasOwn(value, "equipment") && value.equipment !== null) {
    patch.equipment = normalizeEquipment(value.equipment, "slotPatch.equipment");
  }
  if (Object.hasOwn(value, "schedule") && value.schedule !== null) {
    patch.schedule = cleanString(value.schedule, 1000) || null;
  }
  if (Object.hasOwn(value, "summary") && value.summary !== null) {
    patch.summary = cleanString(value.summary, 5000) || null;
  }

  return patch;
}

function normalizeRentalItem(value, index) {
  if (typeof value === "string") {
    const name = cleanString(value, 240);
    if (!name) throw new Error(`rentalQuery.items[${index}] is empty`);
    return { name, quantity: 1 };
  }

  assertAllowedKeys(value, ALLOWED_RENTAL_ITEM_KEYS, `rentalQuery.items[${index}]`);
  const name = cleanString(value.name, 240);
  const quantity = value.quantity === undefined ? 1 : Number(value.quantity);
  if (!name) throw new Error(`rentalQuery.items[${index}].name is required`);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new Error(`rentalQuery.items[${index}].quantity is invalid`);
  }
  return { name, quantity };
}

function normalizeRentalService(value, index) {
  if (typeof value === "string") {
    const name = cleanString(value, 240);
    if (!name) throw new Error(`rentalQuery.services[${index}] is empty`);
    return { name };
  }

  assertAllowedKeys(value, ALLOWED_RENTAL_SERVICE_KEYS, `rentalQuery.services[${index}]`);
  const name = cleanString(value.name, 240);
  if (!name) throw new Error(`rentalQuery.services[${index}].name is required`);
  return { name };
}

function normalizeRentalQuery(value) {
  assertAllowedKeys(value, ALLOWED_RENTAL_QUERY_KEYS, "rentalQuery");
  const items = value.items === undefined ? [] : value.items;
  const services = value.services === undefined ? [] : value.services;
  if (!Array.isArray(items) || !Array.isArray(services)) {
    throw new Error("rentalQuery items/services must be arrays");
  }
  if (items.length > 30 || services.length > 20) {
    throw new Error("rentalQuery is too large");
  }

  const normalized = {
    items: items.map(normalizeRentalItem),
    services: services.map(normalizeRentalService)
  };
  if (normalized.items.length === 0 && normalized.services.length === 0) {
    throw new Error("rentalQuery requires at least one item or service");
  }
  return normalized;
}

function nullableString(maxLength) {
  return { type: ["string", "null"], maxLength };
}

function nullableServiceSchema() {
  return {
    type: ["string", "null"],
    enum: [...LEAD_CORE_SERVICE_CATEGORIES, null]
  };
}

function strictContactSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["email", "phone", "whatsapp", "other", "preferredChannel"],
    properties: {
      email: nullableString(320),
      phone: nullableString(80),
      whatsapp: nullableString(80),
      other: nullableString(320),
      preferredChannel: nullableString(40)
    }
  };
}

function strictProjectSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["date", "city", "venue"],
    properties: {
      date: nullableString(40),
      city: nullableString(240),
      venue: nullableString(500)
    }
  };
}

export function assistantModelOutputJsonSchema() {
  const slotPatchSchema = {
    type: ["object", "null"],
    additionalProperties: false,
    required: [
      "serviceCategory",
      "language",
      "market",
      "name",
      "contact",
      "project",
      "equipment",
      "schedule",
      "summary"
    ],
    properties: {
      serviceCategory: nullableServiceSchema(),
      language: { type: ["string", "null"], enum: ["en", "es", null] },
      market: nullableString(40),
      name: nullableString(160),
      contact: {
        anyOf: [strictContactSchema(), { type: "null" }]
      },
      project: {
        anyOf: [strictProjectSchema(), { type: "null" }]
      },
      equipment: {
        type: ["array", "null"],
        maxItems: 20,
        items: { type: "string", maxLength: 240 }
      },
      schedule: nullableString(1000),
      summary: nullableString(5000)
    }
  };

  const rentalQuerySchema = {
    type: ["object", "null"],
    additionalProperties: false,
    required: ["items", "services"],
    properties: {
      items: {
        type: "array",
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "quantity"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 240 },
            quantity: { type: "integer", minimum: 1, maximum: 20 }
          }
        }
      },
      services: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 240 }
          }
        }
      }
    }
  };

  const leadDraftSchema = {
    type: ["object", "null"],
    additionalProperties: false,
    required: [
      "serviceCategory",
      "language",
      "market",
      "name",
      "contact",
      "project",
      "summary",
      "details"
    ],
    properties: {
      serviceCategory: {
        type: "string",
        enum: [...LEAD_CORE_SERVICE_CATEGORIES]
      },
      language: { type: "string", enum: ["en", "es"] },
      market: nullableString(40),
      name: { type: "string", minLength: 1, maxLength: 160 },
      contact: strictContactSchema(),
      project: strictProjectSchema(),
      summary: { type: "string", minLength: 1, maxLength: 5000 },
      details: {
        type: "object",
        additionalProperties: false,
        required: ["equipment", "schedule"],
        properties: {
          equipment: {
            type: "array",
            maxItems: 20,
            items: { type: "string", maxLength: 240 }
          },
          schedule: nullableString(1000)
        }
      }
    }
  };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "language",
      "reply",
      "serviceCategory",
      "nextAction",
      "slotPatch",
      "rentalQuery",
      "leadDraft"
    ],
    properties: {
      language: { type: "string", enum: ["en", "es"] },
      reply: { type: "string", minLength: 1, maxLength: 3000 },
      serviceCategory: nullableServiceSchema(),
      nextAction: { type: "string", enum: [...ASSISTANT_NEXT_ACTIONS] },
      slotPatch: slotPatchSchema,
      rentalQuery: rentalQuerySchema,
      leadDraft: leadDraftSchema
    }
  };
}

export function validateAssistantModelOutput(value, context = {}) {
  if (!isPlainObject(value)) {
    return { ok: false, error: "model_output_must_be_object" };
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_ROOT_KEYS.has(key)) {
      return { ok: false, error: "model_output_field_not_allowed", path: `root.${key}` };
    }
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

  let slotPatch = null;
  if (value.slotPatch !== undefined && value.slotPatch !== null) {
    try {
      slotPatch = normalizeSlotPatch(value.slotPatch);
    } catch (error) {
      return {
        ok: false,
        error: "invalid_slot_patch",
        detail: cleanString(error?.message, 300)
      };
    }
  }

  let rentalQuery = null;
  if (value.rentalQuery !== undefined && value.rentalQuery !== null) {
    try {
      rentalQuery = normalizeRentalQuery(value.rentalQuery);
    } catch (error) {
      return {
        ok: false,
        error: "invalid_rental_query",
        detail: cleanString(error?.message, 300)
      };
    }
  }

  if (nextAction === "check_rental" && !rentalQuery) {
    return { ok: false, error: "rental_check_requires_query" };
  }
  if (nextAction !== "check_rental" && rentalQuery) {
    return { ok: false, error: "rental_query_not_allowed_for_action" };
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
  if (!["capture_lead", "handoff"].includes(nextAction) && leadDraft) {
    return { ok: false, error: "lead_draft_not_allowed_for_action" };
  }

  return {
    ok: true,
    output: {
      version: "assistant-model-output-v2",
      language,
      reply,
      serviceCategory,
      nextAction,
      slotPatch,
      rentalQuery,
      leadDraft
    }
  };
}
