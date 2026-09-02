import {
  assistantConsentStorageRecord,
  isFreshAssistantConsentEvidence
} from "./assistant-consent-contract.js";
import {
  buildAssistantLeadCreateIdempotencyKey,
  isAssistantRequestId
} from "./assistant-idempotency.js";
import {
  failAssistantLeadCreate,
  inspectAssistantIdempotencyStorageCompatibility,
  reserveAssistantLeadCreate
} from "./assistant-idempotency-storage.js";
import { inspectLeadStorageCompatibility } from "./lead-core-create.js";
import { normalizeLeadCoreInput } from "./lead-core.js";
import { inspectPrivacyConsentStorageCompatibility } from "./privacy-consent-storage.js";

export const ASSISTANT_LEAD_CAPTURE_EFFECT_VERSION = "assistant-lead-capture-effect-v1";

const OPTIONAL_ATTRIBUTION_COLUMNS = Object.freeze([
  "source_url",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign"
]);

function captureError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function dbFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw captureError("LEAD_CAPTURE_STORAGE_NOT_CONFIGURED", "CMS_DB batch support is required");
  }
  return db;
}

function iso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid Assistant capture timestamp");
  return date.toISOString();
}

function pushBound(columns, placeholders, values, name, value) {
  columns.push(name);
  placeholders.push("?");
  values.push(value ?? null);
}

function prepareAssistantLeadInsert(db, lead, compatibility, updatedAt) {
  const available = new Set(compatibility?.columns || []);
  const columns = [];
  const placeholders = [];
  const values = [];

  pushBound(columns, placeholders, values, "type", "assistant");
  pushBound(columns, placeholders, values, "status", "new");
  pushBound(columns, placeholders, values, "name", lead.name);
  pushBound(columns, placeholders, values, "email", lead.contact.email);
  pushBound(columns, placeholders, values, "message", lead.summary);
  pushBound(columns, placeholders, values, "language", lead.language);
  pushBound(columns, placeholders, values, "market", lead.market);

  const attribution = {
    source_url: lead.attribution.sourceUrl,
    referrer: lead.attribution.referrer,
    utm_source: lead.attribution.utmSource,
    utm_medium: lead.attribution.utmMedium,
    utm_campaign: lead.attribution.utmCampaign
  };

  for (const name of OPTIONAL_ATTRIBUTION_COLUMNS) {
    if (available.has(name)) pushBound(columns, placeholders, values, name, attribution[name]);
  }

  pushBound(columns, placeholders, values, "source", "assistant");
  pushBound(columns, placeholders, values, "service_category", lead.serviceCategory);
  pushBound(columns, placeholders, values, "preferred_contact_channel", lead.contact.preferredChannel);
  pushBound(columns, placeholders, values, "contact_phone", lead.contact.phone);
  pushBound(columns, placeholders, values, "contact_whatsapp", lead.contact.whatsapp);
  pushBound(columns, placeholders, values, "contact_other", lead.contact.other);
  pushBound(columns, placeholders, values, "project_date", lead.project.date);
  pushBound(columns, placeholders, values, "project_city", lead.project.city);
  pushBound(columns, placeholders, values, "project_venue", lead.project.venue);
  pushBound(columns, placeholders, values, "details_json", JSON.stringify(lead.details));
  pushBound(columns, placeholders, values, "updated_at", updatedAt);

  return db.prepare(`
    INSERT INTO leads (
      ${columns.join(",\n      ")}
    ) VALUES (
      ${placeholders.join(", ")}
    )
  `).bind(...values);
}

function normalizedAssistantLead(leadDraft) {
  const lead = normalizeLeadCoreInput({
    ...leadDraft,
    source: "assistant",
    status: "new"
  });

  if (!lead.summary) {
    throw captureError("LEAD_DRAFT_INVALID", "Assistant Lead requires a summary");
  }
  if (![lead.contact.email, lead.contact.phone, lead.contact.whatsapp, lead.contact.other].some(Boolean)) {
    throw captureError("LEAD_DRAFT_INVALID", "Assistant Lead requires a contact channel");
  }
  return lead;
}

function assertLeadCompatibility(compatibility, lead) {
  if (!compatibility?.canInsert) {
    throw captureError(
      "LEAD_STORAGE_INCOMPATIBLE",
      `Assistant Lead storage is not compatible: ${compatibility?.reason || "unknown"}`
    );
  }
  if (compatibility.legacyEmailRequired && !lead.contact.email) {
    throw captureError(
      "LEAD_STORAGE_INCOMPATIBLE",
      "Legacy Lead storage still requires email"
    );
  }
}

function assertAuxiliaryStorage(privacy, idempotency) {
  if (!privacy?.canRecordAssistantConsent) {
    throw captureError(
      "PRIVACY_STORAGE_INCOMPATIBLE",
      `Assistant privacy storage is not compatible: ${privacy?.reason || "unknown"}`
    );
  }
  if (!idempotency?.ready) {
    throw captureError(
      "IDEMPOTENCY_STORAGE_NOT_READY",
      `Assistant idempotency storage is not ready: ${idempotency?.reason || "unknown"}`
    );
  }
}

export async function captureAssistantLeadEffect(
  env,
  {
    requestId,
    session,
    consentEvidence,
    leadDraft
  } = {},
  {
    now = new Date(),
    inspectCompatibility = inspectLeadStorageCompatibility,
    inspectConsentStorage = inspectPrivacyConsentStorageCompatibility,
    inspectIdempotencyStorage = inspectAssistantIdempotencyStorageCompatibility,
    ensureConsentSchema = null
  } = {}
) {
  if (!isAssistantRequestId(requestId)) {
    throw captureError("REQUEST_INVALID", "A server-issued Assistant requestId is required");
  }
  if (!session?.sessionId) {
    throw captureError("REQUEST_INVALID", "Assistant session state is required");
  }
  if (!isFreshAssistantConsentEvidence(consentEvidence, now)) {
    throw captureError("CONSENT_REQUIRED", "Fresh Assistant privacy consent is required");
  }

  const db = dbFromEnv(env);
  const lead = normalizedAssistantLead(leadDraft);
  const compatibility = await inspectCompatibility(env, "assistant");
  assertLeadCompatibility(compatibility, lead);

  // Legacy injected hook is retained only for existing migration/unit-test
  // callers. The production runtime never supplies it and therefore performs
  // strictly read-only schema checks here.
  const legacyPreparedMode = typeof ensureConsentSchema === "function";
  if (legacyPreparedMode) {
    await ensureConsentSchema(env);
  } else {
    const [privacy, idempotency] = await Promise.all([
      inspectConsentStorage(env),
      inspectIdempotencyStorage(env)
    ]);
    assertAuxiliaryStorage(privacy, idempotency);
  }

  const key = await buildAssistantLeadCreateIdempotencyKey({
    sessionId: session.sessionId,
    consentEvidence,
    lead
  });

  const reservation = await reserveAssistantLeadCreate(env, {
    key,
    requestId
  }, {
    now,
    ensureStorage: legacyPreparedMode ? undefined : null
  });

  if (reservation?.status === "completed" && reservation.leadId) {
    return {
      ok: true,
      leadId: reservation.leadId,
      deduplicated: true,
      idempotencyKey: key
    };
  }

  if (!reservation?.acquired) {
    throw captureError(
      "IDEMPOTENCY_IN_PROGRESS",
      "An equivalent Assistant Lead capture is already in progress"
    );
  }

  const timestamp = iso(now);
  const consent = assistantConsentStorageRecord(consentEvidence, 1, now);

  try {
    const results = await db.batch([
      prepareAssistantLeadInsert(db, lead, compatibility, timestamp),
      db.prepare(`
        UPDATE assistant_effect_reservations
        SET
          status = 'completed',
          lead_id = last_insert_rowid(),
          completed_at = ?,
          updated_at = ?,
          error_code = NULL
        WHERE idempotency_key = ?
          AND status = 'reserved'
          AND request_id = ?
      `).bind(timestamp, timestamp, key, requestId),
      db.prepare(`
        INSERT INTO privacy_consents (
          lead_id,
          source,
          privacy_consent_at,
          privacy_policy_version,
          authorization_method
        ) VALUES (
          (
            SELECT lead_id
            FROM assistant_effect_reservations
            WHERE idempotency_key = ?
              AND status = 'completed'
              AND request_id = ?
          ),
          'assistant',
          ?,
          ?,
          ?
        )
      `).bind(
        key,
        requestId,
        consentEvidence.grantedAt,
        consent.privacyPolicyVersion,
        consent.authorizationMethod
      )
    ]);

    const leadId = Number(results?.[0]?.meta?.last_row_id);
    const reservationUpdated = Number(results?.[1]?.meta?.changes) === 1;
    const consentWritten = Number(results?.[2]?.meta?.changes) === 1;

    if (!Number.isInteger(leadId) || leadId < 1 || !reservationUpdated || !consentWritten) {
      throw captureError("LEAD_CAPTURE_STATE_INVALID", "Assistant capture transaction returned invalid metadata");
    }

    return {
      ok: true,
      leadId,
      deduplicated: false,
      idempotencyKey: key
    };
  } catch (error) {
    try {
      await failAssistantLeadCreate(env, {
        key,
        requestId,
        errorCode: error?.code || "lead_capture_failed"
      }, {
        now,
        ensureStorage: legacyPreparedMode ? undefined : null
      });
    } catch {
      // Preserve the original capture failure. The reservation TTL provides a
      // bounded recovery path if even the failure marker cannot be persisted.
    }
    throw error;
  }
}

export function assistantLeadCapturePolicy() {
  return Object.freeze({
    leadSourceOfTruth: "leads",
    consentSourceOfTruth: "privacy_consents",
    idempotencyTable: "assistant_effect_reservations",
    atomicPiiAndConsentWrite: true,
    assistantSource: "assistant",
    initialStatus: "new",
    requiresFreshConsent: true,
    supportsCompletedRetry: true,
    storesTranscript: false,
    runtimeSchemaMutations: false
  });
}
