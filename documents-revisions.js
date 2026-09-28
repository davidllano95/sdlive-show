import { buildFinalSnapshot, canonicalJson } from "./documents-domain.js";
import { SAMUEL_SEQUENCE_BOOTSTRAP } from "./documents-kinds.js";
import {
  createDocumentDraftRow,
  readDocument,
  readDocumentByFinalizeKey,
  readDocumentSequence
} from "./documents-storage.js";

const REVISION_SEQUENCE_PREFIX = "revision:";
const MAX_CHAIN_DEPTH = 64;
const TEST_SERIES_BY_TYPE = Object.freeze({ cc: "test:CC", invoice: "test:INV" });

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
}

function parseJson(value, fallback = {}) {
  if (value == null || value === "") return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    throw new Error("invalid_persisted_document_json");
  }
}

function requireActor(value) {
  const actor = text(value).toLowerCase();
  if (!actor || !actor.includes("@")) throw new Error("actor_email_required");
  return actor;
}

function requireFinalizeKey(value) {
  const key = text(value, 200);
  if (key.length < 8) throw new Error("invalid_finalize_key");
  return key;
}

export function revisionCodeFromIndex(value) {
  const index = Number(value);
  if (!Number.isSafeInteger(index) || index < 1) throw new Error("invalid_revision_index");
  let n = index + 1; // Original is implicit A; first correction is B.
  let code = "";
  while (n > 0) {
    n -= 1;
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26);
  }
  return code;
}

export function revisionSequenceKey(seriesKey, baseNumber) {
  const series = text(seriesKey, 120);
  const number = Number(baseNumber);
  if (!series || !Number.isSafeInteger(number) || number < 1) throw new Error("invalid_revision_base");
  return `${REVISION_SEQUENCE_PREFIX}${series}:${number}`;
}

export function revisionDisplayNumber(baseDisplayNumber, revisionCode) {
  const base = text(baseDisplayNumber, 200);
  const code = text(revisionCode, 12).toUpperCase();
  if (!base || !/^[A-Z]+$/.test(code)) throw new Error("invalid_revision_display");
  return `${base}-${code}`;
}

function productionConfigFor(document) {
  return Object.values(SAMUEL_SEQUENCE_BOOTSTRAP).find((config) => (
    config.seriesKey === document?.series_key
    && config.issuerId === document?.issuer_id
    && config.docType === document?.doc_type
  )) || null;
}

export async function requireRevisionSeries(env, document) {
  if (!document?.series_key) throw new Error("document_sequence_not_found");
  const sequence = await readDocumentSequence(env, document.series_key);
  if (!sequence) throw new Error("document_sequence_not_found");
  if (String(sequence.issuer_id) !== String(document.issuer_id)) throw new Error("sequence_issuer_mismatch");
  if (String(sequence.doc_type) !== String(document.doc_type)) throw new Error("sequence_document_type_mismatch");

  const testOnly = Number(sequence.is_test) === 1;
  if (testOnly) {
    const expected = TEST_SERIES_BY_TYPE[document.doc_type];
    if (!expected || document.issuer_id !== "test" || document.series_key !== expected) {
      throw new Error("sequence_environment_mismatch");
    }
  } else {
    const config = productionConfigFor(document);
    if (!config || String(sequence.display_pattern) !== String(config.displayPattern)) {
      throw new Error("sequence_environment_mismatch");
    }
  }
  return { sequence, testOnly };
}

async function readOpenCorrectionDraft(env, sourceId) {
  return dbFromEnv(env).prepare(`SELECT * FROM doc_documents
    WHERE supersedes_id = ? AND status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1`).bind(sourceId).first();
}

export async function createCorrectionDraft(env, {
  sourceDocumentId,
  actorEmail = "",
  now = () => new Date().toISOString()
} = {}) {
  const source = await readDocument(env, text(sourceDocumentId, 160));
  if (!source) throw new Error("document_not_found");
  if (!["finalized", "void"].includes(source.status)) throw new Error("correction_source_not_issued");
  if (source.superseded_by_id) throw new Error("document_already_superseded");
  const environment = await requireRevisionSeries(env, source);

  const existing = await readOpenCorrectionDraft(env, source.id);
  if (existing) return { ok: true, idempotent: true, document: existing, testOnly: environment.testOnly, production: !environment.testOnly };

  const at = text(now(), 80);
  const documentId = `doc-${crypto.randomUUID()}`;
  const created = await createDocumentDraftRow(env, {
    documentId,
    kindId: source.kind_id,
    docType: source.doc_type,
    issuerId: source.issuer_id,
    clientId: source.client_id || null,
    clientName: source.client_name || "",
    clientTaxId: source.client_tax_id || "",
    projectLabel: source.project_label || "",
    poNumbers: source.po_numbers || "",
    currency: source.currency,
    totalMinor: Number(source.total_minor || 0),
    issueDate: source.issue_date || null,
    issueYear: source.issue_year == null ? null : Number(source.issue_year),
    draftJson: source.draft_json || "{}",
    supersedesId: source.id,
    actorEmail,
    at
  });

  await dbFromEnv(env).prepare(`INSERT INTO doc_document_events
    (document_id, event, actor_email, at, detail_json)
    VALUES (?, 'correction_draft_created', ?, ?, ?)`)
    .bind(source.id, text(actorEmail).toLowerCase(), at, canonicalJson({ correctionDraftId: documentId }))
    .run();

  return { ok: true, idempotent: false, document: created, testOnly: environment.testOnly, production: !environment.testOnly };
}

export async function createTestCorrectionDraft(env, options = {}) {
  const result = await createCorrectionDraft(env, options);
  if (!result.testOnly) throw new Error("real_document_series_disabled");
  return result;
}

async function resolveRevisionChain(env, correctionDraft) {
  if (!correctionDraft?.supersedes_id) throw new Error("revision_source_required");
  const source = await readDocument(env, correctionDraft.supersedes_id);
  if (!source) throw new Error("revision_source_not_found");
  if (!["finalized", "void"].includes(source.status)) throw new Error("correction_source_not_issued");
  if (source.superseded_by_id) throw new Error("document_already_superseded");

  const chain = [];
  let cursor = source;
  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth += 1) {
    chain.push(cursor);
    if (cursor.number != null) break;
    if (!cursor.supersedes_id) throw new Error("revision_root_not_found");
    cursor = await readDocument(env, cursor.supersedes_id);
    if (!cursor) throw new Error("revision_root_not_found");
  }
  if (chain.length >= MAX_CHAIN_DEPTH && chain.at(-1)?.number == null) throw new Error("revision_chain_too_deep");

  const root = chain.at(-1);
  const baseNumber = Number(root?.number);
  if (!root?.series_key || !Number.isSafeInteger(baseNumber) || baseNumber < 1 || !root.display_number) {
    throw new Error("revision_root_not_numbered");
  }
  const environment = await requireRevisionSeries(env, root);
  const rootSequence = environment.sequence;
  if (String(rootSequence.issuer_id) !== String(correctionDraft.issuer_id)) throw new Error("sequence_issuer_mismatch");
  if (String(rootSequence.doc_type) !== String(correctionDraft.doc_type)) throw new Error("sequence_document_type_mismatch");
  if (String(source.series_key) !== String(root.series_key)) throw new Error("revision_series_mismatch");
  if (String(source.issuer_id) !== String(root.issuer_id) || String(source.doc_type) !== String(root.doc_type)) {
    throw new Error("revision_series_mismatch");
  }

  const completedRevisionCount = chain.length - 1;
  return { source, root, baseNumber, completedRevisionCount, rootSequence, testOnly: environment.testOnly };
}

async function revisionCandidate(env, correctionDraft, { mutateCounter = false, at = "" } = {}) {
  const resolved = await resolveRevisionChain(env, correctionDraft);
  const counterKey = revisionSequenceKey(resolved.root.series_key, resolved.baseNumber);
  const expectedIndex = resolved.completedRevisionCount + 1;
  let counter = await readDocumentSequence(env, counterKey);

  if (!counter && mutateCounter) {
    await dbFromEnv(env).prepare(`INSERT OR IGNORE INTO doc_sequences (
      series_key, issuer_id, doc_type, next_value, display_pattern,
      is_test, bootstrapped_at, bootstrap_note, updated_at
    ) VALUES (?, ?, ?, 1, 'REV {n}', ?, ?, 'internal document revision counter', ?)`)
      .bind(
        counterKey,
        resolved.root.issuer_id,
        resolved.root.doc_type,
        Number(resolved.rootSequence.is_test) === 1 ? 1 : 0,
        at,
        at
      )
      .run();
    counter = await readDocumentSequence(env, counterKey);
  }

  const index = counter ? Number(counter.next_value) : expectedIndex;
  if (!Number.isSafeInteger(index) || index < 1) throw new Error("invalid_revision_sequence_state");
  if (index !== expectedIndex) throw new Error("revision_sequence_conflict");
  if (counter) {
    const validCounter = String(counter.series_key) === counterKey
      && String(counter.issuer_id) === String(resolved.root.issuer_id)
      && String(counter.doc_type) === String(resolved.root.doc_type)
      && String(counter.display_pattern) === "REV {n}"
      && Number(counter.is_test) === Number(resolved.rootSequence.is_test);
    if (!validCounter) throw new Error("invalid_revision_sequence_state");
  }

  const revisionCode = revisionCodeFromIndex(index);
  return {
    ...resolved,
    counterKey,
    revisionIndex: index,
    revisionCode,
    displayNumber: revisionDisplayNumber(resolved.root.display_number, revisionCode),
    numberContext: {
      seriesKey: resolved.root.series_key,
      number: resolved.baseNumber,
      displayNumber: revisionDisplayNumber(resolved.root.display_number, revisionCode),
      revisionCode,
      baseDisplayNumber: resolved.root.display_number,
      rootDocumentId: resolved.root.id,
      supersedesDocumentId: resolved.source.id
    }
  };
}

function snapshotSearchFields(snapshot, document) {
  const poNumbers = new Set();
  if (snapshot.purchaseOrder) poNumbers.add(snapshot.purchaseOrder);
  for (const line of snapshot.lines || []) if (line.poNumber) poNumbers.add(line.poNumber);
  return {
    clientName: text(snapshot.client?.legalName || snapshot.client?.displayName || document.client_name),
    clientTaxId: text(snapshot.client?.taxId || snapshot.client?.tax_id || document.client_tax_id),
    projectLabel: text(snapshot.project?.label || document.project_label),
    poNumbers: Array.from(poNumbers).join(", "),
    issueDate: text(snapshot.issue?.date),
    issueYear: /^\d{4}-/.test(text(snapshot.issue?.date)) ? Number(String(snapshot.issue.date).slice(0, 4)) : null
  };
}

function sourceStatements(db, documentId, sources) {
  return (sources || []).map((source) => db.prepare(`INSERT INTO doc_document_sources (
    document_id, line_id, source_system, source_ref, observed_json
  ) VALUES (?, ?, ?, ?, ?)`)
    .bind(documentId, text(source.lineId), source.sourceSystem, source.sourceRef, canonicalJson(source.observed || {})));
}

function revisionResult(row, { idempotent = false, testOnly = null } = {}) {
  const snapshot = parseJson(row?.snapshot_json, {});
  return {
    ok: true,
    finalized: true,
    revision: true,
    idempotent,
    document: row,
    number: snapshot.number?.value == null ? null : Number(snapshot.number.value),
    displayNumber: row?.display_number || snapshot.number?.display || null,
    revisionCode: snapshot.number?.revisionCode || null,
    snapshotSha256: row?.snapshot_sha256 || null,
    pdfStatus: row?.pdf_status || null,
    ...(testOnly == null ? {} : { testOnly, production: !testOnly })
  };
}

export async function buildRevisionFinalizePreview(env, {
  document,
  draft,
  draftRev,
  resolveContext,
  validateDraftForFinalize
} = {}) {
  if (!document || document.status !== "draft" || !document.supersedes_id) throw new Error("revision_draft_required");
  if (Number(document.draft_rev) !== Number(draftRev)) throw new Error("stale_draft_revision");
  const candidate = await revisionCandidate(env, document);
  const context = await resolveContext(env, document, draft);
  const calculated = validateDraftForFinalize({
    document,
    draft,
    issuer: context.issuer,
    client: context.client,
    signatureAsset: context.signatureAsset,
    numberContext: candidate.numberContext
  });
  return {
    ok: true,
    revision: true,
    documentId: document.id,
    draftRev: Number(draftRev),
    seriesKey: candidate.root.series_key,
    number: candidate.baseNumber,
    displayNumber: candidate.displayNumber,
    revisionCode: candidate.revisionCode,
    supersedesDocumentId: candidate.source.id,
    kindId: document.kind_id,
    docType: document.doc_type,
    clientName: text(context.client?.legalName || document.client_name, 240),
    currency: document.currency,
    totalMinor: calculated.totalMinor,
    signatureApplied: Boolean(context.signatureAsset?.id && context.signatureAsset?.sha256),
    testOnly: candidate.testOnly,
    production: !candidate.testOnly
  };
}

export async function buildTestRevisionFinalizePreview(env, options = {}) {
  const result = await buildRevisionFinalizePreview(env, options);
  if (!result.testOnly) throw new Error("real_document_series_disabled");
  return result;
}

export async function finalizeRevision(env, {
  documentId,
  draftRev,
  finalizeKey,
  actorEmail,
  resolveContext,
  validateDraftForFinalize,
  now = () => new Date().toISOString(),
  maxAttempts = 3
} = {}) {
  const id = text(documentId, 160);
  const key = requireFinalizeKey(finalizeKey);
  const actor = requireActor(actorEmail);
  const expectedRev = Number(draftRev);
  if (!Number.isSafeInteger(expectedRev) || expectedRev < 1) throw new Error("invalid_draft_revision");
  if (typeof resolveContext !== "function" || typeof validateDraftForFinalize !== "function") throw new Error("finalize_context_resolver_required");

  const prior = await readDocumentByFinalizeKey(env, key);
  if (prior) {
    if (String(prior.id) !== id) throw new Error("finalize_key_already_used");
    if (["finalized", "void"].includes(prior.status)) {
      const environment = await requireRevisionSeries(env, prior);
      return revisionResult(prior, { idempotent: true, testOnly: environment.testOnly });
    }
  }

  const store = dbFromEnv(env);
  if (typeof store.batch !== "function") throw new Error("documents_storage_batch_required");
  let lastError = null;

  for (let attempt = 0; attempt < Math.max(1, Number(maxAttempts) || 1); attempt += 1) {
    const document = await readDocument(env, id);
    if (!document) throw new Error("document_not_found");
    if (document.status !== "draft") {
      if (document.finalize_key === key && ["finalized", "void"].includes(document.status)) {
        const environment = await requireRevisionSeries(env, document);
        return revisionResult(document, { idempotent: true, testOnly: environment.testOnly });
      }
      throw new Error("document_not_draft");
    }
    if (!document.supersedes_id) throw new Error("revision_draft_required");
    if (Number(document.draft_rev) !== expectedRev) throw new Error("stale_draft_revision");

    const finalizedAt = text(now(), 80);
    const candidate = await revisionCandidate(env, document, { mutateCounter: true, at: finalizedAt });
    const draft = parseJson(document.draft_json, {});
    const context = await resolveContext(env, document, draft);
    validateDraftForFinalize({
      document,
      draft,
      issuer: context.issuer,
      client: context.client,
      signatureAsset: context.signatureAsset,
      numberContext: candidate.numberContext
    });
    const built = await buildFinalSnapshot({
      document,
      draft,
      issuer: context.issuer,
      client: context.client,
      signatureAsset: context.signatureAsset,
      numberContext: candidate.numberContext,
      finalizedAt,
      sources: context.sources || []
    });
    const search = snapshotSearchFields(built.snapshot, document);

    const statements = [
      store.prepare(`UPDATE doc_sequences
        SET next_value = next_value + 1, updated_at = ?
        WHERE series_key = ? AND next_value = ?`)
        .bind(finalizedAt, candidate.counterKey, candidate.revisionIndex),
      store.prepare(`UPDATE doc_documents SET
          status = 'finalized', series_key = ?, number = NULL, display_number = ?,
          client_name = ?, client_tax_id = ?, project_label = ?, po_numbers = ?,
          total_minor = ?, issue_date = ?, issue_year = ?, snapshot_json = ?,
          snapshot_sha256 = ?, template_version = ?, finalize_key = ?,
          pdf_status = 'pending', updated_at = ?, finalized_at = ?
        WHERE id = ? AND status = 'draft' AND draft_rev = ? AND supersedes_id = ?
          AND EXISTS (SELECT 1 FROM doc_sequences WHERE series_key = ? AND next_value = ?)
          AND EXISTS (SELECT 1 FROM doc_documents WHERE id = ? AND status IN ('finalized', 'void') AND superseded_by_id IS NULL)`)
        .bind(
          candidate.root.series_key,
          candidate.displayNumber,
          search.clientName,
          search.clientTaxId,
          search.projectLabel,
          search.poNumbers,
          built.totalMinor,
          search.issueDate,
          search.issueYear,
          built.snapshotJson,
          built.snapshotSha256,
          built.kind.templateVersion,
          key,
          finalizedAt,
          finalizedAt,
          document.id,
          expectedRev,
          candidate.source.id,
          candidate.counterKey,
          candidate.revisionIndex + 1,
          candidate.source.id
        ),
      store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
        VALUES (?, CASE WHEN changes() = 1 THEN 'finalized' ELSE NULL END, ?, ?, ?)`)
        .bind(document.id, actor, finalizedAt, canonicalJson({
          seriesKey: candidate.root.series_key,
          number: candidate.baseNumber,
          displayNumber: candidate.displayNumber,
          revisionCode: candidate.revisionCode,
          supersedesDocumentId: candidate.source.id,
          snapshotSha256: built.snapshotSha256
        })),
      ...sourceStatements(store, document.id, built.sourceReferences),
      store.prepare(`UPDATE doc_documents
        SET superseded_by_id = ?, updated_at = ?
        WHERE id = ? AND status IN ('finalized', 'void') AND superseded_by_id IS NULL`)
        .bind(document.id, finalizedAt, candidate.source.id),
      store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
        VALUES (?, CASE WHEN changes() = 1 THEN 'superseded' ELSE NULL END, ?, ?, ?)`)
        .bind(candidate.source.id, actor, finalizedAt, canonicalJson({
          supersededById: document.id,
          displayNumber: candidate.displayNumber,
          revisionCode: candidate.revisionCode
        }))
    ];

    try {
      await store.batch(statements);
      const finalized = await readDocument(env, id);
      const sourceAfter = await readDocument(env, candidate.source.id);
      if (!finalized || finalized.finalize_key !== key || !["finalized", "void"].includes(finalized.status)) {
        throw new Error("finalize_commit_not_observed");
      }
      if (sourceAfter?.superseded_by_id !== finalized.id) throw new Error("supersede_commit_not_observed");
      return revisionResult(finalized, { testOnly: candidate.testOnly });
    } catch (error) {
      lastError = error;
      const committed = await readDocumentByFinalizeKey(env, key).catch(() => null);
      if (committed) {
        if (String(committed.id) !== id) throw new Error("finalize_key_already_used");
        const environment = await requireRevisionSeries(env, committed);
        return revisionResult(committed, { idempotent: true, testOnly: environment.testOnly });
      }
    }
  }

  throw lastError || new Error("document_finalize_conflict");
}

export async function finalizeTestRevision(env, options = {}) {
  const result = await finalizeRevision(env, options);
  if (!result.testOnly) throw new Error("real_document_series_disabled");
  return result;
}

export function documentsRevisionPolicy() {
  return Object.freeze({
    testSeriesOnly: false,
    testSeriesEnabled: true,
    realSeriesEnabled: true,
    canonicalSeriesIdentityRequired: true,
    revisionCounterInheritsEnvironment: true,
    originalImmutable: true,
    correctionCreatesDraft: true,
    firstCorrectionSuffix: "B",
    subsequentSuffixes: "C/D/...",
    consumesBaseSequenceNumber: false,
    branchesAllowed: false,
    identitySource: "supersedes_chain_plus_revision_counter"
  });
}
