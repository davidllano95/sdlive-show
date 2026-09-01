export const ASSISTANT_PRIVACY_POLICY_VERSION = "2026-08-19";
export const ASSISTANT_PRIVACY_POLICY_URL = "/privacy";
export const ASSISTANT_CONSENT_SOURCE = "assistant";
export const ASSISTANT_CONSENT_METHOD = "assistant_explicit_confirmation";
export const ASSISTANT_CONSENT_TTL_MS = 10 * 60 * 1000;

const COPY = Object.freeze({
  es: Object.freeze({
    title: "Autorización de datos",
    body: "Para enviar esta solicitud, autorizo a Samuel David Llano / SD.Live a recolectar, almacenar y usar los datos que proporcioné para responder mi solicitud, preparar cotizaciones y gestionar la relación comercial o contractual relacionada.",
    rights: "Puedo consultar, actualizar, rectificar, suprimir mis datos o revocar la autorización escribiendo a hello@sdlive.show.",
    policy: "Ver Política de Tratamiento de Datos Personales",
    authorize: "Autorizar y enviar",
    cancel: "Cancelar"
  }),
  en: Object.freeze({
    title: "Data authorization",
    body: "To send this request, I authorize Samuel David Llano / SD.Live to collect, store and use the data I provided to respond to my request, prepare quotes and manage the related commercial or contractual relationship.",
    rights: "I may access, update, correct or delete my data, or revoke this authorization, by writing to hello@sdlive.show.",
    policy: "View Privacy & Data Processing Policy",
    authorize: "Authorize & send",
    cancel: "Cancel"
  })
});

function safeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "es" ? "es" : "en";
}

function dateValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid consent timestamp");
  return date;
}

export function assistantConsentPrompt(language = "en") {
  const lang = safeLanguage(language);
  return {
    version: "assistant-consent-prompt-v1",
    language: lang,
    policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    policyUrl: ASSISTANT_PRIVACY_POLICY_URL,
    copy: { ...COPY[lang] },
    confirmation: {
      type: "explicit_product_action",
      authorizeAction: "authorize",
      cancelAction: "cancel",
      modelMaySelfAuthorize: false
    }
  };
}

export function buildAssistantConsentEvidence({
  action,
  policyVersion,
  language = "en"
} = {}, {
  now = new Date()
} = {}) {
  if (String(action || "").trim().toLowerCase() !== "authorize") {
    return { ok: false, error: "explicit_authorization_required" };
  }

  if (String(policyVersion || "").trim() !== ASSISTANT_PRIVACY_POLICY_VERSION) {
    return { ok: false, error: "privacy_policy_version_mismatch" };
  }

  const grantedAt = dateValue(now);
  return {
    ok: true,
    evidence: {
      source: ASSISTANT_CONSENT_SOURCE,
      granted: true,
      language: safeLanguage(language),
      privacyPolicyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
      authorizationMethod: ASSISTANT_CONSENT_METHOD,
      grantedAt: grantedAt.toISOString()
    }
  };
}

export function isFreshAssistantConsentEvidence(evidence, now = new Date()) {
  if (!evidence || typeof evidence !== "object") return false;
  if (evidence.source !== ASSISTANT_CONSENT_SOURCE) return false;
  if (evidence.granted !== true) return false;
  if (evidence.privacyPolicyVersion !== ASSISTANT_PRIVACY_POLICY_VERSION) return false;
  if (evidence.authorizationMethod !== ASSISTANT_CONSENT_METHOD) return false;

  let grantedAt;
  let current;
  try {
    grantedAt = dateValue(evidence.grantedAt);
    current = dateValue(now);
  } catch {
    return false;
  }

  const age = current.getTime() - grantedAt.getTime();
  return age >= 0 && age <= ASSISTANT_CONSENT_TTL_MS;
}

export function assistantConsentStorageRecord(evidence, leadId, now = new Date()) {
  if (!isFreshAssistantConsentEvidence(evidence, now)) {
    throw new Error("Fresh Assistant consent evidence is required");
  }

  const id = Number(leadId);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("A valid leadId is required for consent storage");
  }

  return {
    leadId: id,
    source: ASSISTANT_CONSENT_SOURCE,
    privacyPolicyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    authorizationMethod: ASSISTANT_CONSENT_METHOD,
    privacyConsentAt: evidence.grantedAt
  };
}
