// APPROVED DOCUMENT TEMPLATE V1 BASELINES.
// Output-affecting changes must use a new template version (for example @2)
// so historical finalized snapshots can continue to resolve their original renderer.
// See docs/operations/documents-v1-maintenance.md before changing these contracts.
const KINDS = Object.freeze({
  "cc-co-es": Object.freeze({
    id: "cc-co-es",
    docType: "cc",
    market: "CO",
    language: "es",
    templateVersion: "cc-co-es@1",
    pageSize: "Letter",
    defaultSeriesKey: "samuel:CC",
    defaultShowBankDetails: false,
    signatureRequired: true,
    legalBlockVersion: "co-ret@2026-1"
  }),
  "invoice-intl-en": Object.freeze({
    id: "invoice-intl-en",
    docType: "invoice",
    market: "INTL",
    language: "en",
    templateVersion: "invoice-intl-en@1",
    pageSize: "Letter",
    defaultSeriesKey: "samuel:INV",
    defaultShowBankDetails: true,
    signatureRequired: true,
    legalBlockVersion: null
  })
});

export const DOCUMENT_KIND_IDS = Object.freeze(Object.keys(KINDS));

export function getDocumentKind(kindId) {
  return KINDS[String(kindId || "")] || null;
}

export function requireDocumentKind(kindId) {
  const kind = getDocumentKind(kindId);
  if (!kind) throw new Error("unknown_document_kind");
  return kind;
}

export function listDocumentKinds() {
  return DOCUMENT_KIND_IDS.map((id) => KINDS[id]);
}

// PLANNED REAL BOOTSTRAP VALUES ONLY. The approved v1 templates render their
// own `Cuenta de Cobro No.` / `Invoice No.` labels, so sequence display values
// intentionally contain only the number token itself. Real kinds use the same
// canonical issuer profiles selected by the Admin editor: COP for CC and USD
// for international Invoice.
export const SAMUEL_SEQUENCE_BOOTSTRAP = Object.freeze({
  "samuel:CC": Object.freeze({
    seriesKey: "samuel:CC",
    issuerId: "samuel-cop",
    docType: "cc",
    nextValue: 21,
    displayPattern: "{n}"
  }),
  "samuel:INV": Object.freeze({
    seriesKey: "samuel:INV",
    issuerId: "samuel-usd",
    docType: "invoice",
    nextValue: 19,
    displayPattern: "{n:04}"
  })
});
