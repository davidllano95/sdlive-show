const PROFILE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,79}$/;

function clean(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function validId(value, code) {
  const id = clean(value, 80);
  if (!PROFILE_ID.test(id)) throw new Error(code);
  return id;
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
}

function bucketFromEnv(env) {
  const bucket = env?.DOCS_BUCKET;
  if (!bucket || typeof bucket.delete !== "function") throw new Error("documents_bucket_unavailable");
  return bucket;
}

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

async function count(store, sql, value) {
  const row = await store.prepare(sql).bind(value).first();
  return Number(row?.count || 0);
}

export async function deleteIssuerProfileStorage(env, issuerId) {
  const id = validId(issuerId, "invalid_issuer_id");
  const store = dbFromEnv(env);
  const profile = await store.prepare("SELECT id FROM doc_issuer_profiles WHERE id = ? LIMIT 1").bind(id).first();
  if (!profile) throw new Error("issuer_not_found");

  const [documentCount, sequenceCount] = await Promise.all([
    count(store, "SELECT COUNT(*) AS count FROM doc_documents WHERE issuer_id = ?", id),
    count(store, "SELECT COUNT(*) AS count FROM doc_sequences WHERE issuer_id = ?", id)
  ]);
  if (documentCount > 0 || sequenceCount > 0) throw new Error("issuer_profile_in_use");

  const signatureResult = await store.prepare("SELECT id, r2_key FROM doc_signature_assets WHERE issuer_id = ? ORDER BY created_at DESC").bind(id).all();
  const signatures = signatureResult.results || [];
  const privateBucket = signatures.length ? bucketFromEnv(env) : null;
  if (typeof store.batch !== "function") throw new Error("documents_storage_batch_required");

  const results = await store.batch([
    store.prepare(`DELETE FROM doc_signature_assets
      WHERE issuer_id = ?
        AND NOT EXISTS (SELECT 1 FROM doc_documents WHERE issuer_id = ?)
        AND NOT EXISTS (SELECT 1 FROM doc_sequences WHERE issuer_id = ?)`)
      .bind(id, id, id),
    store.prepare(`DELETE FROM doc_issuer_profiles
      WHERE id = ?
        AND NOT EXISTS (SELECT 1 FROM doc_documents WHERE issuer_id = ?)
        AND NOT EXISTS (SELECT 1 FROM doc_sequences WHERE issuer_id = ?)`)
      .bind(id, id, id)
  ]);

  if (changes(results?.[1]) !== 1) throw new Error("issuer_profile_in_use");

  let privateCleanupFailed = 0;
  if (privateBucket) {
    const cleanup = await Promise.allSettled(signatures.map((item) => privateBucket.delete(String(item.r2_key || ""))));
    privateCleanupFailed = cleanup.filter((item) => item.status === "rejected").length;
  }

  return {
    id,
    deleted: true,
    signatureAssetsDeleted: signatures.length,
    privateCleanupFailed
  };
}

export async function deleteClientProfileStorage(env, clientId) {
  const id = validId(clientId, "invalid_client_id");
  const store = dbFromEnv(env);
  const profile = await store.prepare("SELECT id FROM doc_client_profiles WHERE id = ? LIMIT 1").bind(id).first();
  if (!profile) throw new Error("client_not_found");

  const documentCount = await count(store, "SELECT COUNT(*) AS count FROM doc_documents WHERE client_id = ?", id);
  if (documentCount > 0) throw new Error("client_profile_in_use");

  const result = await store.prepare(`DELETE FROM doc_client_profiles
    WHERE id = ? AND NOT EXISTS (SELECT 1 FROM doc_documents WHERE client_id = ?)`)
    .bind(id, id).run();
  if (changes(result) !== 1) throw new Error("client_profile_in_use");
  return { id, deleted: true };
}

export function documentsProfileDeleteStoragePolicy() {
  return Object.freeze({
    issuerDeleteRequiresNoDocuments: true,
    issuerDeleteRequiresNoSequences: true,
    issuerDeleteRemovesPrivateSignatureAssets: true,
    clientDeleteRequiresNoDocuments: true,
    neverDeletesDocumentsImplicitly: true
  });
}
