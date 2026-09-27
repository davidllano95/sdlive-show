import { canonicalJson, sha256Hex } from "./documents-domain.js";

const PROFILE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,79}$/;
export const TEST_SEQUENCE_CONFIRMATION = "ENSURE_TEST_DOCUMENT_SEQUENCES";

const TEST_SEQUENCES = Object.freeze({
  "test:CC": Object.freeze({ issuerId: "test", docType: "cc", nextValue: 1, displayPattern: "TEST-CC {n}" }),
  "test:INV": Object.freeze({ issuerId: "test", docType: "invoice", nextValue: 1, displayPattern: "TEST-INV {n:04}" })
});

function clean(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function nullable(value, max = 500) {
  const text = clean(value, max);
  return text || null;
}

function boolInt(value) {
  return value ? 1 : 0;
}

function db(env) {
  const value = env?.DOCS_DB;
  if (!value || typeof value.prepare !== "function") throw new Error("documents_storage_unavailable");
  return value;
}

function bucket(env) {
  const value = env?.DOCS_BUCKET;
  if (!value || typeof value.put !== "function") throw new Error("documents_bucket_unavailable");
  return value;
}

function validId(value, code = "invalid_profile_id") {
  const id = clean(value, 80);
  if (!PROFILE_ID.test(id)) throw new Error(code);
  return id;
}

function jsonArray(value, code) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(code);
  return value;
}

function jsonObject(value, code) {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function normalizeIssuerProfile(input, { id } = {}) {
  const source = jsonObject(input, "issuer_payload_required");
  const profileId = validId(id || source.id, "invalid_issuer_id");
  const legalName = clean(source.legalName, 240);
  const idType = clean(source.idType, 40);
  const idNumber = clean(source.idNumber, 120);
  const vatLabel = clean(source.vatLabel, 160);
  if (!legalName || !idType || !idNumber || !vatLabel) throw new Error("issuer_required_fields_missing");
  const addresses = jsonArray(source.addresses, "invalid_issuer_addresses").slice(0, 12);
  const bank = jsonObject(source.bank, "invalid_issuer_bank");
  return {
    id: profileId,
    legalName,
    idType,
    idNumber,
    vatLabel,
    ciiu: nullable(source.ciiu, 40),
    phone: nullable(source.phone, 80),
    email: nullable(source.email, 240),
    addresses,
    bank,
    brandLabel: nullable(source.brandLabel, 120),
    active: source.active !== false
  };
}

export function normalizeClientProfile(input, { id } = {}) {
  const source = jsonObject(input, "client_payload_required");
  const profileId = validId(id || source.id || `client-${crypto.randomUUID()}`, "invalid_client_id");
  const displayName = clean(source.displayName, 240);
  const legalName = clean(source.legalName, 240);
  if (!displayName || !legalName) throw new Error("client_required_fields_missing");
  const defaultCurrency = nullable(source.defaultCurrency, 10);
  if (defaultCurrency && !["COP", "USD"].includes(defaultCurrency)) throw new Error("invalid_client_currency");
  const poPolicy = clean(source.poPolicy || "none", 20);
  if (!["none", "document", "line", "required"].includes(poPolicy)) throw new Error("invalid_po_policy");
  const paymentTermsDays = source.paymentTermsDays == null || source.paymentTermsDays === ""
    ? null
    : Number(source.paymentTermsDays);
  if (paymentTermsDays != null && (!Number.isSafeInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 3650)) {
    throw new Error("invalid_payment_terms_days");
  }
  const aliases = jsonArray(source.financeAliases, "invalid_finance_aliases")
    .map((item) => clean(item, 240))
    .filter(Boolean)
    .slice(0, 50);
  return {
    id: profileId,
    displayName,
    legalName,
    taxIdType: nullable(source.taxIdType, 40),
    taxId: nullable(source.taxId, 120),
    billingAddress: nullable(source.billingAddress, 500),
    city: nullable(source.city, 120),
    country: nullable(source.country, 120),
    email: nullable(source.email, 240),
    phone: nullable(source.phone, 80),
    contactName: nullable(source.contactName, 240),
    defaultKindId: nullable(source.defaultKindId, 80),
    defaultCurrency,
    paymentTermsDays,
    poPolicy,
    showBankDetails: Boolean(source.showBankDetails),
    financeAliases: aliases,
    notes: nullable(source.notes, 2000),
    archived: Boolean(source.archived)
  };
}

function issuerRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    legalName: row.legal_name,
    idType: row.id_type,
    idNumber: row.id_number,
    vatLabel: row.vat_label,
    ciiu: row.ciiu,
    phone: row.phone,
    email: row.email,
    addresses: parseJson(row.addresses_json, []),
    bank: parseJson(row.bank_json, {}),
    brandLabel: row.brand_label,
    activeSignatureId: row.active_signature_id,
    active: Number(row.active) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clientRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    legalName: row.legal_name,
    taxIdType: row.tax_id_type,
    taxId: row.tax_id,
    billingAddress: row.billing_address,
    city: row.city,
    country: row.country,
    email: row.email,
    phone: row.phone,
    contactName: row.contact_name,
    defaultKindId: row.default_kind_id,
    defaultCurrency: row.default_currency,
    paymentTermsDays: row.payment_terms_days == null ? null : Number(row.payment_terms_days),
    poPolicy: row.po_policy,
    showBankDetails: Number(row.show_bank_details) === 1,
    financeAliases: parseJson(row.finance_aliases_json, []),
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function signatureRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    issuerId: row.issuer_id,
    contentType: row.content_type,
    sha256: row.sha256,
    widthPx: row.width_px == null ? null : Number(row.width_px),
    heightPx: row.height_px == null ? null : Number(row.height_px),
    createdAt: row.created_at,
    retiredAt: row.retired_at,
    private: true
  };
}

export async function listIssuerProfiles(env) {
  const result = await db(env).prepare("SELECT * FROM doc_issuer_profiles ORDER BY active DESC, legal_name, id").all();
  return (result.results || []).map(issuerRow);
}

export async function upsertIssuerProfile(env, input, { id, now = () => new Date().toISOString() } = {}) {
  const profile = normalizeIssuerProfile(input, { id });
  const store = db(env);
  const existing = await store.prepare("SELECT created_at, active_signature_id FROM doc_issuer_profiles WHERE id = ? LIMIT 1").bind(profile.id).first();
  const at = clean(now(), 80);
  await store.prepare(`INSERT INTO doc_issuer_profiles (
    id, legal_name, id_type, id_number, vat_label, ciiu, phone, email,
    addresses_json, bank_json, brand_label, active_signature_id, active, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    legal_name=excluded.legal_name, id_type=excluded.id_type, id_number=excluded.id_number,
    vat_label=excluded.vat_label, ciiu=excluded.ciiu, phone=excluded.phone, email=excluded.email,
    addresses_json=excluded.addresses_json, bank_json=excluded.bank_json,
    brand_label=excluded.brand_label, active=excluded.active, updated_at=excluded.updated_at`).bind(
      profile.id, profile.legalName, profile.idType, profile.idNumber, profile.vatLabel,
      profile.ciiu, profile.phone, profile.email, canonicalJson(profile.addresses), canonicalJson(profile.bank),
      profile.brandLabel, existing?.active_signature_id || null, boolInt(profile.active), existing?.created_at || at, at
    ).run();
  return issuerRow(await store.prepare("SELECT * FROM doc_issuer_profiles WHERE id = ?").bind(profile.id).first());
}

export async function listClientProfiles(env, { includeArchived = false } = {}) {
  const sql = includeArchived
    ? "SELECT * FROM doc_client_profiles ORDER BY display_name, id"
    : "SELECT * FROM doc_client_profiles WHERE archived_at IS NULL ORDER BY display_name, id";
  const result = await db(env).prepare(sql).all();
  return (result.results || []).map(clientRow);
}

export async function upsertClientProfile(env, input, { id, now = () => new Date().toISOString() } = {}) {
  const profile = normalizeClientProfile(input, { id });
  const store = db(env);
  const existing = await store.prepare("SELECT created_at FROM doc_client_profiles WHERE id = ? LIMIT 1").bind(profile.id).first();
  const at = clean(now(), 80);
  await store.prepare(`INSERT INTO doc_client_profiles (
    id, display_name, legal_name, tax_id_type, tax_id, billing_address, city, country,
    email, phone, contact_name, default_kind_id, default_currency, payment_terms_days,
    po_policy, show_bank_details, finance_aliases_json, notes, archived_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    display_name=excluded.display_name, legal_name=excluded.legal_name,
    tax_id_type=excluded.tax_id_type, tax_id=excluded.tax_id, billing_address=excluded.billing_address,
    city=excluded.city, country=excluded.country, email=excluded.email, phone=excluded.phone,
    contact_name=excluded.contact_name, default_kind_id=excluded.default_kind_id,
    default_currency=excluded.default_currency, payment_terms_days=excluded.payment_terms_days,
    po_policy=excluded.po_policy, show_bank_details=excluded.show_bank_details,
    finance_aliases_json=excluded.finance_aliases_json, notes=excluded.notes,
    archived_at=excluded.archived_at, updated_at=excluded.updated_at`).bind(
      profile.id, profile.displayName, profile.legalName, profile.taxIdType, profile.taxId,
      profile.billingAddress, profile.city, profile.country, profile.email, profile.phone,
      profile.contactName, profile.defaultKindId, profile.defaultCurrency, profile.paymentTermsDays,
      profile.poPolicy, boolInt(profile.showBankDetails), canonicalJson(profile.financeAliases), profile.notes,
      profile.archived ? at : null, existing?.created_at || at, at
    ).run();
  return clientRow(await store.prepare("SELECT * FROM doc_client_profiles WHERE id = ?").bind(profile.id).first());
}

export async function listSignatureAssets(env, issuerId = null) {
  const store = db(env);
  const result = issuerId
    ? await store.prepare("SELECT * FROM doc_signature_assets WHERE issuer_id = ? ORDER BY created_at DESC").bind(validId(issuerId, "invalid_issuer_id")).all()
    : await store.prepare("SELECT * FROM doc_signature_assets ORDER BY created_at DESC").all();
  return (result.results || []).map(signatureRow);
}

export async function uploadPrivateSignature(env, {
  issuerId,
  bytes,
  contentType,
  widthPx = null,
  heightPx = null,
  now = () => new Date().toISOString()
} = {}) {
  const issuer = validId(issuerId, "invalid_issuer_id");
  if (contentType !== "image/png") throw new Error("signature_png_required");
  const data = bytes instanceof ArrayBuffer ? bytes : (ArrayBuffer.isView(bytes) ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : null);
  if (!data || data.byteLength < 16 || data.byteLength > 2 * 1024 * 1024) throw new Error("invalid_signature_size");
  const store = db(env);
  const owner = await store.prepare("SELECT id, active_signature_id FROM doc_issuer_profiles WHERE id = ? LIMIT 1").bind(issuer).first();
  if (!owner) throw new Error("issuer_not_found");

  const id = `sig-${crypto.randomUUID()}`;
  const key = `signatures/${issuer}/${id}.png`;
  const hash = await sha256Hex(new Uint8Array(data));
  const at = clean(now(), 80);
  const privateBucket = bucket(env);
  await privateBucket.put(key, data, {
    httpMetadata: { contentType: "image/png", cacheControl: "private, no-store" },
    customMetadata: { issuerId: issuer, signatureId: id, sha256: hash }
  });

  try {
    const statements = [
      store.prepare(`INSERT INTO doc_signature_assets (
        id, issuer_id, r2_key, content_type, sha256, width_px, height_px, created_at, retired_at
      ) VALUES (?, ?, ?, 'image/png', ?, ?, ?, ?, NULL)`).bind(id, issuer, key, hash, widthPx, heightPx, at),
      store.prepare("UPDATE doc_issuer_profiles SET active_signature_id = ?, updated_at = ? WHERE id = ?").bind(id, at, issuer)
    ];
    if (owner.active_signature_id) {
      statements.push(store.prepare("UPDATE doc_signature_assets SET retired_at = COALESCE(retired_at, ?) WHERE id = ? AND issuer_id = ?").bind(at, owner.active_signature_id, issuer));
    }
    await store.batch(statements);
  } catch (error) {
    await privateBucket.delete(key).catch(() => {});
    throw error;
  }

  return signatureRow(await store.prepare("SELECT * FROM doc_signature_assets WHERE id = ?").bind(id).first());
}

export async function listDocumentSequences(env) {
  const result = await db(env).prepare(`SELECT series_key, issuer_id, doc_type, next_value, display_pattern, is_test,
    bootstrapped_at, bootstrap_note, updated_at FROM doc_sequences ORDER BY is_test DESC, series_key`).all();
  return (result.results || []).map((row) => ({
    seriesKey: row.series_key,
    issuerId: row.issuer_id,
    docType: row.doc_type,
    nextValue: Number(row.next_value),
    displayPattern: row.display_pattern,
    isTest: Number(row.is_test) === 1,
    bootstrappedAt: row.bootstrapped_at,
    bootstrapNote: row.bootstrap_note,
    updatedAt: row.updated_at
  }));
}

export async function ensureTestDocumentSequences(env, { confirmation, now = () => new Date().toISOString() } = {}) {
  if (confirmation !== TEST_SEQUENCE_CONFIRMATION) throw new Error("explicit_test_sequence_confirmation_required");
  const store = db(env);
  const at = clean(now(), 80);
  const actions = [];
  for (const [seriesKey, expected] of Object.entries(TEST_SEQUENCES)) {
    const row = await store.prepare("SELECT * FROM doc_sequences WHERE series_key = ? LIMIT 1").bind(seriesKey).first();
    if (!row) {
      await store.prepare(`INSERT INTO doc_sequences (
        series_key, issuer_id, doc_type, next_value, display_pattern, is_test, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?)`).bind(seriesKey, expected.issuerId, expected.docType, expected.nextValue, expected.displayPattern, at).run();
      actions.push({ seriesKey, action: "created" });
      continue;
    }
    const canonical = String(row.issuer_id) === expected.issuerId && String(row.doc_type) === expected.docType &&
      String(row.display_pattern) === expected.displayPattern && Number(row.is_test) === 1 && Number(row.next_value) >= 1;
    if (!canonical) throw new Error(`unexpected_test_sequence_state:${seriesKey}`);
    actions.push({ seriesKey, action: "already_ready", nextValue: Number(row.next_value) });
  }
  return { ok: true, actions, sequences: (await listDocumentSequences(env)).filter((item) => item.isTest) };
}

export function documentsProfilesPolicy() {
  return Object.freeze({
    signatureBucketPrivateOnly: true,
    signaturePublicUrlReturned: false,
    signatureBytesReturnedBySettings: false,
    signatureUploadType: "image/png",
    maxSignatureBytes: 2 * 1024 * 1024,
    testSequenceEndpointCanCreateRealSeries: false,
    writesGoogleSheets: false,
    usesCmsDb: false,
    usesMediaBucket: false
  });
}
