import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_SESSION_DEFAULT_TTL_MS,
  assistantSealedSessionPolicy,
  sealAssistantSessionEnvelope,
  unsealAssistantSessionEnvelope
} from "../assistant-sealed-session.js";

const KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const OTHER_KEY = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

function state(overrides = {}) {
  return {
    version: "assistant-session-v1",
    sessionId: `asst_${"a".repeat(32)}`,
    storagePolicy: {
      persistence: "none",
      transcriptStored: false
    },
    turnCount: 2,
    createdAt: "2026-09-01T23:00:00.000Z",
    updatedAt: "2026-09-01T23:05:00.000Z",
    consent: {
      granted: false,
      policyVersion: null,
      grantedAt: null
    },
    slots: {
      serviceCategory: "theatre",
      language: "es",
      market: "CO",
      name: "Ana Cliente",
      contact: {
        email: "ana@example.com",
        phone: null,
        whatsapp: null,
        other: null,
        preferredChannel: "email"
      },
      project: {
        date: "2026-10-15",
        city: "Bogotá",
        venue: "Teatro"
      },
      equipment: ["QLab"],
      schedule: "Ensayo 14 de octubre",
      summary: "Diseño sonoro para obra"
    },
    ...overrides
  };
}

const consentEvidence = {
  source: "assistant",
  granted: true,
  language: "es",
  privacyPolicyVersion: "2026-08-19",
  authorizationMethod: "assistant_explicit_confirmation",
  grantedAt: "2026-09-01T23:05:00.000Z"
};

test("sealed session policy is stateless, encrypted and server-authenticated", () => {
  assert.deepEqual(assistantSealedSessionPolicy(), {
    persistence: "none",
    cipher: "AES-GCM-256",
    tokenVersion: "ast1",
    keyBinding: "ASSISTANT_SESSION_KEY",
    defaultTtlMs: 1800000,
    maxTtlMs: 7200000,
    transcriptStored: false,
    browserMayModifyState: false,
    browserMayReadPlaintextState: false,
    serverAuthenticatesToken: true,
    consentEvidenceMayBeSealed: true
  });
});

test("state and consent evidence round-trip through an opaque encrypted token", async () => {
  const token = await sealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    { state: state(), consentEvidence },
    { now: "2026-09-01T23:10:00.000Z" }
  );

  assert.match(token, /^ast1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(token.includes("Ana Cliente"), false);
  assert.equal(token.includes("ana@example.com"), false);
  assert.equal(token.includes("Bogotá"), false);

  const opened = await unsealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    token,
    { now: "2026-09-01T23:20:00.000Z" }
  );

  assert.deepEqual(opened.state, state());
  assert.deepEqual(opened.consentEvidence, consentEvidence);
  assert.equal(opened.issuedAt, "2026-09-01T23:10:00.000Z");
  assert.equal(opened.expiresAt, "2026-09-01T23:40:00.000Z");
});

test("new IV produces a different token for the same state", async () => {
  const first = await sealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    { state: state() },
    { now: "2026-09-01T23:10:00.000Z" }
  );
  const second = await sealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    { state: state() },
    { now: "2026-09-01T23:10:00.000Z" }
  );
  assert.notEqual(first, second);
});

test("tampering with ciphertext fails authentication", async () => {
  const token = await sealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    { state: state() },
    { now: "2026-09-01T23:10:00.000Z" }
  );
  const parts = token.split(".");
  const last = parts[2];
  parts[2] = `${last.slice(0, -1)}${last.endsWith("A") ? "B" : "A"}`;

  await assert.rejects(
    () => unsealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: KEY },
      parts.join("."),
      { now: "2026-09-01T23:20:00.000Z" }
    ),
    (error) => error?.code === "SESSION_TOKEN_INVALID"
  );
});

test("wrong server key cannot decrypt a token", async () => {
  const token = await sealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    { state: state() },
    { now: "2026-09-01T23:10:00.000Z" }
  );

  await assert.rejects(
    () => unsealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: OTHER_KEY },
      token,
      { now: "2026-09-01T23:20:00.000Z" }
    ),
    (error) => error?.code === "SESSION_TOKEN_INVALID"
  );
});

test("expired token fails closed", async () => {
  const token = await sealAssistantSessionEnvelope(
    { ASSISTANT_SESSION_KEY: KEY },
    { state: state() },
    { now: "2026-09-01T23:10:00.000Z", ttlMs: ASSISTANT_SESSION_DEFAULT_TTL_MS }
  );

  await assert.rejects(
    () => unsealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: KEY },
      token,
      { now: "2026-09-01T23:40:00.000Z" }
    ),
    (error) => error?.code === "SESSION_TOKEN_EXPIRED"
  );
});

test("state containing transcript or prompt-like storage is rejected before encryption", async () => {
  for (const bad of [
    { transcript: ["hello"] },
    { prompt: "secret" },
    { modelOutput: { reply: "hello" } }
  ]) {
    await assert.rejects(
      () => sealAssistantSessionEnvelope(
        { ASSISTANT_SESSION_KEY: KEY },
        { state: state(bad) }
      ),
      (error) => error?.code === "SESSION_STATE_INVALID"
    );
  }
});

test("unknown session state and slot keys are rejected", async () => {
  await assert.rejects(
    () => sealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: KEY },
      { state: state({ internalDebug: true }) }
    ),
    (error) => error?.code === "SESSION_STATE_INVALID"
  );

  const badSlots = state();
  badSlots.slots = { ...badSlots.slots, financeStatus: "paid" };
  await assert.rejects(
    () => sealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: KEY },
      { state: badSlots }
    ),
    (error) => error?.code === "SESSION_STATE_INVALID"
  );
});

test("session id must be server-shaped", async () => {
  await assert.rejects(
    () => sealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: KEY },
      { state: state({ sessionId: "client-selected" }) }
    ),
    (error) => error?.code === "SESSION_STATE_INVALID"
  );
});

test("missing or malformed encryption key fails closed", async () => {
  await assert.rejects(
    () => sealAssistantSessionEnvelope({}, { state: state() }),
    (error) => error?.code === "SESSION_KEY_NOT_CONFIGURED"
  );
  await assert.rejects(
    () => sealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: "short" },
      { state: state() }
    ),
    (error) => error?.code === "SESSION_KEY_NOT_CONFIGURED"
  );
});

test("TTL is bounded and cannot create long-lived session cookies by accident", async () => {
  await assert.rejects(
    () => sealAssistantSessionEnvelope(
      { ASSISTANT_SESSION_KEY: KEY },
      { state: state() },
      { ttlMs: 24 * 60 * 60 * 1000 }
    ),
    (error) => error?.code === "SESSION_TOKEN_INVALID"
  );
});
