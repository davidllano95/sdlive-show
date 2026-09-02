import { LEAD_CORE_SERVICE_CATEGORIES } from "./lead-core.js";

export const ASSISTANT_LOGGING_VERSION = "assistant-safe-logging-v1";

export const ASSISTANT_LOG_EVENTS = Object.freeze([
  "request_received",
  "request_rejected",
  "turnstile_failed",
  "rate_limited",
  "model_started",
  "model_completed",
  "model_failed",
  "availability_checked",
  "rental_query_resolved",
  "consent_prompted",
  "consent_granted",
  "lead_created",
  "lead_create_failed",
  "notification_sent",
  "notification_failed",
  "handoff_completed",
  "response_sent"
]);

export const ASSISTANT_LOGGING_POLICY = Object.freeze({
  rawUserMessage: false,
  rawAssistantReply: false,
  transcript: false,
  name: false,
  email: false,
  phone: false,
  whatsapp: false,
  turnstileToken: false,
  sessionId: false,
  prompt: false,
  toolPayload: false,
  modelOutput: false,
  providerResponseBody: false,
  stackTrace: false,
  secrets: false
});

const EVENT_SET = new Set(ASSISTANT_LOG_EVENTS);
const SERVICE_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);
const NEXT_ACTION_SET = new Set([
  "reply",
  "check_availability",
  "check_rental",
  "request_consent",
  "capture_lead",
  "handoff"
]);
const OUTCOME_SET = new Set(["ok", "rejected", "failed", "unknown"]);
const SAFE_INPUT_KEYS = new Set([
  "requestId",
  "leadId",
  "language",
  "serviceCategory",
  "nextAction",
  "outcome",
  "errorCode",
  "httpStatus",
  "latencyMs",
  "turnCount",
  "availabilityKnown",
  "rentalReady",
  "notificationAttempted",
  "notificationSent"
]);

function cleanString(value, maxLength = 120) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function safeSlug(value, maxLength = 120) {
  const text = cleanString(value, maxLength).toLowerCase();
  return /^[a-z0-9][a-z0-9_.:-]*$/.test(text) ? text : null;
}

function safeRequestId(value) {
  const text = cleanString(value, 160);
  return /^req_[A-Za-z0-9_-]{12,140}$/.test(text) ? text : null;
}

function safeInteger(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max
    ? number
    : null;
}

function isoTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid Assistant log timestamp");
  return date.toISOString();
}

function maybeSet(target, key, value) {
  if (value !== null && value !== undefined) target[key] = value;
}

export function assistantSafeErrorCode(error, fallback = "assistant_error") {
  const direct = safeSlug(error?.code, 120);
  if (direct) return direct;
  const safeFallback = safeSlug(fallback, 120);
  return safeFallback || "assistant_error";
}

export function buildAssistantSafeLogEntry(event, data = {}, { now = new Date() } = {}) {
  const eventName = cleanString(event, 80).toLowerCase();
  if (!EVENT_SET.has(eventName)) {
    throw new Error("Assistant log event is not allowed");
  }

  const source = data && typeof data === "object" && !Array.isArray(data)
    ? data
    : {};
  const entry = {
    version: ASSISTANT_LOGGING_VERSION,
    event: eventName,
    timestamp: isoTimestamp(now)
  };

  const requestId = safeRequestId(source.requestId);
  const leadId = safeInteger(source.leadId, 1, Number.MAX_SAFE_INTEGER);
  const language = cleanString(source.language, 8).toLowerCase();
  const serviceCategory = cleanString(source.serviceCategory, 80).toLowerCase();
  const nextAction = cleanString(source.nextAction, 80).toLowerCase();
  const outcome = cleanString(source.outcome, 20).toLowerCase();
  const errorCode = safeSlug(source.errorCode, 120);
  const httpStatus = safeInteger(source.httpStatus, 100, 599);
  const latencyMs = safeInteger(source.latencyMs, 0, 300000);
  const turnCount = safeInteger(source.turnCount, 0, 60);

  maybeSet(entry, "requestId", requestId);
  maybeSet(entry, "leadId", leadId);
  if (language === "en" || language === "es") entry.language = language;
  if (SERVICE_SET.has(serviceCategory)) entry.serviceCategory = serviceCategory;
  if (NEXT_ACTION_SET.has(nextAction)) entry.nextAction = nextAction;
  if (OUTCOME_SET.has(outcome)) entry.outcome = outcome;
  maybeSet(entry, "errorCode", errorCode);
  maybeSet(entry, "httpStatus", httpStatus);
  maybeSet(entry, "latencyMs", latencyMs);
  maybeSet(entry, "turnCount", turnCount);

  for (const key of [
    "availabilityKnown",
    "rentalReady",
    "notificationAttempted",
    "notificationSent"
  ]) {
    if (typeof source[key] === "boolean") entry[key] = source[key];
  }

  const droppedFieldCount = Object.keys(source)
    .filter((key) => !SAFE_INPUT_KEYS.has(key))
    .length;
  if (droppedFieldCount > 0) {
    entry.redacted = true;
    entry.droppedFieldCount = droppedFieldCount;
  }

  return entry;
}

export function logAssistantSafeEvent(
  logger,
  event,
  data = {},
  options = {}
) {
  const entry = buildAssistantSafeLogEntry(event, data, options);
  const sink = logger && typeof logger.info === "function" ? logger : console;
  sink.info("[SD.Live Assistant]", JSON.stringify(entry));
  return entry;
}
