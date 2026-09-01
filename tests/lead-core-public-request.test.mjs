import test from "node:test";
import assert from "node:assert/strict";

import { canonicalizePublicLeadRequest } from "../lead-core-public-request.js";

function jsonRequest(path, body) {
  return new Request(`https://sdlive.show${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.10"
    },
    body: JSON.stringify(body)
  });
}

test("canonicalizes valid Contact payloads without dropping security/privacy fields", async () => {
  const request = jsonRequest("/api/contact", {
    name: "  Client Name  ",
    email: " CLIENT@EXAMPLE.COM ",
    message: "  General inquiry  ",
    language: "es",
    market: "colombia",
    sourceUrl: " https://sdlive.show/es-co/ ",
    referrer: " https://google.com/ ",
    utmSource: " linkedin ",
    utmMedium: " social ",
    utmCampaign: " launch ",
    turnstileToken: "token-123",
    privacyConsent: true,
    privacyPolicyVersion: "2026-08-19"
  });

  const canonical = await canonicalizePublicLeadRequest(request);
  const body = await canonical.json();

  assert.equal(body.name, "Client Name");
  assert.equal(body.email, "client@example.com");
  assert.equal(body.message, "General inquiry");
  assert.equal(body.language, "es");
  assert.equal(body.market, "colombia");
  assert.equal(body.sourceUrl, "https://sdlive.show/es-co/");
  assert.equal(body.referrer, "https://google.com/");
  assert.equal(body.utmSource, "linkedin");
  assert.equal(body.utmMedium, "social");
  assert.equal(body.utmCampaign, "launch");
  assert.equal(body.turnstileToken, "token-123");
  assert.equal(body.privacyConsent, true);
  assert.equal(body.privacyPolicyVersion, "2026-08-19");
});

test("canonicalizes Rental lead fields while preserving Rental-specific payload", async () => {
  const request = jsonRequest("/api/rental", {
    name: " Rental Client ",
    email: " RENTAL@EXAMPLE.COM ",
    eventType: "theater",
    venue: " Teatro Mayor ",
    eventDate: "2026-10-15",
    rentalDays: 2,
    attendees: 500,
    items: { wing: 1 },
    services: { engineering: "yes" },
    notes: "  Need FOH package  ",
    language: "en",
    market: "colombia",
    turnstileToken: "rental-token",
    privacyConsent: true,
    privacyPolicyVersion: "2026-08-19"
  });

  const canonical = await canonicalizePublicLeadRequest(request);
  const body = await canonical.json();

  assert.equal(body.name, "Rental Client");
  assert.equal(body.email, "rental@example.com");
  assert.equal(body.venue, "Teatro Mayor");
  assert.equal(body.eventDate, "2026-10-15");
  assert.equal(body.notes, "Need FOH package");
  assert.equal(body.eventType, "theater");
  assert.equal(body.rentalDays, 2);
  assert.deepEqual(body.items, { wing: 1 });
  assert.deepEqual(body.services, { engineering: "yes" });
  assert.equal(body.turnstileToken, "rental-token");
});

test("malformed public leads fall through to established form validation unchanged", async () => {
  const request = jsonRequest("/api/contact", {
    name: "",
    email: "bad",
    message: ""
  });

  const result = await canonicalizePublicLeadRequest(request);
  assert.equal(result, request);
});

test("non-lead routes are untouched", async () => {
  const request = jsonRequest("/api/other", { name: "A" });
  const result = await canonicalizePublicLeadRequest(request);
  assert.equal(result, request);
});
