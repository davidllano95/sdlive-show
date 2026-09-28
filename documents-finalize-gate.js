import { validateDraftForFinalize } from "./documents-domain.js";
import { SAMUEL_SEQUENCE_BOOTSTRAP } from "./documents-kinds.js";
import {
  listClientProfiles,
  listIssuerProfiles,
  listSignatureAssets
} from "./documents-profiles.js";
import {
  finalizeDocument,
  peekDocumentNumber,
  readDocument,
  readDocumentSequence
} from "./documents-storage.js";
import {
  buildTestRevisionFinalizePreview,
  finalizeTestRevision
} from "./documents-revisions.js";

const TEST_SERIES_BY_TYPE = Object.freeze({
  cc: "test:CC",
  invoice: "test:INV"
});

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
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

function plain(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function requiredDraftRev(value) {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("invalid_draft_revision");
  return revision;
}

function requiredFinalizeKey(value) {
  const key = text(value, 200);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    throw new Error("invalid_finalize_key");
  }
  return key;
}

function testSeriesKey(docType) {
  const key = TEST_SERIES_BY_TYPE[text(docType, 20)];
  if (!key) throw new Error("unsupported_document_type");
  return key;
}

function productionSeriesConfig(document) {
  const match = Object.values(SAMUEL_SEQUENCE_BOOTSTRAP).find((config) => (
    config.docType === text(document?.doc_type, 20)
    && config.issuerId === text(document?.issuer_id, 120)
  ));
  if (!match) throw new Error("production_series_issuer_not_supported");
  return match;
}

function intendedSeries(document) {
  if (text(document?.issuer_id, 120) === "test") {
    return {
      seriesKey: testSeriesKey(document?.doc_type),
      issuerId: "test",
      docType: text(document?.doc_type, 20),
      isTest: true,
      displayPattern: null
    };
  }
  const config = productionSeriesConfig(document);
  return {
    seriesKey: config.seriesKey,
    issuerId: config.issuerId,
    docType: config.docType,
    isTest: false,
    displayPattern: config.displayPattern
  };
}

function issuerAddress(profile) {
  const first = Array.isArray(profile?.addresses) ? profile.addresses[0] : null;
  return typeof first === "string" ? first : text(first?.text, 500);
}

function issuerContext(profile, overrideValue) {
  const override = plain(overrideValue);
  return {
    ...profile,
    id: profile.id,
    legalName: text(override.legalName, 240) || profile.legalName,
    idType: text(override.idType, 40) || profile.idType,
    idNumber: text(override.idNumber, 120) || profile.idNumber,
    vatLabel: text(override.vatLabel, 160) || profile.vatLabel,
    ciiu: text(override.ciiu, 40) || profile.ciiu,
    phone: text(override.phone, 80) || profile.phone,
    email: text(override.email, 240) || profile.email,
    brandLabel: text(override.brandLabel, 120) || profile.brandLabel,
    address: text(override.address, 500) || issuerAddress(profile),
    bankDetails: profile.bank && typeof profile.bank === "object" ? profile.bank : {}
  };
}

function clientContext(profile, overrideValue, draft) {
  const override = plain(overrideValue);
  return {
    ...(profile || {}),
    id: profile?.id || null,
    displayName: profile?.displayName || text(draft.clientLegalName, 240),
    legalName: text(override.legalName || draft.clientLegalName, 240) || profile?.legalName || "",
    taxIdType: text(override.taxIdType || draft.clientTaxIdType, 40) || profile?.taxIdType || "",
    taxId: text(override.taxId || draft.clientTaxId, 120) || profile?.taxId || "",
    billingAddress: text(override.billingAddress || draft.clientBillingAddress, 500) || profile?.billingAddress || "",
    phone: text(override.phone, 80) || profile?.phone || ""
  };
}

function sourceReferences(draft) {
  return Array.isArray(draft.sources) ? draft.sources : [];
}

async function defaultContext(env, document, draft) {
  const [issuers, clients, signatures] = await Promise.all([
    listIssuerProfiles(env),
    listClientProfiles(env, { includeArchived: true }),
    listSignatureAssets(env, document.issuer_id)
  ]);
  const issuerProfile = issuers.find((item) => item.id === document.issuer_id) || null;
  if (!issuerProfile) throw new Error("issuer_not_found");
  const clientProfile = document.client_id
    ? clients.find((item) => item.id === document.client_id) || null
    : null;
  if (document.client_id && !clientProfile) throw new Error("client_not_found");
  const signatureAsset = issuerProfile.activeSignatureId
    ? signatures.find((item) => item.id === issuerProfile.activeSignatureId && !item.retiredAt) || null
    : null;
  return {
    issuer: issuerContext(issuerProfile, draft.issuerOverride),
    client: clientContext(clientProfile, draft.clientOverride, draft),
    signatureAsset,
    sources: sourceReferences(draft)
  };
}

function operations(overrides = {}) {
  return {
    readDocument,
    readDocumentSequence,
    peekDocumentNumber,
    finalizeDocument,
    resolveContext: defaultContext,
    validateDraftForFinalize,
    buildTestRevisionFinalizePreview,
    finalizeTestRevision,
    ...overrides
  };
}

async function requireDraft(env, documentId, draftRev, ops) {
  const document = await ops.readDocument(env, text(documentId, 160));
  if (!document) throw new Error("document_not_found");
  if (document.status !== "draft") throw new Error("document_not_draft");
  const expectedRev = requiredDraftRev(draftRev);
  if (Number(document.draft_rev) !== expectedRev) throw new Error("stale_draft_revision");
  return { document, draft: parseJson(document.draft_json, {}), expectedRev };
}

function validateSequenceIdentity(document, intended, sequence) {
  if (!sequence) throw new Error("document_sequence_not_found");
  if (String(sequence.series_key) !== String(intended.seriesKey)) throw new Error("sequence_environment_mismatch");
  if (Number(sequence.is_test) !== (intended.isTest ? 1 : 0)) throw new Error("sequence_environment_mismatch");
  if (String(sequence.issuer_id) !== String(document.issuer_id)) {
    if (intended.isTest) throw new Error("test_series_issuer_mismatch");
    throw new Error("sequence_issuer_mismatch");
  }
  if (String(sequence.doc_type) !== String(document.doc_type)) throw new Error("sequence_document_type_mismatch");
  if (!intended.isTest && String(sequence.display_pattern) !== String(intended.displayPattern)) {
    throw new Error("sequence_display_pattern_mismatch");
  }
}

async function standardDraftAndSeries(env, documentId, draftRev, ops) {
  const current = await requireDraft(env, documentId, draftRev, ops);
  const intended = intendedSeries(current.document);
  const sequence = await ops.readDocumentSequence(env, intended.seriesKey);
  validateSequenceIdentity(current.document, intended, sequence);
  return { ...current, intended, seriesKey: intended.seriesKey, sequence };
}

export async function buildFinalizePreview(env, { documentId, draftRev } = {}, overrides = {}) {
  const ops = operations(overrides);
  const current = await requireDraft(env, documentId, draftRev, ops);

  if (current.document.supersedes_id) {
    const preview = await ops.buildTestRevisionFinalizePreview(env, {
      document: current.document,
      draft: current.draft,
      draftRev: current.expectedRev,
      resolveContext: ops.resolveContext,
      validateDraftForFinalize: ops.validateDraftForFinalize
    });
    return { ...preview, testOnly: true, production: false };
  }

  const intended = intendedSeries(current.document);
  const sequence = await ops.readDocumentSequence(env, intended.seriesKey);
  validateSequenceIdentity(current.document, intended, sequence);

  const numberContext = await ops.peekDocumentNumber(env, intended.seriesKey);
  if (Boolean(numberContext.isTest) !== intended.isTest) throw new Error("sequence_environment_mismatch");
  const context = await ops.resolveContext(env, current.document, current.draft);
  const calculated = ops.validateDraftForFinalize({
    document: current.document,
    draft: current.draft,
    issuer: context.issuer,
    client: context.client,
    signatureAsset: context.signatureAsset,
    numberContext
  });
  return {
    ok: true,
    revision: false,
    documentId: current.document.id,
    draftRev: current.expectedRev,
    seriesKey: intended.seriesKey,
    number: numberContext.number,
    displayNumber: numberContext.displayNumber,
    kindId: current.document.kind_id,
    docType: current.document.doc_type,
    clientName: text(context.client?.legalName || current.document.client_name, 240),
    currency: current.document.currency,
    totalMinor: calculated.totalMinor,
    signatureApplied: Boolean(context.signatureAsset?.id && context.signatureAsset?.sha256),
    testOnly: intended.isTest,
    production: !intended.isTest
  };
}

export async function buildTestFinalizePreview(env, options = {}, overrides = {}) {
  const preview = await buildFinalizePreview(env, options, overrides);
  if (!preview.testOnly) throw new Error("real_document_series_disabled");
  return preview;
}

export async function finalizeThroughSeries(env, {
  documentId,
  draftRev,
  finalizeKey,
  actorEmail
} = {}, overrides = {}) {
  const ops = operations(overrides);
  const expectedRev = requiredDraftRev(draftRev);
  const key = requiredFinalizeKey(finalizeKey);
  const document = await ops.readDocument(env, text(documentId, 160));
  if (!document) throw new Error("document_not_found");

  if (document.supersedes_id) {
    const result = await ops.finalizeTestRevision(env, {
      documentId: document.id,
      draftRev: expectedRev,
      finalizeKey: key,
      actorEmail,
      resolveContext: ops.resolveContext,
      validateDraftForFinalize: ops.validateDraftForFinalize
    });
    return { ...result, testOnly: true, production: false };
  }

  const first = await standardDraftAndSeries(env, documentId, expectedRev, ops);
  const result = await ops.finalizeDocument(env, {
    documentId: first.document.id,
    seriesKey: first.seriesKey,
    finalizeKey: key,
    actorEmail,
    resolveContext: async ({ document: freshDocument, draft, sequence, numberContext }) => {
      if (Number(freshDocument.draft_rev) !== expectedRev) throw new Error("stale_draft_revision");
      validateSequenceIdentity(freshDocument, first.intended, sequence);
      const context = await ops.resolveContext(env, freshDocument, draft);
      ops.validateDraftForFinalize({
        document: freshDocument,
        draft,
        issuer: context.issuer,
        client: context.client,
        signatureAsset: context.signatureAsset,
        numberContext
      });
      return context;
    }
  });
  return { ...result, testOnly: first.intended.isTest, production: !first.intended.isTest };
}

export async function finalizeThroughTestSeries(env, options = {}, overrides = {}) {
  const result = await finalizeThroughSeries(env, options, overrides);
  if (!result.testOnly) throw new Error("real_document_series_disabled");
  return result;
}

export function documentsFinalizeGatePolicy() {
  return Object.freeze({
    testSeriesOnly: false,
    testSeriesEnabled: true,
    realSeriesEnabled: true,
    realSeriesRequireCanonicalIssuer: true,
    realSeriesRequireExistingBootstrappedSequence: true,
    requiresExactDraftRev: true,
    requiresClientGeneratedFinalizeKey: true,
    finalizeKeyFormat: "uuid",
    correctionRevisionsEnabled: true,
    realCorrectionRevisionsEnabled: false,
    correctionConsumesBaseNumber: false,
    firstCorrectionSuffix: "B",
    rendersPdf: false,
    bootstrapsRealSequences: false,
    returnsSignatureBytes: false
  });
}
