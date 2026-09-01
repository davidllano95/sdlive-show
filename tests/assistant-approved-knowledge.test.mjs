import test from "node:test";
import assert from "node:assert/strict";

import { LEAD_CORE_SERVICE_CATEGORIES } from "../lead-core.js";
import {
  ASSISTANT_KNOWLEDGE_VERSION,
  approvedAssistantKnowledgeContext,
  getApprovedAssistantClaim,
  getApprovedAssistantKnowledge
} from "../assistant-approved-knowledge.js";

test("knowledge boundary covers every executable Lead Core service category", () => {
  const context = approvedAssistantKnowledgeContext("en");
  assert.equal(context.length, LEAD_CORE_SERVICE_CATEGORIES.length);
  assert.deepEqual(
    context.map((entry) => entry.serviceCategory),
    LEAD_CORE_SERVICE_CATEGORIES
  );
  assert.ok(context.every((entry) => entry.version === ASSISTANT_KNOWLEDGE_VERSION));
});

test("live knowledge exposes only approved public capabilities", () => {
  const entry = getApprovedAssistantKnowledge("live", "en");
  assert.equal(entry.label, "Live & Production Audio");
  assert.match(entry.summary, /FOH and monitor mixing/);
  assert.deepEqual(
    entry.approvedClaims.map((claim) => claim.id),
    ["live.foh_monitors", "live.rf", "live.playback", "live.corporate"]
  );
  assert.ok(entry.sourcePaths.includes("index.html"));
});

test("theatre knowledge includes public QLab, systems and handoff claims", () => {
  const entry = getApprovedAssistantKnowledge("theatre", "en");
  assert.ok(entry.approvedClaims.some((claim) => claim.id === "theatre.playback_qlab"));
  assert.ok(entry.approvedClaims.some((claim) => claim.id === "theatre.system_console"));
  assert.ok(entry.approvedClaims.some((claim) => claim.id === "theatre.rehearsal_handoff"));
  assert.ok(entry.sourcePaths.includes("theatre-sound-design-audio-post.html"));
});

test("rental knowledge names listed inventory without claiming current availability", () => {
  const entry = getApprovedAssistantKnowledge("rental", "en");
  const lv1 = entry.approvedClaims.find((claim) => claim.id === "rental.lv1");
  assert.match(lv1.text, /is listed in the Bogotá rental inventory/);
  assert.equal(entry.guardrails.mayStateRentalItemAvailability, false);
  assert.equal(entry.guardrails.requiresDeterministicRentalToolForInventoryAvailability, true);
  assert.ok(entry.sourcePaths.includes("alquiler-sonido-wing-midas-dl32-bogota.html"));
});

test("knowledge payload deliberately excludes public prices and commercial numbers", () => {
  const serialized = JSON.stringify(approvedAssistantKnowledgeContext("es"));
  for (const forbidden of ["$", "350000", "2700000", "3000000", "500000", "6000000"] ) {
    assert.equal(serialized.includes(forbidden), false, `unexpected commercial value: ${forbidden}`);
  }
});

test("every knowledge entry disables price negotiation and current availability claims", () => {
  for (const entry of approvedAssistantKnowledgeContext("en")) {
    assert.equal(entry.guardrails.mayQuoteOrNegotiateCommercialTerms, false);
    assert.equal(entry.guardrails.mayStateCurrentAvailability, false);
    assert.equal(entry.guardrails.mayInventCapabilities, false);
    assert.equal(entry.guardrails.requiresDeterministicAvailabilityToolForCurrentStatus, true);
  }
});

test("claim lookup returns only known claim ids with provenance", () => {
  assert.deepEqual(
    getApprovedAssistantClaim("systems", "systems.dante", "es"),
    {
      id: "systems.dante",
      serviceCategory: "systems",
      text: "Redes de audio Dante",
      sourcePaths: ["index.html", "theatre-sound-design-audio-post.html"]
    }
  );
  assert.equal(getApprovedAssistantClaim("systems", "systems.fabricated", "en"), null);
});

test("invalid service categories fail closed", () => {
  assert.throws(
    () => getApprovedAssistantKnowledge("marketing", "en"),
    /category is invalid/
  );
});

test("Spanish and English contexts preserve the same claim ids", () => {
  const en = approvedAssistantKnowledgeContext("en");
  const es = approvedAssistantKnowledgeContext("es");
  assert.deepEqual(
    en.map((entry) => entry.approvedClaims.map((claim) => claim.id)),
    es.map((entry) => entry.approvedClaims.map((claim) => claim.id))
  );
});
