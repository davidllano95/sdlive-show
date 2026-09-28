import { SAMUEL_SEQUENCE_BOOTSTRAP, listDocumentKinds } from "./documents-kinds.js";
import {
  TEST_SEQUENCE_CONFIRMATION,
  ensureTestDocumentSequences,
  listClientProfiles,
  listDocumentSequences,
  listIssuerProfiles,
  listSignatureAssets,
  upsertClientProfile,
  upsertIssuerProfile,
  uploadPrivateSignature
} from "./documents-profiles.js";
import {
  deleteClientProfileStorage,
  deleteIssuerProfileStorage
} from "./documents-storage-profile-delete.js";
import { inspectDocumentsStoragePreflight } from "./documents-storage-preparation.js";
import { inspectDocumentsProductionPreflight } from "./documents-production-preflight.js";
import {
  DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
  bootstrapDocumentsProduction
} from "./documents-production-bootstrap.js";
import {
  DOCUMENTS_TEST_PURGE_CONFIRMATION,
  inspectDocumentsTestDataPurge,
  purgeDocumentsTestData
} from "./documents-test-data-purge.js";

const API_PREFIX = "/api/admin/documents";
const MAX_JSON_BYTES = 64 * 1024;
const MAX_SIGNATURE_REQUEST_BYTES = 2 * 1024 * 1024 + 128 * 1024;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function pathOf(request) {
  try {
    const path = new URL(request.url).pathname;
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
  } catch { return ""; }
}

async function actor(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") return null;
  return verifyAdmin(request, env).catch(() => null);
}

async function readJson(request) {
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) throw Object.assign(new Error("application_json_required"), { status: 415 });
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) throw Object.assign(new Error("request_too_large"), { status: 413 });
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw Object.assign(new Error("request_too_large"), { status: 413 });
  let value;
  try { value = JSON.parse(text || "{}"); } catch { throw Object.assign(new Error("invalid_json"), { status: 400 }); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Object.assign(new Error("body_must_be_object"), { status: 400 });
  return value;
}

function publicError(error) {
  const message = String(error?.message || error || "documents_request_failed");
  const known = [
    "application_json_required", "multipart_form_required", "request_too_large", "invalid_json", "body_must_be_object",
    "signature_file_required", "invalid_issuer_id", "issuer_required_fields_missing", "invalid_issuer_addresses", "invalid_issuer_bank",
    "invalid_client_id", "client_required_fields_missing", "invalid_client_currency", "invalid_po_policy",
    "invalid_payment_terms_days", "invalid_finance_aliases", "issuer_not_found", "client_not_found", "signature_png_required",
    "invalid_signature_size", "documents_storage_unavailable", "documents_storage_batch_required", "documents_bucket_unavailable",
    "issuer_profile_in_use", "client_profile_in_use", "explicit_test_sequence_confirmation_required",
    "explicit_production_bootstrap_confirmation_required", "production_preflight_not_ready", "production_bootstrap_postflight_failed",
    "explicit_test_purge_confirmation_required", "test_purge_preflight_changed", "test_purge_not_ready",
    "test_purge_r2_delete_failed", "test_purge_postflight_failed"
  ];
  if (message.startsWith("unexpected_test_sequence_state:")) return { status: 409, error: message };
  if (
    message === "production_preflight_not_ready"
    || message === "production_bootstrap_postflight_failed"
    || message === "test_purge_preflight_changed"
    || message === "test_purge_not_ready"
    || message === "test_purge_postflight_failed"
  ) return { status: 409, error: message };
  if (message === "issuer_profile_in_use" || message === "client_profile_in_use") return { status: 409, error: message };
  if (message === "issuer_not_found" || message === "client_not_found") return { status: 404, error: message };
  if (
    message === "documents_storage_unavailable"
    || message === "documents_storage_batch_required"
    || message === "documents_bucket_unavailable"
    || message === "test_purge_r2_delete_failed"
  ) {
    return { status: 503, error: message };
  }
  return { status: Number(error?.status) || (known.includes(message) ? 400 : 500), error: known.includes(message) ? message : "documents_request_failed" };
}

async function settings(env) {
  const [storage, issuers, clients, signatures, sequences] = await Promise.all([
    inspectDocumentsStoragePreflight(env),
    listIssuerProfiles(env),
    listClientProfiles(env),
    listSignatureAssets(env),
    listDocumentSequences(env)
  ]);
  const sequenceByKey = new Map(sequences.map((item) => [item.seriesKey, item]));
  return {
    ok: true,
    storage,
    kinds: listDocumentKinds(),
    issuers,
    clients,
    signatures,
    sequences,
    intendedRealSequences: Object.values(SAMUEL_SEQUENCE_BOOTSTRAP).map((item) => {
      const existing = sequenceByKey.get(item.seriesKey) || null;
      const bootstrapped = Boolean(existing)
        && existing.issuerId === item.issuerId
        && existing.docType === item.docType
        && Number.isSafeInteger(Number(existing.nextValue))
        && Number(existing.nextValue) >= Number(item.nextValue)
        && existing.displayPattern === item.displayPattern
        && existing.isTest === false;
      return {
        seriesKey: item.seriesKey,
        issuerId: item.issuerId,
        docType: item.docType,
        intendedNextValue: item.nextValue,
        displayPattern: item.displayPattern,
        locked: !bootstrapped,
        bootstrapped,
        note: bootstrapped
          ? `Real series active · next ${existing.nextValue}`
          : "Real series bootstrap requires READY production preflight and explicit owner authorization."
      };
    })
  };
}

async function signatureUpload(request, env) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_SIGNATURE_REQUEST_BYTES) {
    throw Object.assign(new Error("request_too_large"), { status: 413 });
  }
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("multipart/form-data")) throw Object.assign(new Error("multipart_form_required"), { status: 415 });
  const form = await request.formData();
  const issuerId = String(form.get("issuerId") || "").trim();
  const file = form.get("file");
  if (
    !file ||
    typeof file !== "object" ||
    typeof file.arrayBuffer !== "function" ||
    typeof file.size !== "number"
  ) {
    throw Object.assign(new Error("signature_file_required"), { status: 400 });
  }
  if (file.type !== "image/png") throw Object.assign(new Error("signature_png_required"), { status: 415 });
  if (file.size < 16 || file.size > 2 * 1024 * 1024) throw Object.assign(new Error("invalid_signature_size"), { status: 413 });
  const signature = await uploadPrivateSignature(env, {
    issuerId,
    bytes: await file.arrayBuffer(),
    contentType: file.type
  });
  return json({ ok: true, signature }, 201);
}

export async function handleDocumentsProfilesApi(request, env, { verifyAdmin } = {}) {
  const path = pathOf(request);
  if (!path.startsWith(`${API_PREFIX}/`)) return null;
  if (path.endsWith("/storage-preflight") || path.endsWith("/storage-prepare")) return null;

  const user = await actor(request, env, verifyAdmin);
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    if (path === `${API_PREFIX}/settings` && request.method === "GET") {
      return json({ ...(await settings(env)), actor: String(user.email).toLowerCase() });
    }

    if (path === `${API_PREFIX}/production-preflight` && request.method === "GET") {
      return json(await inspectDocumentsProductionPreflight(env));
    }

    if (path === `${API_PREFIX}/production-bootstrap` && request.method === "POST") {
      const body = await readJson(request);
      const result = await bootstrapDocumentsProduction(env, {
        actorEmail: String(user.email).toLowerCase(),
        confirmation: body.confirmation
      });
      return json(result, result.idempotent ? 200 : 201);
    }

    if (path === `${API_PREFIX}/test-data-preflight` && request.method === "GET") {
      return json(await inspectDocumentsTestDataPurge(env));
    }

    if (path === `${API_PREFIX}/test-data-purge` && request.method === "POST") {
      const body = await readJson(request);
      const result = await purgeDocumentsTestData(env, {
        confirmation: body.confirmation,
        fingerprint: body.fingerprint
      });
      return json(result);
    }

    const issuerMatch = path.match(/^\/api\/admin\/documents\/issuers\/([^/]+)$/);
    if (issuerMatch && request.method === "PUT") {
      const profile = await upsertIssuerProfile(env, await readJson(request), { id: decodeURIComponent(issuerMatch[1]) });
      return json({ ok: true, profile });
    }
    if (issuerMatch && request.method === "DELETE") {
      const result = await deleteIssuerProfileStorage(env, decodeURIComponent(issuerMatch[1]));
      return json({ ok: true, ...result });
    }

    if (path === `${API_PREFIX}/clients` && request.method === "POST") {
      const profile = await upsertClientProfile(env, await readJson(request));
      return json({ ok: true, profile }, 201);
    }

    const clientMatch = path.match(/^\/api\/admin\/documents\/clients\/([^/]+)$/);
    if (clientMatch && request.method === "PUT") {
      const profile = await upsertClientProfile(env, await readJson(request), { id: decodeURIComponent(clientMatch[1]) });
      return json({ ok: true, profile });
    }
    if (clientMatch && request.method === "DELETE") {
      const result = await deleteClientProfileStorage(env, decodeURIComponent(clientMatch[1]));
      return json({ ok: true, ...result });
    }

    if (path === `${API_PREFIX}/signatures/upload` && request.method === "POST") {
      return await signatureUpload(request, env);
    }

    if (path === `${API_PREFIX}/sequences/test-ensure` && request.method === "POST") {
      const body = await readJson(request);
      const result = await ensureTestDocumentSequences(env, { confirmation: body.confirmation });
      return json(result);
    }

    return json({ ok: false, error: "Documents API route not found" }, 404);
  } catch (error) {
    console.error("[SD.Live] Documents profiles API failed", error);
    const exposed = publicError(error);
    return json({ ok: false, error: exposed.error }, exposed.status);
  }
}

export function documentsProfilesApiPolicy() {
  return Object.freeze({
    adminOnly: true,
    settingsReturnsSignatureBytes: false,
    settingsReturnsSignaturePublicUrl: false,
    testEnsureConfirmation: TEST_SEQUENCE_CONFIRMATION,
    realSequenceBootstrapExposed: true,
    productionBootstrapConfirmation: DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
    productionBootstrapRequiresReadyPreflight: true,
    productionPreflightReadOnly: true,
    testDataPurgeExposed: true,
    testDataPurgeConfirmation: DOCUMENTS_TEST_PURGE_CONFIRMATION,
    testDataPurgeRequiresDryRunFingerprint: true,
    testDataPurgeCanDeleteRealDocuments: false,
    signatureMaxRequestBytes: MAX_SIGNATURE_REQUEST_BYTES,
    profileDeleteRequiresUnused: true,
    issuerDeleteRemovesPrivateSignatureAssets: true,
    profileDeleteNeverDeletesDocuments: true
  });
}
