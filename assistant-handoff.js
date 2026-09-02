import { normalizeLeadCoreInput } from "./lead-core.js";

const SERVICE_LABELS = Object.freeze({
  live: { en: "Live", es: "En vivo" },
  theatre: { en: "Theatre", es: "Teatro" },
  sound_design: { en: "Sound Design", es: "Diseño sonoro" },
  systems: { en: "Systems", es: "Sistemas" },
  rental: { en: "Rental", es: "Alquiler" },
  other: { en: "Other", es: "Otro" }
});

const FIELD_LABELS = Object.freeze({
  en: {
    lead: "New SD.Live Assistant lead",
    name: "Name",
    service: "Service",
    contact: "Contact",
    date: "Date",
    city: "City",
    venue: "Venue",
    equipment: "Equipment",
    schedule: "Schedule",
    summary: "Summary",
    missing: "Missing",
    notProvided: "Not provided"
  },
  es: {
    lead: "Nuevo lead de SD.Live Assistant",
    name: "Nombre",
    service: "Servicio",
    contact: "Contacto",
    date: "Fecha",
    city: "Ciudad",
    venue: "Venue",
    equipment: "Equipos",
    schedule: "Horario",
    summary: "Resumen",
    missing: "Falta",
    notProvided: "No proporcionado"
  }
});

function cleanString(value, maxLength = 2000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedList(value, maxItems = 20) {
  if (Array.isArray(value)) {
    return value
      .slice(0, maxItems)
      .map((item) => cleanString(item, 240))
      .filter(Boolean);
  }

  const single = cleanString(value, 1000);
  return single ? [single] : [];
}

function firstDetail(details, keys) {
  const source = isPlainObject(details) ? details : {};
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      const list = normalizedList(value);
      if (list.length) return list;
      continue;
    }
    const text = cleanString(value, 1000);
    if (text) return text;
  }
  return null;
}

function contactLines(contact) {
  const lines = [];
  if (contact?.email) lines.push(`Email: ${contact.email}`);
  if (contact?.whatsapp) lines.push(`WhatsApp: ${contact.whatsapp}`);
  if (contact?.phone) lines.push(`Phone: ${contact.phone}`);
  if (contact?.other) lines.push(`Other: ${contact.other}`);
  return lines;
}

function displayValue(value, labels) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : labels.notProvided;
  return cleanString(value, 2000) || labels.notProvided;
}

function buildText(payload, language) {
  const labels = FIELD_LABELS[language] || FIELD_LABELS.en;
  const service = SERVICE_LABELS[payload.serviceCategory]?.[language] || payload.serviceCategory;
  const lines = [
    labels.lead,
    "",
    `${labels.name}: ${payload.name}`,
    `${labels.service}: ${service}`,
    `${labels.contact}: ${payload.contact.length ? payload.contact.join(" · ") : labels.notProvided}`,
    `${labels.date}: ${displayValue(payload.project.date, labels)}`,
    `${labels.city}: ${displayValue(payload.project.city, labels)}`,
    `${labels.venue}: ${displayValue(payload.project.venue, labels)}`,
    `${labels.equipment}: ${displayValue(payload.equipment, labels)}`,
    `${labels.schedule}: ${displayValue(payload.schedule, labels)}`,
    "",
    `${labels.summary}:`,
    payload.summary || labels.notProvided
  ];

  if (payload.missing.length) {
    lines.push("", `${labels.missing}: ${payload.missing.join(", ")}`);
  }

  return lines.join("\n");
}

export function buildAssistantHandoff(value) {
  const lead = normalizeLeadCoreInput(value);

  if (lead.source !== "assistant") {
    throw new Error("Assistant handoff requires source=assistant");
  }

  if (lead.status !== "new") {
    throw new Error("Assistant handoff requires a new lead");
  }

  const equipment = firstDetail(lead.details, [
    "equipment",
    "equipmentRequested",
    "requestedEquipment",
    "items"
  ]);
  const schedule = firstDetail(lead.details, [
    "schedule",
    "eventSchedule",
    "timing",
    "times"
  ]);

  const contact = contactLines(lead.contact);
  const missing = [];
  if (!lead.project.date) missing.push("date");
  if (!lead.project.city) missing.push("city");
  if (!lead.project.venue) missing.push("venue");
  if (!equipment) missing.push("equipment");
  if (!schedule) missing.push("schedule");

  const serviceEn = SERVICE_LABELS[lead.serviceCategory]?.en || lead.serviceCategory;

  const payload = {
    version: "assistant-handoff-v1",
    source: "assistant",
    status: "new",
    serviceCategory: lead.serviceCategory,
    name: lead.name,
    contact,
    preferredContactChannel: lead.contact.preferredChannel || null,
    project: {
      date: lead.project.date,
      city: lead.project.city,
      venue: lead.project.venue
    },
    equipment,
    schedule,
    summary: lead.summary,
    missing
  };

  return {
    ...payload,
    subject: `[SD.Live Lead] ${serviceEn} — ${lead.name}`,
    textEn: buildText(payload, "en"),
    textEs: buildText(payload, "es")
  };
}
