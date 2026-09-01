export const ASSISTANT_SESSION_TOKEN_VERSION = "ast1";
export const ASSISTANT_SESSION_ENVELOPE_VERSION = "assistant-sealed-session-v1";
export const ASSISTANT_SESSION_DEFAULT_TTL_MS = 30 * 60 * 1000;
export const ASSISTANT_SESSION_MAX_TTL_MS = 2 * 60 * 60 * 1000;

const AAD = new TextEncoder().encode("sdlive.show:assistant-session:v1");
const SESSION_ID_RE = /^asst_[a-f0-9]{32}$/;
const STATE_KEYS = new Set([
  "version",
  "sessionId",
  "storagePolicy",
  "turnCount",
  "createdAt",
  "updatedAt",
  "consent",
  "slots"
]);
const SLOT_KEYS = new Set([
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
const CONSENT_EVIDENCE_KEYS = new Set([
  "source",
  "granted",
  "language",
  "privacyPolicyVersion",
  "authorizationMethod",
  "grantedAt"
]);
const FORBIDDEN_SESSION_KEYS = new Set([
  "transcript",
  "messages",
  "rawusermessage",
  "rawassistantmessage",
  "lastmessage",
  "prompt",
  "systemprompt",
  "modeloutput",
  "providerresponse"
]);

function sessionError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value, allowed, label) {
  if (!plainObject(value)) throw sessionError("SESSION_STATE_INVALID", `${label} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw sessionError("SESSION_STATE_INVALID", `${label} field is not allowed: ${key}`);
    }
  }
}

function findForbiddenKey(value, depth = 0) {
  if (depth > 7 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findForbiddenKey(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!plainObject(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    const normalized = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_SESSION_KEYS.has(normalized)) return key;
    const found = findForbiddenKey(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function validDate(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw sessionError("SESSION_TOKEN_INVALID", `${label} is invalid`);
  return date;
}

function validateSessionState(state) {
  assertKeys(state, STATE_KEYS, "session state");
  if (state.version !== "assistant-session-v1") {
    throw sessionError("SESSION_STATE_INVALID", "Unsupported Assistant session state version");
  }
  if (!SESSION_ID_RE.test(String(state.sessionId || ""))) {
    throw sessionError("SESSION_STATE_INVALID", "Assistant sessionId is not server-shaped");
  }
  const turns = Number(state.turnCount);
  if (!Number.isInteger(turns) || turns < 0 || turns > 60) {
    throw sessionError("SESSION_STATE_INVALID", "Assistant turn count is invalid");
  }
  if (!plainObject(state.slots)) {
    throw sessionError("SESSION_STATE_INVALID", "Assistant slots are required");
  }
  for (const key of Object.keys(state.slots)) {
    if (!SLOT_KEYS.has(key)) {
      throw sessionError("SESSION_STATE_INVALID", `Assistant slot is not allowed: ${key}`);
    }
  }
  const forbidden = findForbiddenKey(state);
  if (forbidden) {
    throw sessionError("SESSION_STATE_INVALID", `Forbidden session content: ${forbidden}`);
  }
  return state;
}

function validateConsentEvidence(value) {
  if (value === null || value === undefined) return null;
  assertKeys(value, CONSENT_EVIDENCE_KEYS, "consent evidence");
  if (value.source !== "assistant" || value.granted !== true) {
    throw sessionError("SESSION_STATE_INVALID", "Consent evidence is invalid");
  }
  if (!String(value.privacyPolicyVersion || "").trim()) {
    throw sessionError("SESSION_STATE_INVALID", "Consent policy version is required");
  }
  if (!String(value.authorizationMethod || "").trim()) {
    throw sessionError("SESSION_STATE_INVALID", "Consent authorization method is required");
  }
  validDate(value.grantedAt, "consent grantedAt");
  return value;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const text = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw sessionError("SESSION_TOKEN_INVALID", "Invalid base64url value");
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - text.length % 4) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw sessionError("SESSION_TOKEN_INVALID", "Invalid base64url value");
  }
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSessionKey(env, cryptoImpl) {
  const raw = String(env?.ASSISTANT_SESSION_KEY || "").trim();
  if (!raw) throw sessionError("SESSION_KEY_NOT_CONFIGURED", "ASSISTANT_SESSION_KEY is missing");

  let bytes;
  try {
    bytes = base64UrlToBytes(raw);
  } catch {
    throw sessionError("SESSION_KEY_NOT_CONFIGURED", "ASSISTANT_SESSION_KEY is invalid");
  }
  if (bytes.byteLength !== 32) {
    throw sessionError("SESSION_KEY_NOT_CONFIGURED", "ASSISTANT_SESSION_KEY must decode to 32 bytes");
  }
  return cryptoImpl.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function ttlValue(value) {
  const ttl = Number(value ?? ASSISTANT_SESSION_DEFAULT_TTL_MS);
  if (!Number.isInteger(ttl) || ttl < 5 * 60 * 1000 || ttl > ASSISTANT_SESSION_MAX_TTL_MS) {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session TTL is out of bounds");
  }
  return ttl;
}

export async function sealAssistantSessionEnvelope(
  env,
  { state, consentEvidence = null } = {},
  {
    now = new Date(),
    ttlMs = ASSISTANT_SESSION_DEFAULT_TTL_MS,
    cryptoImpl = globalThis.crypto
  } = {}
) {
  if (!cryptoImpl?.subtle || typeof cryptoImpl.getRandomValues !== "function") {
    throw sessionError("SESSION_KEY_NOT_CONFIGURED", "Web Crypto is unavailable");
  }

  validateSessionState(state);
  const consent = validateConsentEvidence(consentEvidence);
  const issued = validDate(now, "issuedAt");
  const ttl = ttlValue(ttlMs);
  const payload = {
    version: ASSISTANT_SESSION_ENVELOPE_VERSION,
    issuedAt: issued.toISOString(),
    expiresAt: new Date(issued.getTime() + ttl).toISOString(),
    state,
    consentEvidence: consent
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  if (plaintext.byteLength > 16_000) {
    throw sessionError("SESSION_STATE_INVALID", "Assistant session payload is too large");
  }

  const key = await importSessionKey(env, cryptoImpl);
  const iv = cryptoImpl.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await cryptoImpl.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: AAD,
    tagLength: 128
  }, key, plaintext));

  return `${ASSISTANT_SESSION_TOKEN_VERSION}.${bytesToBase64Url(iv)}.${bytesToBase64Url(ciphertext)}`;
}

export async function unsealAssistantSessionEnvelope(
  env,
  token,
  {
    now = new Date(),
    cryptoImpl = globalThis.crypto
  } = {}
) {
  if (!cryptoImpl?.subtle) throw sessionError("SESSION_KEY_NOT_CONFIGURED", "Web Crypto is unavailable");

  const text = String(token || "").trim();
  if (!text || text.length > 24_000) throw sessionError("SESSION_TOKEN_INVALID", "Assistant session token is invalid");
  const parts = text.split(".");
  if (parts.length !== 3 || parts[0] !== ASSISTANT_SESSION_TOKEN_VERSION) {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session token version is invalid");
  }

  const iv = base64UrlToBytes(parts[1]);
  const ciphertext = base64UrlToBytes(parts[2]);
  if (iv.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session token shape is invalid");
  }

  const key = await importSessionKey(env, cryptoImpl);
  let plaintext;
  try {
    plaintext = await cryptoImpl.subtle.decrypt({
      name: "AES-GCM",
      iv,
      additionalData: AAD,
      tagLength: 128
    }, key, ciphertext);
  } catch {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session token authentication failed");
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session payload is invalid");
  }

  if (!plainObject(payload) || payload.version !== ASSISTANT_SESSION_ENVELOPE_VERSION) {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session envelope version is invalid");
  }

  const current = validDate(now, "now");
  const issuedAt = validDate(payload.issuedAt, "issuedAt");
  const expiresAt = validDate(payload.expiresAt, "expiresAt");
  const lifetime = expiresAt.getTime() - issuedAt.getTime();
  if (lifetime < 5 * 60 * 1000 || lifetime > ASSISTANT_SESSION_MAX_TTL_MS) {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session token lifetime is invalid");
  }
  if (issuedAt.getTime() > current.getTime() + 60_000) {
    throw sessionError("SESSION_TOKEN_INVALID", "Assistant session token is from the future");
  }
  if (expiresAt.getTime() <= current.getTime()) {
    throw sessionError("SESSION_TOKEN_EXPIRED", "Assistant session token has expired");
  }

  validateSessionState(payload.state);
  const consentEvidence = validateConsentEvidence(payload.consentEvidence);

  return {
    version: payload.version,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    state: payload.state,
    consentEvidence
  };
}

export function assistantSealedSessionPolicy() {
  return Object.freeze({
    persistence: "none",
    cipher: "AES-GCM-256",
    tokenVersion: ASSISTANT_SESSION_TOKEN_VERSION,
    keyBinding: "ASSISTANT_SESSION_KEY",
    defaultTtlMs: ASSISTANT_SESSION_DEFAULT_TTL_MS,
    maxTtlMs: ASSISTANT_SESSION_MAX_TTL_MS,
    transcriptStored: false,
    browserMayModifyState: false,
    browserMayReadPlaintextState: false,
    serverAuthenticatesToken: true,
    consentEvidenceMayBeSealed: true
  });
}
