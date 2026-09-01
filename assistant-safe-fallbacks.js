export const ASSISTANT_FALLBACK_VERSION = "assistant-safe-fallbacks-v1";

export const ASSISTANT_FALLBACK_CODES = Object.freeze([
  "request_invalid",
  "turnstile_failed",
  "rate_limited",
  "provider_unavailable",
  "provider_invalid_output",
  "availability_unknown",
  "rental_unresolved",
  "consent_required",
  "consent_expired",
  "lead_storage_incompatible",
  "lead_create_failed",
  "notification_failed",
  "internal_error"
]);

const FALLBACKS = Object.freeze({
  request_invalid: Object.freeze({
    httpStatus: 400,
    retryable: false,
    nextAction: "reply",
    en: "I couldn't process that request. Please check the information and try again.",
    es: "No pude procesar esa solicitud. Revisa la información e inténtalo de nuevo."
  }),
  turnstile_failed: Object.freeze({
    httpStatus: 400,
    retryable: true,
    nextAction: "reply",
    en: "I couldn't verify this request. Please try again.",
    es: "No pude verificar esta solicitud. Inténtalo de nuevo."
  }),
  rate_limited: Object.freeze({
    httpStatus: 429,
    retryable: true,
    nextAction: "reply",
    en: "There have been too many requests in a short time. Please wait a moment and try again.",
    es: "Ha habido demasiadas solicitudes en poco tiempo. Espera un momento e inténtalo de nuevo."
  }),
  provider_unavailable: Object.freeze({
    httpStatus: 503,
    retryable: true,
    nextAction: "reply",
    en: "The SD.Live Assistant is temporarily unavailable. I haven't submitted or confirmed anything from this message. Please try again shortly.",
    es: "SD.Live Assistant no está disponible temporalmente. No se ha enviado ni confirmado nada a partir de este mensaje. Inténtalo de nuevo en unos minutos."
  }),
  provider_invalid_output: Object.freeze({
    httpStatus: 503,
    retryable: true,
    nextAction: "reply",
    en: "I couldn't complete that response safely, so I haven't taken any action. Please try again.",
    es: "No pude completar esa respuesta de forma segura, así que no he realizado ninguna acción. Inténtalo de nuevo."
  }),
  availability_unknown: Object.freeze({
    httpStatus: 200,
    retryable: false,
    nextAction: "reply",
    en: "I can't confirm current human availability right now. I can still collect the project details for follow-up, but I won't promise availability.",
    es: "No puedo confirmar la disponibilidad actual en este momento. Puedo recopilar los datos del proyecto para seguimiento, pero no voy a prometer disponibilidad."
  }),
  rental_unresolved: Object.freeze({
    httpStatus: 200,
    retryable: false,
    nextAction: "reply",
    en: "I couldn't match one or more requested rental items to the current catalog. Please specify the item or model; I won't substitute another product automatically.",
    es: "No pude relacionar uno o más equipos solicitados con el catálogo actual. Especifica el equipo o modelo; no voy a sustituirlo automáticamente por otro producto."
  }),
  consent_required: Object.freeze({
    httpStatus: 200,
    retryable: false,
    nextAction: "request_consent",
    en: "Before I save or hand off your request, please confirm the data authorization shown in the privacy prompt.",
    es: "Antes de guardar o entregar tu solicitud, confirma la autorización de datos que aparece en el aviso de privacidad."
  }),
  consent_expired: Object.freeze({
    httpStatus: 409,
    retryable: true,
    nextAction: "request_consent",
    en: "The previous data authorization has expired. Please confirm it again before I save or hand off the request.",
    es: "La autorización de datos anterior venció. Confírmala nuevamente antes de que guarde o entregue la solicitud."
  }),
  lead_storage_incompatible: Object.freeze({
    httpStatus: 503,
    retryable: true,
    nextAction: "reply",
    en: "I couldn't save your request safely, so I won't tell you it was submitted. Please try again later or use the site's contact options.",
    es: "No pude guardar tu solicitud de forma segura, así que no voy a decirte que fue enviada. Inténtalo más tarde o usa las opciones de contacto del sitio."
  }),
  lead_create_failed: Object.freeze({
    httpStatus: 503,
    retryable: true,
    nextAction: "reply",
    en: "I couldn't save your request, so it has not been confirmed as submitted. Please try again later or use the site's contact options.",
    es: "No pude guardar tu solicitud, así que no está confirmada como enviada. Inténtalo más tarde o usa las opciones de contacto del sitio."
  }),
  notification_failed: Object.freeze({
    httpStatus: 202,
    retryable: false,
    nextAction: "handoff",
    en: "Your request was saved successfully. It is available for SD.Live follow-up.",
    es: "Tu solicitud fue guardada correctamente. Está disponible para seguimiento por parte de SD.Live."
  }),
  internal_error: Object.freeze({
    httpStatus: 503,
    retryable: true,
    nextAction: "reply",
    en: "Something went wrong and I haven't confirmed any new action. Please try again shortly.",
    es: "Ocurrió un problema y no he confirmado ninguna acción nueva. Inténtalo de nuevo en unos minutos."
  })
});

const CODE_SET = new Set(ASSISTANT_FALLBACK_CODES);

function safeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "es" ? "es" : "en";
}

function normalizedCode(value) {
  const code = String(value || "").trim().toLowerCase();
  return CODE_SET.has(code) ? code : "internal_error";
}

export function assistantFallback(code, language = "en", context = {}) {
  let safeCode = normalizedCode(code);
  const state = context && typeof context === "object" && !Array.isArray(context)
    ? context
    : {};

  // Notification failure is only safe to describe as a received request when
  // the Lead Core write has already succeeded. Otherwise fail closed.
  if (safeCode === "notification_failed" && state.leadPersisted !== true) {
    safeCode = "lead_create_failed";
  }

  const definition = FALLBACKS[safeCode];
  const lang = safeLanguage(language);

  return {
    version: ASSISTANT_FALLBACK_VERSION,
    code: safeCode,
    language: lang,
    httpStatus: definition.httpStatus,
    retryable: definition.retryable,
    nextAction: definition.nextAction,
    reply: definition[lang],
    leadCaptured: safeCode === "notification_failed" && state.leadPersisted === true,
    mayClaimAvailability: false,
    mayClaimRentalAvailability: false,
    mayQuotePrice: false,
    actionWasTaken: safeCode === "notification_failed" && state.leadPersisted === true
  };
}

export function assistantFallbackFromError(error, language = "en", context = {}) {
  const code = String(error?.code || "").trim().toUpperCase();
  const map = {
    LEAD_STORAGE_INCOMPATIBLE: "lead_storage_incompatible",
    ASSISTANT_NOTIFICATION_NOT_CONFIGURED: "notification_failed",
    PROVIDER_UNAVAILABLE: "provider_unavailable",
    PROVIDER_INVALID_OUTPUT: "provider_invalid_output",
    CONSENT_REQUIRED: "consent_required",
    CONSENT_EXPIRED: "consent_expired",
    RATE_LIMITED: "rate_limited",
    TURNSTILE_FAILED: "turnstile_failed",
    RENTAL_UNRESOLVED: "rental_unresolved",
    AVAILABILITY_UNKNOWN: "availability_unknown",
    LEAD_CREATE_FAILED: "lead_create_failed"
  };

  return assistantFallback(map[code] || "internal_error", language, context);
}
