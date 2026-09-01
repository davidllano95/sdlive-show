const SOURCE_VALUES = ["contact", "rental", "assistant"];
const STATUS_VALUES = ["new", "contacted", "quoted", "confirmed", "lost"];
const SERVICE_CATEGORY_VALUES = [
  "live",
  "theatre",
  "sound_design",
  "systems",
  "rental",
  "other"
];
const LANGUAGE_VALUES = ["en", "es"];
const MARKET_VALUES = ["colombia", "international"];
const CONTACT_CHANNEL_VALUES = ["email", "phone", "whatsapp", "other"];

export const LEAD_CORE_SOURCES = Object.freeze([...SOURCE_VALUES]);
export const LEAD_CORE_STATUSES = Object.freeze([...STATUS_VALUES]);
export const LEAD_CORE_SERVICE_CATEGORIES = Object.freeze([
  ...SERVICE_CATEGORY_VALUES
]);

function isPlainObject(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function enumValue(value, allowed, fallback, field) {
  const normalized = cleanString(value, 80).toLowerCase();

  if (!normalized) return fallback;

  if (!allowed.includes(normalized)) {
    throw new Error(`${field} is invalid`);
  }

  return normalized;
}

function optionalIsoDate(value, field) {
  const normalized = cleanString(value, 40);
  if (!normalized) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${field} must use YYYY-MM-DD`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${field} is invalid`);
  }

  return normalized;
}

function normalizeDetails(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new Error("details must be an object");
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > 30000) {
    throw new Error("details is too large");
  }

  return JSON.parse(serialized);
}

function normalizeContact(value) {
  const source = isPlainObject(value) ? value : {};
  const email = cleanString(source.email, 320).toLowerCase();
  const phone = cleanString(source.phone, 80);
  const whatsapp = cleanString(source.whatsapp, 80);
  const other = cleanString(source.other, 320);

  const preferredChannel = enumValue(
    source.preferredChannel,
    CONTACT_CHANNEL_VALUES,
    email
      ? "email"
      : whatsapp
        ? "whatsapp"
        : phone
          ? "phone"
          : other
            ? "other"
            : null,
    "contact.preferredChannel"
  );

  return {
    email: email || null,
    phone: phone || null,
    whatsapp: whatsapp || null,
    other: other || null,
    preferredChannel
  };
}

function normalizeAttribution(value) {
  const source = isPlainObject(value) ? value : {};

  return {
    sourceUrl: cleanString(source.sourceUrl, 1000) || null,
    referrer: cleanString(source.referrer, 1000) || null,
    utmSource: cleanString(source.utmSource, 200) || null,
    utmMedium: cleanString(source.utmMedium, 200) || null,
    utmCampaign: cleanString(source.utmCampaign, 200) || null
  };
}

/**
 * Canonical, transport-neutral Lead Core contract.
 *
 * This does not write to D1. Contact, Rental and the future Assistant should
 * normalize through this contract before any storage adapter is invoked.
 */
export function normalizeLeadCoreInput(value) {
  if (!isPlainObject(value)) {
    throw new Error("lead must be an object");
  }

  const source = enumValue(
    value.source,
    SOURCE_VALUES,
    null,
    "source"
  );

  if (!source) {
    throw new Error("source is required");
  }

  const name = cleanString(value.name, 160);
  if (!name) {
    throw new Error("name is required");
  }

  const status = enumValue(
    value.status,
    STATUS_VALUES,
    "new",
    "status"
  );

  const serviceCategory = enumValue(
    value.serviceCategory,
    SERVICE_CATEGORY_VALUES,
    source === "rental" ? "rental" : "other",
    "serviceCategory"
  );

  const language = enumValue(
    value.language,
    LANGUAGE_VALUES,
    "en",
    "language"
  );

  const market = enumValue(
    value.market,
    MARKET_VALUES,
    "international",
    "market"
  );

  const summary = cleanString(value.summary, 5000);

  const projectSource = isPlainObject(value.project)
    ? value.project
    : {};

  return {
    source,
    status,
    serviceCategory,
    language,
    market,
    name,
    contact: normalizeContact(value.contact),
    project: {
      date: optionalIsoDate(projectSource.date, "project.date"),
      city: cleanString(projectSource.city, 240) || null,
      venue: cleanString(projectSource.venue, 500) || null
    },
    summary: summary || null,
    details: normalizeDetails(value.details),
    attribution: normalizeAttribution(value.attribution)
  };
}

/**
 * Backward-compatible adapter for the existing `leads` table columns.
 * Additional normalized Lead Core fields are intentionally not persisted by
 * this adapter yet; schema/storage evolution is a separate gate.
 */
export function leadCoreToExistingLeadRow(value) {
  const lead = normalizeLeadCoreInput(value);

  return {
    type: lead.source,
    status: lead.status,
    name: lead.name,
    email: lead.contact.email,
    message: lead.summary,
    language: lead.language,
    market: lead.market,
    sourceUrl: lead.attribution.sourceUrl,
    referrer: lead.attribution.referrer,
    utmSource: lead.attribution.utmSource,
    utmMedium: lead.attribution.utmMedium,
    utmCampaign: lead.attribution.utmCampaign
  };
}
