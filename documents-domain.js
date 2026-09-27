import { requireDocumentKind } from "./documents-kinds.js";

export const DOCUMENT_SNAPSHOT_SCHEMA = "sdlive.document.snapshot/1";

function asText(value) {
  return value == null ? "" : String(value).trim();
}

function assertPlainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

export function normalizeMinorUnits(value, code = "invalid_money_minor") {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(code);
  return number;
}

export function formatSequenceNumber(pattern, number) {
  const n = normalizeMinorUnits(number, "invalid_sequence_number");
  if (n < 1) throw new Error("invalid_sequence_number");
  const template = asText(pattern);
  if (!template) throw new Error("missing_display_pattern");
  if (/\{n:(\d+)\}/.test(template)) {
    return template.replace(/\{n:(\d+)\}/g, (_match, width) => String(n).padStart(Number(width), "0"));
  }
  if (template.includes("{n}")) return template.replace(/\{n\}/g, String(n));
  throw new Error("invalid_display_pattern");
}

function normalizedFxRate(value) {
  const rate = asText(value);
  if (!rate) return null;
  if (!/^\d+(?:\.\d{1,12})?$/.test(rate) || Number(rate) <= 0) throw new Error("invalid_exchange_rate");
  return rate;
}

function normalizedLine(line, index) {
  assertPlainObject(line, "invalid_line_item");
  const id = asText(line.id) || `line-${index + 1}`;
  const description = asText(line.description);
  if (!description) throw new Error("line_description_required");

  const quantity = line.quantity == null || line.quantity === "" ? 0 : Number(line.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("line_quantity_must_be_non_negative_integer");
  const multiplier = quantity > 0 ? quantity : 1;

  let amountMinor;
  let unitMinor = null;
  if (line.unitMinor != null) {
    unitMinor = normalizeMinorUnits(line.unitMinor, "invalid_line_unit_minor");
    if (unitMinor < 0) throw new Error("negative_line_amount_not_supported");
    const calculated = unitMinor * multiplier;
    if (!Number.isSafeInteger(calculated)) throw new Error("line_amount_overflow");
    amountMinor = calculated;
  }
  if (line.amountMinor != null) {
    const explicit = normalizeMinorUnits(line.amountMinor, "invalid_line_amount_minor");
    if (explicit < 0) throw new Error("negative_line_amount_not_supported");
    if (amountMinor != null && explicit !== amountMinor) throw new Error("line_amount_mismatch");
    amountMinor = explicit;
  }
  if (amountMinor == null) throw new Error("line_amount_required");

  const kind = asText(line.kind) || "other";
  const allowedKinds = new Set(["professional_service", "equipment", "per_diem", "transport", "reimbursable", "other"]);
  if (!allowedKinds.has(kind)) throw new Error("invalid_line_kind");
  const originalCurrency = asText(line.originalCurrency).toUpperCase() || null;
  if (originalCurrency && !/^[A-Z]{3}$/.test(originalCurrency)) throw new Error("invalid_original_currency");

  return {
    id,
    kind,
    description,
    quantity,
    unit: asText(line.unit) || null,
    unitMinor,
    amountMinor,
    serviceDate: asText(line.serviceDate) || null,
    serviceDateEnd: asText(line.serviceDateEnd) || null,
    poNumber: asText(line.poNumber) || null,
    reference: asText(line.reference) || null,
    originalCurrency,
    originalAmountMinor: line.originalAmountMinor == null
      ? null
      : (() => {
          const value = normalizeMinorUnits(line.originalAmountMinor, "invalid_original_amount_minor");
          if (value < 0) throw new Error("negative_original_amount_not_supported");
          return value;
        })(),
    exchangeRate: normalizedFxRate(line.exchangeRate)
  };
}

export function calculateDocumentLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("at_least_one_line_required");
  const normalized = lines.map(normalizedLine);
  const totalMinor = normalized.reduce((sum, line) => {
    const next = sum + line.amountMinor;
    if (!Number.isSafeInteger(next)) throw new Error("document_total_overflow");
    return next;
  }, 0);
  return { lines: normalized, totalMinor };
}

const UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const TEENS = {
  10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince",
  16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
  20: "veinte", 21: "veintiuno", 22: "veintidós", 23: "veintitrés", 24: "veinticuatro",
  25: "veinticinco", 26: "veintiséis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve"
};
const TENS = { 30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta", 70: "setenta", 80: "ochenta", 90: "noventa" };
const HUNDREDS = { 200: "doscientos", 300: "trescientos", 400: "cuatrocientos", 500: "quinientos", 600: "seiscientos", 700: "setecientos", 800: "ochocientos", 900: "novecientos" };

function underThousand(number) {
  if (number < 10) return UNITS[number];
  if (number < 30) return TEENS[number];
  if (number < 100) {
    const tens = Math.floor(number / 10) * 10;
    const rest = number % 10;
    return rest ? `${TENS[tens]} y ${UNITS[rest]}` : TENS[tens];
  }
  if (number === 100) return "cien";
  if (number < 200) return `ciento ${underThousand(number - 100)}`;
  const hundreds = Math.floor(number / 100) * 100;
  const rest = number % 100;
  return rest ? `${HUNDREDS[hundreds]} ${underThousand(rest)}` : HUNDREDS[hundreds];
}

function spanishInteger(number) {
  if (!Number.isSafeInteger(number) || number < 0 || number > 999999999999) throw new Error("amount_words_out_of_range");
  if (number < 1000) return underThousand(number);
  if (number < 1000000) {
    const thousands = Math.floor(number / 1000);
    const rest = number % 1000;
    const head = thousands === 1 ? "mil" : `${masculine(spanishInteger(thousands))} mil`;
    return rest ? `${head} ${spanishInteger(rest)}` : head;
  }
  if (number < 1000000000) {
    const millions = Math.floor(number / 1000000);
    const rest = number % 1000000;
    const head = millions === 1 ? "un millón" : `${masculine(spanishInteger(millions))} millones`;
    return rest ? `${head} ${spanishInteger(rest)}` : head;
  }
  const billions = Math.floor(number / 1000000000);
  const rest = number % 1000000000;
  const head = billions === 1 ? "mil millones" : `${masculine(spanishInteger(billions))} mil millones`;
  return rest ? `${head} ${spanishInteger(rest)}` : head;
}

function masculine(text) {
  return String(text)
    .replace(/veintiuno$/i, "veintiún")
    .replace(/ y uno$/i, " y un")
    .replace(/uno$/i, "un");
}

export function amountMinorToSpanishWords(amountMinor, { currency = "COP" } = {}) {
  const amount = normalizeMinorUnits(amountMinor);
  if (amount < 0) throw new Error("negative_amount_not_supported");
  const whole = Math.floor(amount / 100);
  const cents = amount % 100;
  const words = masculine(spanishInteger(whole));
  const noun = currency === "COP" ? (whole === 1 ? "PESO" : "PESOS") : (whole === 1 ? "DÓLAR" : "DÓLARES");
  const centsText = cents ? ` CON ${String(cents).padStart(2, "0")}/100` : "";
  const suffix = currency === "COP" ? " M/CTE" : "";
  return `${words.toUpperCase()} ${noun}${centsText}${suffix}`;
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = deepSort(value[key]);
  return out;
}

export function canonicalJson(value) {
  return JSON.stringify(deepSort(value));
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function copiedObject(value) {
  return JSON.parse(canonicalJson(assertPlainObject(value, "snapshot_context_required")));
}

function normalizeSources(sources = []) {
  if (!Array.isArray(sources)) throw new Error("invalid_source_references");
  return sources.map((source) => {
    assertPlainObject(source, "invalid_source_reference");
    const sourceSystem = asText(source.sourceSystem);
    const sourceRef = asText(source.sourceRef);
    if (!sourceSystem || !sourceRef) throw new Error("invalid_source_reference");
    return {
      lineId: asText(source.lineId),
      sourceSystem,
      sourceRef,
      observed: source.observed && typeof source.observed === "object" ? deepSort(source.observed) : {}
    };
  });
}

function finalizedPricing(kind, draft, calculated) {
  const itemize = kind.id !== "cc-co-es" || draft.itemize !== false;
  if (itemize) return { itemize: true, generalAmountMinor: null, totalMinor: calculated.totalMinor };
  const generalAmountMinor = normalizeMinorUnits(draft.generalAmountMinor ?? 0, "invalid_general_amount_minor");
  if (generalAmountMinor < 0) throw new Error("invalid_general_amount_minor");
  return { itemize: false, generalAmountMinor, totalMinor: generalAmountMinor };
}

export function validateDraftForFinalize({ document, draft, issuer, client, signatureAsset, numberContext }) {
  assertPlainObject(document, "document_required");
  assertPlainObject(draft, "draft_required");
  const kind = requireDocumentKind(document.kind_id || draft.kindId);
  if (document.status !== "draft") throw new Error("document_not_draft");
  if (kind.docType !== document.doc_type) throw new Error("document_kind_type_mismatch");
  if (asText(document.currency) !== asText(draft.currency)) throw new Error("draft_currency_mismatch");
  if (!["COP", "USD"].includes(document.currency)) throw new Error("unsupported_currency");
  if (!asText(draft.issueDate)) throw new Error("issue_date_required");
  if (!asText(draft.issueCity)) throw new Error("issue_city_required");
  const calculated = calculateDocumentLines(draft.lines);
  const pricing = finalizedPricing(kind, draft, calculated);
  if (!issuer || !asText(issuer.id) || !asText(issuer.legalName)) throw new Error("issuer_required");
  if (asText(issuer.id) !== asText(document.issuer_id)) throw new Error("issuer_mismatch");
  if (!client || !asText(client.legalName)) throw new Error("client_required");
  if (kind.id === "cc-co-es") {
    if (!asText(issuer.idNumber || issuer.id_number)) throw new Error("issuer_id_number_required");
    if (!asText(client.taxId || client.tax_id)) throw new Error("client_tax_id_required");
    if (typeof draft.usesCostsDeductions !== "boolean") throw new Error("uses_costs_deductions_required");
  }
  if (kind.signatureRequired) {
    if (!signatureAsset || !asText(signatureAsset.id) || !asText(signatureAsset.sha256)) {
      throw new Error("active_signature_required");
    }
  }
  if (!numberContext || !asText(numberContext.seriesKey) || !Number.isSafeInteger(numberContext.number)) {
    throw new Error("number_context_required");
  }
  return { kind, lines: calculated.lines, totalMinor: pricing.totalMinor, pricing };
}

export async function buildFinalSnapshot({
  document,
  draft,
  issuer,
  client,
  signatureAsset,
  numberContext,
  finalizedAt,
  sources = []
}) {
  const { kind, lines, totalMinor, pricing } = validateDraftForFinalize({ document, draft, issuer, client, signatureAsset, numberContext });
  const sourceReferences = normalizeSources(sources);
  const amountWords = kind.docType === "cc"
    ? (asText(draft.amountWordsOverride) || amountMinorToSpanishWords(totalMinor, { currency: document.currency }))
    : (asText(draft.amountWordsOverride) || null);
  const showBankDetails = draft.showBankDetails == null
    ? kind.defaultShowBankDetails
    : Boolean(draft.showBankDetails);
  const selectedBankDetails = draft.bankDetails && typeof draft.bankDetails === "object"
    ? draft.bankDetails
    : (issuer.bankDetails && typeof issuer.bankDetails === "object" ? issuer.bankDetails : null);

  const snapshot = {
    schema: DOCUMENT_SNAPSHOT_SCHEMA,
    kind: {
      id: kind.id,
      docType: kind.docType,
      market: kind.market,
      language: kind.language,
      templateVersion: kind.templateVersion,
      pageSize: kind.pageSize
    },
    number: {
      seriesKey: numberContext.seriesKey,
      value: numberContext.number,
      display: numberContext.displayNumber
    },
    issue: {
      city: asText(draft.issueCity),
      date: asText(draft.issueDate),
      dueDate: asText(draft.dueDate) || null,
      terms: asText(draft.terms) || null,
      finalizedAt: asText(finalizedAt)
    },
    issuer: copiedObject(issuer),
    signature: signatureAsset ? copiedObject(signatureAsset) : null,
    client: copiedObject(client),
    project: {
      label: asText(draft.projectLabel) || asText(document.project_label) || null,
      servicePeriod: draft.servicePeriod && typeof draft.servicePeriod === "object"
        ? deepSort(draft.servicePeriod)
        : null
    },
    purchaseOrder: asText(draft.purchaseOrder) || null,
    currency: document.currency,
    pricing: {
      itemize: pricing.itemize,
      generalAmountMinor: pricing.generalAmountMinor
    },
    lines,
    totals: {
      totalMinor,
      amountInWords: amountWords,
      amountInWordsOverridden: Boolean(asText(draft.amountWordsOverride))
    },
    legal: {
      blockVersion: asText(draft.legalBlockVersion) || kind.legalBlockVersion,
      usesCostsDeductions: draft.usesCostsDeductions == null ? null : Boolean(draft.usesCostsDeductions),
      customText: asText(draft.legalCustomText) || null
    },
    payment: {
      showBankDetails,
      bankDetails: showBankDetails && selectedBankDetails ? deepSort(selectedBankDetails) : null,
      censorBankDetails: !showBankDetails
    },
    supersedes: document.supersedes_id ? {
      documentId: document.supersedes_id,
      notice: asText(draft.supersedesNotice) || null
    } : null,
    notes: asText(draft.notes) || null,
    sources: sourceReferences
  };
  const snapshotJson = canonicalJson(snapshot);
  return {
    snapshot,
    snapshotJson,
    snapshotSha256: await sha256Hex(snapshotJson),
    totalMinor,
    sourceReferences,
    kind
  };
}
