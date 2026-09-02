import { normalizeLeadCoreInput } from "./lead-core.js";

export const ASSISTANT_IDEMPOTENCY_VERSION = "assistant-idempotency-v2";

export const ASSISTANT_IDEMPOTENCY_POLICY = Object.freeze({
  requestIdClientControlled: false,
  sessionIdClientCreated: false,
  rawPiiInIdempotencyKey: false,
  leadCreateRequiresEnforcedUniqueKey: true,
  notificationUsesLeadId: true,
  persistenceImplementation: "assistant_effect_reservations",
  keyAloneDoesNotProvideDeduplication: true,
  consentGrantedAtAffectsLeadCreateKey: false
});

function cleanString(value, maxLength = 5000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function compactUuid(value) {
  const text = cleanString(value, 80).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text)) {
    throw new Error("Server UUID generator returned an invalid UUID");
  }
  return text.replaceAll("-", "");
}

function randomUuid(randomUUID) {
  if (typeof randomUUID === "function") return randomUUID();
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  throw new Error("Secure server UUID generator is unavailable");
}

export function createAssistantRequestId({ randomUUID } = {}) {
  return `req_${compactUuid(randomUuid(randomUUID))}`;
}

export function createAssistantSessionId({ randomUUID } = {}) {
  return `asst_${compactUuid(randomUuid(randomUUID))}`;
}

export function isAssistantRequestId(value) {
  return /^req_[a-f0-9]{32}$/.test(cleanString(value, 80));
}

export function isAssistantSessionId(value) {
  return /^asst_[a-f0-9]{32}$/.test(cleanString(value, 80));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (child === undefined) continue;
    output[key] = stableValue(child);
  }
  return output;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function validIsoInstant(value) {
  const text = cleanString(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function consentFingerprint(evidence) {
  const source = evidence && typeof evidence === "object" && !Array.isArray(evidence)
    ? evidence
    : {};

  if (source.source !== "assistant" || source.granted !== true) {
    throw new Error("Assistant idempotency requires granted Assistant consent evidence");
  }

  const privacyPolicyVersion = cleanString(source.privacyPolicyVersion, 80);
  const authorizationMethod = cleanString(source.authorizationMethod, 120);
  const grantedAt = validIsoInstant(source.grantedAt);

  if (!privacyPolicyVersion || !authorizationMethod || !grantedAt) {
    throw new Error("Assistant consent evidence is incomplete for idempotency");
  }

  // grantedAt is intentionally validated but excluded from the operation
  // identity. Two explicit authorization clicks for the same session, policy
  // and normalized lead are retries of one irreversible Lead create effect,
  // not two separate leads. The exact timestamp is still persisted as legal
  // consent evidence and remains subject to the freshness TTL.
  return {
    source: "assistant",
    privacyPolicyVersion,
    authorizationMethod
  };
}

function normalizedAssistantLead(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};

  const lead = normalizeLeadCoreInput({
    ...source,
    source: "assistant",
    status: "new"
  });

  if (lead.source !== "assistant" || lead.status !== "new") {
    throw new Error("Assistant lead idempotency requires a new Assistant lead");
  }

  return lead;
}

async function sha256Hex(value, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.digest !== "function") {
    throw new Error("SHA-256 is unavailable");
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Builds a non-reversible key for the irreversible Lead Core create effect.
 * This does not itself reserve/store the key. Runtime integration must enforce
 * uniqueness transactionally before or together with lead creation.
 */
export async function buildAssistantLeadCreateIdempotencyKey({
  sessionId,
  consentEvidence,
  lead
}, {
  subtle = globalThis.crypto?.subtle
} = {}) {
  const safeSessionId = cleanString(sessionId, 80);
  if (!isAssistantSessionId(safeSessionId)) {
    throw new Error("A server-issued Assistant sessionId is required");
  }

  const canonical = {
    version: ASSISTANT_IDEMPOTENCY_VERSION,
    operation: "lead_create",
    sessionId: safeSessionId,
    consent: consentFingerprint(consentEvidence),
    lead: normalizedAssistantLead(lead)
  };

  const digest = await sha256Hex(stableJson(canonical), subtle);
  return `assistant-lead-v1-${digest}`;
}

export function isAssistantLeadCreateIdempotencyKey(value) {
  return /^assistant-lead-v1-[a-f0-9]{64}$/.test(cleanString(value, 120));
}

export function assistantNotificationIdempotencyKey(leadId) {
  const id = Number(leadId);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("A valid leadId is required for notification idempotency");
  }
  return `assistant-lead-${id}`;
}
