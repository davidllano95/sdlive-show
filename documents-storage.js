import { buildFinalSnapshot, canonicalJson, formatSequenceNumber } from "./documents-domain.js";

export const DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION = "BOOTSTRAP_DOCUMENT_SEQUENCE";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
}

function parseJson(value, fallback = null) {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("invalid_persisted_document_json");
  }
}

function requireFinalizeKey(value) {
  const key = text(value);
  if (key.length < 8 || key.length > 200) throw new Error("invalid_finalize_key");
  return key;
}

function requireActor(value) {
  const actor = text(value).toLowerCase();
  if (!actor || !actor.includes("@")) throw new Error("actor_email_required");
  return actor;
}

export async function readDocument(env, documentId) {
  const db = dbFromEnv(env);
  return db.prepare("SELECT * FROM doc_documents WHERE id = ? LIMIT 1").bind(text(documentId)).first();
}

export async function readDocumentByFinalizeKey(env, finalizeKey) {
  const db = dbFromEnv(env);
  return db.prepare("SELECT * FROM doc_documents WHERE finalize_key = ? LIMIT 1").bind(requireFinalizeKey(finalizeKey)).first();
}

export async function readDocumentSequence(env, seriesKey) {
  const db = dbFromEnv(env);
  return db.prepare(`
    SELECT series_key, issuer_id, doc_type, next_value, display_pattern, is_test,
           bootstrapped_at, bootstrap_note, updated_at
    FROM doc_sequences
    WHERE series_key = ?
    LIMIT 1
  `).bind(text(seriesKey)).first();
}

export async function peekDocumentNumber(env, seriesKey) {
  const sequence = await readDocumentSequence(env, seriesKey);
  if (!sequence) throw new Error("document_sequence_not_found");
  const number = Number(sequence.next_value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("invalid_sequence_state");
  return {
    seriesKey: sequence.series_key,
    number,
    displayNumber: formatSequenceNumber(sequence.display_pattern, number),
    isTest: Number(sequence.is_test) === 1
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

function sourceInsertStatements(db, documentId, sources) {
  return (sources || []).map((source) => db.prepare(`
    INSERT INTO doc_document_sources (
      document_id, line_id, source_system, source_ref, observed_json
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    documentId,
    text(source.lineId),
    source.sourceSystem,
    source.sourceRef,
    canonicalJson(source.observed || {})
  ));
}

export function finalizeSqlContract() {
  return Object.freeze({
    sequenceCas: `UPDATE doc_sequences
      SET next_value = next_value + 1, updated_at = ?
      WHERE series_key = ? AND next_value = ?`,
    finalizeDraft: `UPDATE doc_documents
      SET status = 'finalized', series_key = ?, number = ?, display_number = ?,
          client_name = ?, client_tax_id = ?, project_label = ?, po_numbers = ?,
          total_minor = ?, issue_date = ?, issue_year = ?, snapshot_json = ?,
          snapshot_sha256 = ?, template_version = ?, finalize_key = ?,
          pdf_status = 'pending', updated_at = ?, finalized_at = ?
      WHERE id = ? AND status = 'draft' AND draft_rev = ?
        AND EXISTS (
          SELECT 1 FROM doc_sequences
          WHERE series_key = ? AND next_value = ?
        )`,
    finalizedEventGuard: `INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      VALUES (?, CASE WHEN changes() = 1 THEN 'finalized' ELSE NULL END, ?, ?, ?)`,
    supersedeOriginal: `UPDATE doc_documents
      SET superseded_by_id = ?, updated_at = ?
      WHERE id = ? AND status IN ('finalized', 'void') AND superseded_by_id IS NULL`,
    supersededEventGuard: `INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      VALUES (?, CASE WHEN changes() = 1 THEN 'superseded' ELSE NULL END, ?, ?, ?)`
  });
}

function finalizeBatchStatements({
  db,
  document,
  sequence,
  numberContext,
  built,
  finalizeKey,
  actorEmail,
  finalizedAt
}) {
  const sql = finalizeSqlContract();
  const search = snapshotSearchFields(built.snapshot, document);
  const statements = [
    db.prepare(sql.sequenceCas).bind(finalizedAt, sequence.series_key, numberContext.number),
    db.prepare(sql.finalizeDraft).bind(
      sequence.series_key,
      numberContext.number,
      numberContext.displayNumber,
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
      finalizeKey,
      finalizedAt,
      finalizedAt,
      document.id,
      Number(document.draft_rev),
      sequence.series_key,
      numberContext.number + 1
    ),
    db.prepare(sql.finalizedEventGuard).bind(
      document.id,
      actorEmail,
      finalizedAt,
      canonicalJson({
        seriesKey: sequence.series_key,
        number: numberContext.number,
        displayNumber: numberContext.displayNumber,
        snapshotSha256: built.snapshotSha256
      })
    ),
    ...sourceInsertStatements(db, document.id, built.sourceReferences)
  ];

  if (document.supersedes_id) {
    statements.push(
      db.prepare(sql.supersedeOriginal).bind(document.id, finalizedAt, document.supersedes_id),
      db.prepare(sql.supersededEventGuard).bind(
        document.supersedes_id,
        actorEmail,
        finalizedAt,
        canonicalJson({ supersededById: document.id })
      )
    );
  }
  return statements;
}

function finalizedResult(row, { idempotent = false } = {}) {
  return {
    ok: true,
    finalized: true,
    idempotent,
    document: row,
    number: row?.number == null ? null : Number(row.number),
    displayNumber: row?.display_number || null,
    snapshotSha256: row?.snapshot_sha256 || null,
    pdfStatus: row?.pdf_status || null
  };
}

export async function finalizeDocument(
  env,
  {
    documentId,
    seriesKey,
    finalizeKey,
    actorEmail,
    resolveContext,
    now = () => new Date().toISOString(),
    maxAttempts = 3
  } = {}
) {
  const db = dbFromEnv(env);
  if (typeof db.batch !== "function") throw new Error("documents_storage_batch_required");
  const id = text(documentId);
  const series = text(seriesKey);
  const key = requireFinalizeKey(finalizeKey);
  const actor = requireActor(actorEmail);
  if (!id) throw new Error("document_id_required");
  if (!series) throw new Error("series_key_required");
  if (typeof resolveContext !== "function") throw new Error("finalize_context_resolver_required");

  const prior = await readDocumentByFinalizeKey(env, key);
  if (prior) {
    if (String(prior.id) !== id) throw new Error("finalize_key_already_used");
    if (prior.status === "finalized" || prior.status === "void") return finalizedResult(prior, { idempotent: true });
  }

  let lastError = null;
  for (let attempt = 0; attempt < Math.max(1, Number(maxAttempts) || 1); attempt += 1) {
    const document = await readDocument(env, id);
    if (!document) throw new Error("document_not_found");
    if (document.status !== "draft") {
      if (document.finalize_key === key && (document.status === "finalized" || document.status === "void")) {
        return finalizedResult(document, { idempotent: true });
      }
      throw new Error("document_not_draft");
    }

    const sequence = await readDocumentSequence(env, series);
    if (!sequence) throw new Error("document_sequence_not_found");
    if (String(sequence.issuer_id) !== String(document.issuer_id)) throw new Error("sequence_issuer_mismatch");
    if (String(sequence.doc_type) !== String(document.doc_type)) throw new Error("sequence_document_type_mismatch");
    const number = Number(sequence.next_value);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error("invalid_sequence_state");
    const numberContext = {
      seriesKey: sequence.series_key,
      number,
      displayNumber: formatSequenceNumber(sequence.display_pattern, number)
    };
    const draft = parseJson(document.draft_json, {});
    const context = await resolveContext({ document, draft, sequence, numberContext });
    const finalizedAt = text(now());
    if (!finalizedAt) throw new Error("finalized_at_required");
    const built = await buildFinalSnapshot({
      document,
      draft,
      issuer: context?.issuer,
      client: context?.client,
      signatureAsset: context?.signatureAsset,
      numberContext,
      finalizedAt,
      sources: context?.sources || []
    });

    try {
      await db.batch(finalizeBatchStatements({
        db,
        document,
        sequence,
        numberContext,
        built,
        finalizeKey: key,
        actorEmail: actor,
        finalizedAt
      }));
      const finalized = await readDocument(env, id);
      if (!finalized || finalized.finalize_key !== key || !["finalized", "void"].includes(finalized.status)) {
        throw new Error("finalize_commit_not_observed");
      }
      return finalizedResult(finalized);
    } catch (error) {
      lastError = error;
      const committed = await readDocumentByFinalizeKey(env, key).catch(() => null);
      if (committed) {
        if (String(committed.id) !== id) throw new Error("finalize_key_already_used");
        return finalizedResult(committed, { idempotent: true });
      }
    }
  }
  throw lastError || new Error("document_finalize_conflict");
}

export async function bootstrapDocumentSequence(
  env,
  {
    config,
    actorEmail,
    confirmation,
    note = "",
    now = () => new Date().toISOString()
  } = {}
) {
  if (confirmation !== DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION) throw new Error("explicit_sequence_bootstrap_confirmation_required");
  const db = dbFromEnv(env);
  const actor = requireActor(actorEmail);
  if (!config || typeof config !== "object") throw new Error("sequence_config_required");
  const seriesKey = text(config.seriesKey);
  const issuerId = text(config.issuerId);
  const docType = text(config.docType);
  const displayPattern = text(config.displayPattern);
  const requestedNext = Number(config.nextValue);
  if (!seriesKey || !issuerId || !["cc", "invoice", "quote"].includes(docType)) throw new Error("invalid_sequence_config");
  if (!Number.isSafeInteger(requestedNext) || requestedNext < 1) throw new Error("invalid_sequence_bootstrap_value");
  formatSequenceNumber(displayPattern, requestedNext);

  const existing = await readDocumentSequence(env, seriesKey);
  const maxIssuedRow = await db.prepare(`
    SELECT MAX(number) AS max_number
    FROM doc_documents
    WHERE series_key = ? AND number IS NOT NULL
  `).bind(seriesKey).first();
  const maxIssued = maxIssuedRow?.max_number == null ? 0 : Number(maxIssuedRow.max_number);
  if (requestedNext <= maxIssued) throw new Error("sequence_bootstrap_below_issued_number");
  const at = text(now());

  if (existing) {
    if (String(existing.issuer_id) !== issuerId || String(existing.doc_type) !== docType || String(existing.display_pattern) !== displayPattern) {
      throw new Error("sequence_identity_mismatch");
    }
    const current = Number(existing.next_value);
    if (current >= requestedNext) {
      return { ok: true, applied: false, seriesKey, nextValue: current, alreadyAtOrAbove: true };
    }
    await db.batch([
      db.prepare(`UPDATE doc_sequences
        SET next_value = ?, bootstrapped_at = ?, bootstrap_note = ?, updated_at = ?
        WHERE series_key = ? AND next_value = ?`).bind(requestedNext, at, text(note), at, seriesKey, current),
      db.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
        VALUES (NULL, CASE WHEN changes() = 1 THEN 'sequence_bootstrapped' ELSE NULL END, ?, ?, ?)`).bind(
        actor,
        at,
        canonicalJson({ seriesKey, from: current, to: requestedNext, note: text(note) })
      )
    ]);
  } else {
    await db.batch([
      db.prepare(`INSERT INTO doc_sequences (
        series_key, issuer_id, doc_type, next_value, display_pattern,
        is_test, bootstrapped_at, bootstrap_note, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`).bind(
        seriesKey, issuerId, docType, requestedNext, displayPattern, at, text(note), at
      ),
      db.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
        VALUES (NULL, 'sequence_bootstrapped', ?, ?, ?)`).bind(
        actor,
        at,
        canonicalJson({ seriesKey, from: null, to: requestedNext, note: text(note) })
      )
    ]);
  }

  const after = await readDocumentSequence(env, seriesKey);
  if (!after || Number(after.next_value) < requestedNext) throw new Error("sequence_bootstrap_not_observed");
  return { ok: true, applied: true, seriesKey, nextValue: Number(after.next_value), alreadyAtOrAbove: false };
}

export function documentsStoragePolicy() {
  return Object.freeze({
    draftsConsumeNumbers: false,
    finalizeUsesBatchTransaction: true,
    finalizeUsesSequenceCas: true,
    finalizeIsIdempotentByKey: true,
    pdfFailureMayReleaseNumber: false,
    legacyImportsConsumeSeries: false,
    realBootstrapRequiresExplicitConfirmation: true,
    realBootstrapMayLowerSequence: false,
    writesGoogleSheets: false
  });
}
