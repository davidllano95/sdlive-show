import { formatSequenceNumber } from "./documents-domain.js";
import { SAMUEL_SEQUENCE_BOOTSTRAP } from "./documents-kinds.js";
import { inspectDocumentsStoragePreflight } from "./documents-storage-preparation.js";
import { readDocumentSequence } from "./documents-storage.js";

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
}

function bucketFromEnv(env) {
  const bucket = env?.DOCS_BUCKET;
  if (!bucket || typeof bucket.get !== "function") throw new Error("documents_bucket_unavailable");
  return bucket;
}

async function sha256HexBytes(buffer) {
  const bytes = buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readIssuer(env, issuerId) {
  return dbFromEnv(env).prepare(`SELECT id, legal_name, active_signature_id, active
    FROM doc_issuer_profiles WHERE id = ? LIMIT 1`).bind(issuerId).first();
}

async function readSignature(env, signatureId) {
  return dbFromEnv(env).prepare(`SELECT id, issuer_id, r2_key, content_type, sha256, retired_at
    FROM doc_signature_assets WHERE id = ? LIMIT 1`).bind(signatureId).first();
}

async function readIssuedState(env, config) {
  const row = await dbFromEnv(env).prepare(`SELECT
      MAX(CASE WHEN series_key = ? AND number IS NOT NULL THEN number END) AS max_series_number,
      MAX(CASE WHEN issuer_id = ? AND doc_type = ? AND number IS NOT NULL THEN number END) AS max_issuer_type_number,
      SUM(CASE WHEN issuer_id = ? AND doc_type = ? AND number = ? THEN 1 ELSE 0 END) AS requested_number_rows
    FROM doc_documents`).bind(
      config.seriesKey,
      config.issuerId,
      config.docType,
      config.issuerId,
      config.docType,
      config.nextValue
    ).first();
  return {
    maxSeriesNumber: row?.max_series_number == null ? 0 : Number(row.max_series_number),
    maxIssuerTypeNumber: row?.max_issuer_type_number == null ? 0 : Number(row.max_issuer_type_number),
    requestedNumberRows: Number(row?.requested_number_rows || 0)
  };
}

async function inspectSignature(env, issuerId, overrides = {}) {
  const issuer = overrides.readIssuerFn
    ? await overrides.readIssuerFn(env, issuerId)
    : await readIssuer(env, issuerId);
  if (!issuer) {
    return { ready: false, issuerId, issuerPresent: false, activeSignatureConfigured: false, objectPresent: false, hashVerified: false, blocker: "issuer_not_found" };
  }
  if (Number(issuer.active) !== 1) {
    return { ready: false, issuerId, issuerPresent: true, activeSignatureConfigured: false, objectPresent: false, hashVerified: false, blocker: "issuer_inactive" };
  }
  const signatureId = text(issuer.active_signature_id, 160);
  if (!signatureId) {
    return { ready: false, issuerId, issuerPresent: true, activeSignatureConfigured: false, objectPresent: false, hashVerified: false, blocker: "active_signature_missing" };
  }
  const signature = overrides.readSignatureFn
    ? await overrides.readSignatureFn(env, signatureId)
    : await readSignature(env, signatureId);
  if (!signature || String(signature.issuer_id) !== String(issuerId) || signature.retired_at) {
    return { ready: false, issuerId, issuerPresent: true, activeSignatureConfigured: true, objectPresent: false, hashVerified: false, blocker: "active_signature_invalid" };
  }
  if (!["image/png", "image/svg+xml"].includes(String(signature.content_type || ""))) {
    return { ready: false, issuerId, issuerPresent: true, activeSignatureConfigured: true, objectPresent: false, hashVerified: false, blocker: "unsupported_signature_content_type" };
  }

  const object = overrides.readSignatureObjectFn
    ? await overrides.readSignatureObjectFn(env, signature)
    : await bucketFromEnv(env).get(signature.r2_key);
  if (!object || typeof object.arrayBuffer !== "function") {
    return { ready: false, issuerId, issuerPresent: true, activeSignatureConfigured: true, objectPresent: false, hashVerified: false, blocker: "signature_object_missing" };
  }
  const bytes = await object.arrayBuffer();
  const hash = await sha256HexBytes(bytes);
  const hashVerified = Boolean(signature.sha256) && hash === signature.sha256;
  return {
    ready: hashVerified,
    issuerId,
    issuerPresent: true,
    activeSignatureConfigured: true,
    objectPresent: true,
    hashVerified,
    contentType: signature.content_type,
    blocker: hashVerified ? null : "signature_hash_mismatch"
  };
}

async function inspectSeries(env, config, overrides = {}) {
  const sequence = overrides.readSequenceFn
    ? await overrides.readSequenceFn(env, config.seriesKey)
    : await readDocumentSequence(env, config.seriesKey);
  const issued = overrides.readIssuedStateFn
    ? await overrides.readIssuedStateFn(env, config)
    : await readIssuedState(env, config);

  const intendedDisplay = formatSequenceNumber(config.displayPattern, config.nextValue);
  const identityMatches = !sequence || (
    String(sequence.issuer_id) === String(config.issuerId) &&
    String(sequence.doc_type) === String(config.docType) &&
    String(sequence.display_pattern) === String(config.displayPattern) &&
    Number(sequence.is_test) === 0
  );
  const nextMatches = !sequence || Number(sequence.next_value) === Number(config.nextValue);
  const collisionFree = Number(issued.requestedNumberRows || 0) === 0;
  const maxSafe = Math.max(Number(issued.maxSeriesNumber || 0), Number(issued.maxIssuerTypeNumber || 0)) < Number(config.nextValue);

  let blocker = null;
  if (!identityMatches) blocker = "existing_sequence_identity_mismatch";
  else if (!nextMatches) blocker = "existing_sequence_next_value_mismatch";
  else if (!collisionFree) blocker = "requested_number_collision";
  else if (!maxSafe) blocker = "planned_next_not_above_issued_numbers";

  return {
    ready: blocker == null,
    seriesKey: config.seriesKey,
    issuerId: config.issuerId,
    docType: config.docType,
    intendedNextValue: config.nextValue,
    intendedDisplay,
    displayPattern: config.displayPattern,
    sequenceState: sequence ? "existing" : "absent",
    existingNextValue: sequence ? Number(sequence.next_value) : null,
    maxSeriesNumber: Number(issued.maxSeriesNumber || 0),
    maxIssuerTypeNumber: Number(issued.maxIssuerTypeNumber || 0),
    requestedNumberRows: Number(issued.requestedNumberRows || 0),
    blocker
  };
}

export async function inspectDocumentsProductionPreflight(env, overrides = {}) {
  const storage = overrides.storagePreflightFn
    ? await overrides.storagePreflightFn(env)
    : await inspectDocumentsStoragePreflight(env);
  const configs = overrides.configs || Object.values(SAMUEL_SEQUENCE_BOOTSTRAP);
  const issuerIds = [...new Set(configs.map((item) => item.issuerId))];
  const signatures = [];
  for (const issuerId of issuerIds) signatures.push(await inspectSignature(env, issuerId, overrides));
  const series = [];
  for (const config of configs) series.push(await inspectSeries(env, config, overrides));
  const ready = storage?.ready === true && signatures.every((item) => item.ready) && series.every((item) => item.ready);
  return {
    ok: true,
    readOnly: true,
    ready,
    storageReady: storage?.ready === true,
    signatures,
    series,
    bootstrapEnabled: false,
    note: ready
      ? "Read-only preflight passed. Real bootstrap still requires explicit owner authorization."
      : "Read-only preflight found blockers. No production state was changed."
  };
}

export function documentsProductionPreflightPolicy() {
  return Object.freeze({
    readOnly: true,
    writesDatabase: false,
    writesBucket: false,
    bootstrapEnabled: false,
    verifiesPrivateSignatureObject: true,
    exposesPrivateSignatureKey: false,
    exposesSignatureBytes: false
  });
}
