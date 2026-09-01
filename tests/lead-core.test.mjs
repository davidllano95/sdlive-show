import test from "node:test";
import assert from "node:assert/strict";

import {
  LEAD_CORE_SERVICE_CATEGORIES,
  LEAD_CORE_SOURCES,
  LEAD_CORE_STATUSES,
  leadCoreToExistingLeadRow,
  normalizeLeadCoreInput
} from "../lead-core.js";

test("Lead Core exposes the approved source, status and service vocabularies", () => {
  assert.deepEqual(LEAD_CORE_SOURCES, ["contact", "rental", "assistant"]);
  assert.deepEqual(LEAD_CORE_STATUSES, [
    "new",
    "contacted",
    "quoted",
    "confirmed",
    "lost"
  ]);
  assert.deepEqual(LEAD_CORE_SERVICE_CATEGORIES, [
    "live",
    "theatre",
    "sound_design",
    "systems",
    "rental",
    "other"
  ]);
});

test("normalizes a general Contact lead", () => {
  const lead = normalizeLeadCoreInput({
    source: "contact",
    name: "  Ada Lovelace  ",
    language: "es",
    market: "colombia",
    serviceCategory: "theatre",
    contact: {
      email: " ADA@EXAMPLE.COM ",
      preferredChannel: "email"
    },
    project: {
      date: "2026-10-15",
      city: " Bogotá ",
      venue: " Teatro Mayor "
    },
    summary: "  Diseño y programación de audio.  ",
    details: { schedule: "load-in 08:00" },
    attribution: {
      sourceUrl: "https://sdlive.show/es-co/",
      utmSource: "linkedin"
    }
  });

  assert.equal(lead.source, "contact");
  assert.equal(lead.status, "new");
  assert.equal(lead.serviceCategory, "theatre");
  assert.equal(lead.name, "Ada Lovelace");
  assert.equal(lead.contact.email, "ada@example.com");
  assert.equal(lead.project.date, "2026-10-15");
  assert.equal(lead.project.city, "Bogotá");
  assert.equal(lead.project.venue, "Teatro Mayor");
  assert.equal(lead.summary, "Diseño y programación de audio.");
  assert.deepEqual(lead.details, { schedule: "load-in 08:00" });
  assert.equal(lead.attribution.utmSource, "linkedin");
});

test("Rental leads default to the Rental service category", () => {
  const lead = normalizeLeadCoreInput({
    source: "rental",
    name: "Rental Client",
    contact: { email: "rental@example.com" }
  });

  assert.equal(lead.serviceCategory, "rental");
});

test("Assistant is a valid future lead source without requiring an email", () => {
  const lead = normalizeLeadCoreInput({
    source: "assistant",
    name: "Visitor",
    contact: {
      whatsapp: "+57 300 000 0000"
    },
    serviceCategory: "live",
    summary: "FOH inquiry"
  });

  assert.equal(lead.source, "assistant");
  assert.equal(lead.contact.email, null);
  assert.equal(lead.contact.preferredChannel, "whatsapp");
});

test("rejects invalid enums and impossible project dates", () => {
  assert.throws(
    () => normalizeLeadCoreInput({ source: "crm", name: "A" }),
    /source is invalid/
  );

  assert.throws(
    () => normalizeLeadCoreInput({
      source: "contact",
      name: "A",
      serviceCategory: "marketing"
    }),
    /serviceCategory is invalid/
  );

  assert.throws(
    () => normalizeLeadCoreInput({
      source: "contact",
      name: "A",
      project: { date: "2026-02-30" }
    }),
    /project.date is invalid/
  );
});

test("existing leads adapter preserves the current D1 row contract", () => {
  const row = leadCoreToExistingLeadRow({
    source: "contact",
    status: "new",
    name: "Client",
    contact: { email: "client@example.com" },
    language: "en",
    market: "international",
    summary: "General inquiry",
    attribution: {
      sourceUrl: "https://sdlive.show/",
      referrer: "https://google.com/",
      utmSource: "google",
      utmMedium: "organic",
      utmCampaign: "brand"
    }
  });

  assert.deepEqual(row, {
    type: "contact",
    status: "new",
    name: "Client",
    email: "client@example.com",
    message: "General inquiry",
    language: "en",
    market: "international",
    sourceUrl: "https://sdlive.show/",
    referrer: "https://google.com/",
    utmSource: "google",
    utmMedium: "organic",
    utmCampaign: "brand"
  });
});
