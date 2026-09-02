import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_IDEMPOTENCY_POLICY,
  assistantNotificationIdempotencyKey,
  buildAssistantLeadCreateIdempotencyKey,
  createAssistantRequestId,
  createAssistantSessionId,
  isAssistantLeadCreateIdempotencyKey,
  isAssistantRequestId,
  isAssistantSessionId
} from "../assistant-idempotency.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const SESSION_ID = "asst_123e4567e89b12d3a456426614174000";

function consent(overrides = {}) {
  return {
    source: "assistant",
    granted: true,
    privacyPolicyVersion: "2026-08-19",
    authorizationMethod: "assistant_explicit_confirmation",
    grantedAt: "2026-09-01T23:30:00.000Z",
    ...overrides
  };
}

function lead(overrides = {}) {
  return {
    source: "assistant",
    status: "new",
    serviceCategory: "live",
    language: "es",
    market: "colombia",
    name: "Cliente Privado",
    contact: {
      email: "client@example.com",
      whatsapp: "+57 300 000 0000",
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Venue QA"
    },
    summary: "Necesita FOH para un evento",
    details: {
      equipment: ["WING", "DL32"],
      schedule: "20:00"
    },
    ...overrides
  };
}

test("server IDs are generated from secure UUID-shaped values and remain opaque", () => {
  const randomUUID = () => UUID;
  const requestId = createAssistantRequestId({ randomUUID });
  const sessionId = createAssistantSessionId({ randomUUID });

  assert.equal(requestId, "req_123e4567e89b12d3a456426614174000");
  assert.equal(sessionId, SESSION_ID);
  assert.equal(isAssistantRequestId(requestId), true);
  assert.equal(isAssistantSessionId(sessionId), true);
  assert.equal(isAssistantRequestId("req_client_selected"), false);
  assert.equal(isAssistantSessionId("asst_client_selected"), false);
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.requestIdClientControlled, false);
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.sessionIdClientCreated, false);
});

test("invalid UUID generator output fails closed", () => {
  assert.throws(
    () => createAssistantSessionId({ randomUUID: () => "not-a-uuid" }),
    /invalid UUID/
  );
});

test("identical lead-create effect produces the same SHA-256 key", async () => {
  const first = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent(),
    lead: lead()
  });

  const reordered = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: {
      authorizationMethod: "assistant_explicit_confirmation",
      grantedAt: "2026-09-01T23:30:00.000Z",
      granted: true,
      source: "assistant",
      privacyPolicyVersion: "2026-08-19"
    },
    lead: {
      details: {
        schedule: "20:00",
        equipment: ["WING", "DL32"]
      },
      summary: "Necesita FOH para un evento",
      project: {
        venue: "Venue QA",
        city: "Bogotá",
        date: "2026-10-10"
      },
      contact: {
        preferredChannel: "whatsapp",
        whatsapp: "+57 300 000 0000",
        email: "client@example.com"
      },
      name: "Cliente Privado",
      market: "colombia",
      language: "es",
      serviceCategory: "live",
      status: "new",
      source: "assistant"
    }
  });

  assert.equal(first, reordered);
  assert.equal(isAssistantLeadCreateIdempotencyKey(first), true);
});

test("duplicate explicit authorization times for the same session and lead deduplicate", async () => {
  const first = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent({ grantedAt: "2026-09-01T23:30:00.000Z" }),
    lead: lead()
  });
  const doubleTap = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent({ grantedAt: "2026-09-01T23:30:04.000Z" }),
    lead: lead()
  });

  assert.equal(first, doubleTap);
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.consentGrantedAtAffectsLeadCreateKey, false);
});

test("idempotency key contains no raw lead PII", async () => {
  const key = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent(),
    lead: lead()
  });

  for (const forbidden of [
    "Cliente Privado",
    "client@example.com",
    "+57 300 000 0000",
    "Bogotá",
    "Venue QA",
    "Necesita FOH"
  ]) {
    assert.equal(key.includes(forbidden), false, forbidden);
  }
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.rawPiiInIdempotencyKey, false);
});

test("meaningful operation changes create a different lead-create key", async () => {
  const base = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent(),
    lead: lead()
  });

  const variants = [
    {
      sessionId: "asst_abcdefabcdefabcdefabcdefabcdefab",
      consentEvidence: consent(),
      lead: lead()
    },
    {
      sessionId: SESSION_ID,
      consentEvidence: consent({ privacyPolicyVersion: "2026-09-01" }),
      lead: lead()
    },
    {
      sessionId: SESSION_ID,
      consentEvidence: consent(),
      lead: lead({ summary: "Necesita monitores" })
    },
    {
      sessionId: SESSION_ID,
      consentEvidence: consent(),
      lead: lead({
        contact: {
          email: "different@example.com",
          preferredChannel: "email"
        }
      })
    }
  ];

  for (const variant of variants) {
    const key = await buildAssistantLeadCreateIdempotencyKey(variant);
    assert.notEqual(key, base);
  }
});

test("client source/status cannot alter Assistant create identity", async () => {
  const base = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent(),
    lead: lead()
  });
  const attempted = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: SESSION_ID,
    consentEvidence: consent(),
    lead: lead({ source: "contact", status: "confirmed" })
  });
  assert.equal(attempted, base);
});

test("invalid session or consent fingerprint input fails closed", async () => {
  await assert.rejects(
    buildAssistantLeadCreateIdempotencyKey({
      sessionId: "asst_client_chosen",
      consentEvidence: consent(),
      lead: lead()
    }),
    /server-issued Assistant sessionId/
  );

  await assert.rejects(
    buildAssistantLeadCreateIdempotencyKey({
      sessionId: SESSION_ID,
      consentEvidence: consent({ source: "contact" }),
      lead: lead()
    }),
    /granted Assistant consent evidence/
  );

  await assert.rejects(
    buildAssistantLeadCreateIdempotencyKey({
      sessionId: SESSION_ID,
      consentEvidence: consent({ privacyPolicyVersion: "" }),
      lead: lead()
    }),
    /consent evidence is incomplete/
  );

  await assert.rejects(
    buildAssistantLeadCreateIdempotencyKey({
      sessionId: SESSION_ID,
      consentEvidence: consent({ grantedAt: "not-a-date" }),
      lead: lead()
    }),
    /consent evidence is incomplete/
  );
});

test("notification idempotency remains lead-id based and matches prepared transport", () => {
  assert.equal(assistantNotificationIdempotencyKey(42), "assistant-lead-42");
  assert.throws(
    () => assistantNotificationIdempotencyKey(0),
    /valid leadId/
  );
});

test("contract states that database reservation, not hashing alone, enforces deduplication", () => {
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.leadCreateRequiresEnforcedUniqueKey, true);
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.keyAloneDoesNotProvideDeduplication, true);
  assert.equal(ASSISTANT_IDEMPOTENCY_POLICY.persistenceImplementation, "assistant_effect_reservations");
});
