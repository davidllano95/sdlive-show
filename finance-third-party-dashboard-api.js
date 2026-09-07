import {
  EXPECTED_FINANCE_HEADERS,
  buildFinanceSummary,
  fetchGoogleAccessToken,
  financeHealthDiagnostic,
  readFinanceRows,
  validateFinanceHeaders
} from "./finance-api.js";
import {
  buildFinanceAnalytics,
  readFinanceSettings
} from "./finance-dashboard-api.js";

const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const THIRD_PARTY_RANGE = "PAGO_TERCEROS!A1:N3000";
const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);

export const EXPECTED_THIRD_PARTY_HEADERS = Object.freeze([
  "ID tercero",
  "Trabajo ID",
  "Tercero",
  "Bruto tercero",
  "Moneda",
  "Valor bruto trabajo",
  "Valor recibido cliente",
  "Tasa retención",
  "Neto estimado tercero",
  "Valor pagado tercero",
  "Fecha pago tercero",
  "Saldo tercero",
  "Estado tercero",
  "Notas"
]);

const FINANCE_INDEX = Object.freeze(
  Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]))
);
const THIRD_PARTY_INDEX = Object.freeze(
  Object.fromEntries(EXPECTED_THIRD_PARTY_HEADERS.map((header, index) => [header, index]))
);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanString(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function numericValue(value) {
  if (value === "" || value === undefined || value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function emptyCurrencyTotals() {
  return { COP: 0, USD: 0 };
}

function addCurrency(totals, currency, amount) {
  if (!currency || amount === null || !Number.isFinite(Number(amount))) return;
  totals[currency] += Number(amount);
}

function finalizeCurrencyTotals(totals) {
  return {
    COP: roundMoney(totals?.COP || 0),
    USD: roundMoney(totals?.USD || 0)
  };
}

function financeCell(row, field) {
  return row?.[FINANCE_INDEX[field]];
}

function thirdPartyCell(row, field) {
  return row?.[THIRD_PARTY_INDEX[field]];
}

function normalizedCurrency(value) {
  const currency = cleanString(value).toUpperCase();
  return SUPPORTED_CURRENCIES.includes(currency) ? currency : null;
}

function spreadsheetSerialDate(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.round(value * 86400000));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSheetDate(value) {
  if (typeof value === "number") return spreadsheetSerialDate(value);
  const text = cleanString(value);
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? date
      : null;
  }

  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    let month = first;
    let day = second;
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? date
      : null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function explicitYearMonth(row, yearField, monthField, dateField) {
  const year = Number(financeCell(row, yearField));
  const month = Number(financeCell(row, monthField));
  if (
    Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(month) && month >= 1 && month <= 12
  ) {
    return { year, month };
  }
  const date = parseSheetDate(financeCell(row, dateField));
  return date ? { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } : null;
}

function dateYearMonth(value) {
  const date = parseSheetDate(value);
  return date ? { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } : null;
}

function emptyMonthlyReconciliation() {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    billedGross: 0,
    ownGross: 0,
    thirdPartyGross: 0,
    bankReceived: 0,
    ownCashReceived: 0,
    estimatedThirdPartyPayable: 0,
    actualThirdPartyPaid: 0,
    fees: 0
  }));
}

function emptyCurrencyReconciliation() {
  return {
    billedGross: 0,
    ownGross: 0,
    thirdPartyGross: 0,
    bankReceived: 0,
    ownCashReceived: 0,
    estimatedThirdPartyPayable: 0,
    actualThirdPartyPaid: 0,
    fees: 0,
    monthly: emptyMonthlyReconciliation()
  };
}

function emptyYearReconciliation() {
  return {
    COP: emptyCurrencyReconciliation(),
    USD: emptyCurrencyReconciliation()
  };
}

function finalizeCurrencyReconciliation(value) {
  const keys = [
    "billedGross",
    "ownGross",
    "thirdPartyGross",
    "bankReceived",
    "ownCashReceived",
    "estimatedThirdPartyPayable",
    "actualThirdPartyPaid",
    "fees"
  ];
  const result = {};
  for (const key of keys) result[key] = roundMoney(value?.[key] || 0);
  result.monthly = (value?.monthly || []).map((entry) => {
    const row = { month: entry.month };
    for (const key of keys) row[key] = roundMoney(entry?.[key] || 0);
    return row;
  });
  return result;
}

function thirdPartySchema(headers) {
  if (!Array.isArray(headers)) {
    return { ok: false, columnCount: 0, mismatchAt: 0 };
  }
  const mismatchAt = EXPECTED_THIRD_PARTY_HEADERS.findIndex(
    (header, index) => cleanString(headers[index]) !== header
  );
  return {
    ok: mismatchAt === -1,
    columnCount: headers.length,
    mismatchAt: mismatchAt === -1 ? null : mismatchAt
  };
}

export function validateThirdPartyHeaders(headers) {
  return thirdPartySchema(headers);
}

async function readThirdPartyValues(env, fetchImpl = fetch) {
  const spreadsheetId = cleanString(env?.GOOGLE_FINANCE_SPREADSHEET_ID);
  if (!spreadsheetId) throw new Error("Missing finance configuration: GOOGLE_FINANCE_SPREADSHEET_ID");
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const spreadsheet = encodeURIComponent(spreadsheetId);
  const encodedRange = encodeURIComponent(THIRD_PARTY_RANGE);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER"
  });
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheet}/values/${encodedRange}?${params}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Google Sheets PAGO_TERCEROS read failed with status ${response.status}`);
  }
  const data = await response.json().catch(() => null);
  const values = data?.values;
  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    throw new Error("Google Sheets returned no PAGO_TERCEROS header row");
  }
  return {
    range: data?.range || THIRD_PARTY_RANGE,
    headers: values[0],
    rows: values.slice(1).filter((row) => cleanString(thirdPartyCell(row, "ID tercero")))
  };
}

function allocationFactor(gross, received) {
  if (
    gross === null || gross <= 0 ||
    received === null || received < 0 || received > gross
  ) return null;
  return received / gross;
}

function childDerived({ brutoTercero, valorPagado, valorBruto, valorRecibido }) {
  const factor = allocationFactor(valorBruto, valorRecibido);
  const tasaRetencion = factor === null ? null : 1 - factor;
  const netoEstimado = brutoTercero === null || tasaRetencion === null
    ? null
    : brutoTercero * (1 - tasaRetencion);
  const paid = valorPagado === null ? 0 : valorPagado;
  const base = netoEstimado === null ? brutoTercero : netoEstimado;
  const saldo = base === null ? null : base - paid;

  let estado = "Por pagar";
  if (saldo !== null && saldo < 0) estado = "Revisar sobrepago";
  else if (saldo === 0 && paid > 0) estado = "Pagado";
  else if (paid > 0 && saldo !== null && saldo > 0) estado = "Parcial";
  else if (valorRecibido === null) estado = "Pendiente cobro";

  return {
    factor,
    tasaRetencion,
    netoEstimado,
    saldo,
    estado,
    paid
  };
}

function addCopThirdPartyBucket(buckets, name, { debt = 0, collected = 0, paid = 0 } = {}) {
  const displayName = cleanString(name) || "Sin nombre";
  const key = displayName.toLocaleLowerCase("es-CO");
  if (!buckets.has(key)) {
    buckets.set(key, { name: displayName, debt: 0, collected: 0, paid: 0 });
  }
  const bucket = buckets.get(key);
  bucket.debt += Number.isFinite(Number(debt)) ? Number(debt) : 0;
  bucket.collected += Number.isFinite(Number(collected)) ? Number(collected) : 0;
  bucket.paid += Number.isFinite(Number(paid)) ? Number(paid) : 0;
}

export function buildThirdPartyCopByName(financeRows, thirdPartyRows) {
  const works = new Map();
  const buckets = new Map();

  for (const row of Array.isArray(financeRows) ? financeRows : []) {
    const id = cleanString(financeCell(row, "ID"));
    if (!id || normalizedCurrency(financeCell(row, "Moneda")) !== "COP") continue;

    const gross = numericValue(financeCell(row, "Valor bruto"));
    const received = numericValue(financeCell(row, "Valor Recibido"));
    const cobroTerceros = numericValue(financeCell(row, "Cobro terceros"));
    if (
      gross === null || gross <= 0 ||
      cobroTerceros === null || cobroTerceros <= 0 || cobroTerceros > gross
    ) continue;

    works.set(id, {
      row,
      gross,
      received,
      cobroTerceros,
      sumChildGross: 0
    });
  }

  for (const row of Array.isArray(thirdPartyRows) ? thirdPartyRows : []) {
    const work = works.get(cleanString(thirdPartyCell(row, "Trabajo ID")));
    if (!work) continue;

    const brutoTercero = numericValue(thirdPartyCell(row, "Bruto tercero"));
    const valorPagado = numericValue(thirdPartyCell(row, "Valor pagado tercero"));
    if (brutoTercero === null || brutoTercero <= 0) continue;

    const derived = childDerived({
      brutoTercero,
      valorPagado,
      valorBruto: work.gross,
      valorRecibido: work.received
    });
    work.sumChildGross += brutoTercero;

    const clientPaid = cleanString(financeCell(work.row, "Estado")).toLowerCase() === "pagado";
    const collected = clientPaid && derived.factor !== null
      ? brutoTercero * derived.factor
      : 0;

    addCopThirdPartyBucket(buckets, thirdPartyCell(row, "Tercero"), {
      debt: Math.max(derived.saldo ?? 0, 0),
      collected,
      paid: derived.paid
    });
  }

  for (const work of works.values()) {
    const unassignedGross = work.cobroTerceros > work.sumChildGross
      ? work.cobroTerceros - work.sumChildGross
      : 0;
    if (unassignedGross <= 0) continue;

    const factor = allocationFactor(work.gross, work.received);
    const debt = unassignedGross * (factor === null ? 1 : factor);
    const clientPaid = cleanString(financeCell(work.row, "Estado")).toLowerCase() === "pagado";
    const collected = clientPaid && factor !== null ? unassignedGross * factor : 0;

    addCopThirdPartyBucket(buckets, "Sin desglose", { debt, collected, paid: 0 });
  }

  return [...buckets.values()]
    .map((entry) => ({
      name: entry.name,
      debt: roundMoney(entry.debt),
      collected: roundMoney(entry.collected),
      paid: roundMoney(entry.paid)
    }))
    .sort((a, b) => b.debt - a.debt || a.name.localeCompare(b.name, "es"));
}

function workState({ cobroTerceros, childCount, sumChildGross, saldoPendiente, pagadoTerceros, valorRecibido }) {
  if (cobroTerceros === null || cobroTerceros <= 0) return "";
  if (childCount === 0) return "Sin desglose";
  if (sumChildGross < cobroTerceros) return "Desglose incompleto";
  if (saldoPendiente < 0) return "Revisar sobrepago";
  if (saldoPendiente === 0) return "Pagado";
  if (pagadoTerceros > 0) return "Parcial";
  if (valorRecibido === null) return "Pendiente cobro";
  return "Por pagar";
}

export function buildThirdPartyLedger(financeRows, thirdPartyRows) {
  const parents = new Map();
  const works = new Map();
  const byYearRaw = new Map();
  const stateCounts = {};
  const childStateCounts = {};
  const allTime = {
    registeredGrossByCurrency: emptyCurrencyTotals(),
    detailedGrossByCurrency: emptyCurrencyTotals(),
    actualPaidByCurrency: emptyCurrencyTotals(),
    currentOutstandingByCurrency: emptyCurrencyTotals(),
    unassignedGrossByCurrency: emptyCurrencyTotals(),
    jobCount: 0,
    obligationCount: 0
  };
  const dataQuality = {
    orphanThirdPartyRowCount: 0,
    invalidThirdPartyGrossCount: 0,
    invalidParentAllocationCount: 0,
    detailExceedsRegisteredCount: 0,
    paidMissingDateCount: 0,
    unsupportedCurrencyCount: 0
  };

  function yearBucket(year) {
    if (!byYearRaw.has(year)) byYearRaw.set(year, emptyYearReconciliation());
    return byYearRaw.get(year);
  }

  for (const row of Array.isArray(financeRows) ? financeRows : []) {
    const id = cleanString(financeCell(row, "ID"));
    if (!id) continue;
    parents.set(id, row);

    const currency = normalizedCurrency(financeCell(row, "Moneda"));
    const rawCurrency = cleanString(financeCell(row, "Moneda"));
    if (rawCurrency && !currency) dataQuality.unsupportedCurrencyCount += 1;

    const gross = numericValue(financeCell(row, "Valor bruto"));
    const received = numericValue(financeCell(row, "Valor Recibido"));
    const cobroTerceros = numericValue(financeCell(row, "Cobro terceros"));
    const validThirdPartyGross = cobroTerceros === null || (
      cobroTerceros >= 0 && gross !== null && gross > 0 && cobroTerceros <= gross
    );
    if (!validThirdPartyGross) dataQuality.invalidParentAllocationCount += 1;

    works.set(id, {
      row,
      currency,
      gross,
      received,
      cobroTerceros,
      childCount: 0,
      sumChildGross: 0,
      sumChildSaldo: 0,
      sumPaid: 0
    });

    if (currency && cobroTerceros !== null && cobroTerceros > 0 && validThirdPartyGross) {
      allTime.jobCount += 1;
      addCurrency(allTime.registeredGrossByCurrency, currency, cobroTerceros);
    }

    const workYm = explicitYearMonth(row, "Año", "Month Number", "Fecha trabajo");
    if (workYm && currency && gross !== null) {
      const thirdGross = validThirdPartyGross && cobroTerceros !== null ? cobroTerceros : 0;
      const ownGross = gross - thirdGross;
      const bucket = yearBucket(workYm.year)[currency];
      bucket.billedGross += gross;
      bucket.ownGross += ownGross;
      bucket.thirdPartyGross += thirdGross;
      const month = bucket.monthly[workYm.month - 1];
      month.billedGross += gross;
      month.ownGross += ownGross;
      month.thirdPartyGross += thirdGross;
    }

    const paymentYm = explicitYearMonth(row, "Año Pago", "Month Number (pago)", "Fecha pago");
    if (paymentYm && currency && received !== null) {
      const factor = allocationFactor(gross, received);
      const thirdGross = validThirdPartyGross && cobroTerceros !== null ? cobroTerceros : 0;
      const ownCash = factor === null ? null : (gross - thirdGross) * factor;
      const thirdPayable = factor === null ? null : thirdGross * factor;
      const fee = numericValue(financeCell(row, "Impuestos / Fees"));
      const bucket = yearBucket(paymentYm.year)[currency];
      bucket.bankReceived += received;
      if (ownCash !== null) bucket.ownCashReceived += ownCash;
      if (thirdPayable !== null) bucket.estimatedThirdPartyPayable += thirdPayable;
      if (fee !== null) bucket.fees += fee;
      const month = bucket.monthly[paymentYm.month - 1];
      month.bankReceived += received;
      if (ownCash !== null) month.ownCashReceived += ownCash;
      if (thirdPayable !== null) month.estimatedThirdPartyPayable += thirdPayable;
      if (fee !== null) month.fees += fee;
    }
  }

  for (const row of Array.isArray(thirdPartyRows) ? thirdPartyRows : []) {
    const workId = cleanString(thirdPartyCell(row, "Trabajo ID"));
    const work = works.get(workId);
    if (!work) {
      dataQuality.orphanThirdPartyRowCount += 1;
      continue;
    }

    const brutoTercero = numericValue(thirdPartyCell(row, "Bruto tercero"));
    const valorPagado = numericValue(thirdPartyCell(row, "Valor pagado tercero"));
    if (brutoTercero === null || brutoTercero <= 0) {
      dataQuality.invalidThirdPartyGrossCount += 1;
      continue;
    }

    const derived = childDerived({
      brutoTercero,
      valorPagado,
      valorBruto: work.gross,
      valorRecibido: work.received
    });

    work.childCount += 1;
    work.sumChildGross += brutoTercero;
    work.sumPaid += derived.paid;
    if (derived.saldo !== null) work.sumChildSaldo += derived.saldo;
    allTime.obligationCount += 1;
    addCurrency(allTime.detailedGrossByCurrency, work.currency, brutoTercero);
    addCurrency(allTime.actualPaidByCurrency, work.currency, derived.paid);
    childStateCounts[derived.estado] = (childStateCounts[derived.estado] || 0) + 1;

    if (derived.paid > 0) {
      const paidYm = dateYearMonth(thirdPartyCell(row, "Fecha pago tercero"));
      if (!paidYm) {
        dataQuality.paidMissingDateCount += 1;
      } else if (work.currency) {
        const bucket = yearBucket(paidYm.year)[work.currency];
        bucket.actualThirdPartyPaid += derived.paid;
        bucket.monthly[paidYm.month - 1].actualThirdPartyPaid += derived.paid;
      }
    }
  }

  for (const work of works.values()) {
    const { currency, gross, received, cobroTerceros } = work;
    if (!currency || cobroTerceros === null || cobroTerceros <= 0) continue;

    if (work.sumChildGross > cobroTerceros) dataQuality.detailExceedsRegisteredCount += 1;
    const unassignedGross = cobroTerceros > work.sumChildGross
      ? cobroTerceros - work.sumChildGross
      : 0;
    const factor = allocationFactor(gross, received);
    const remnant = unassignedGross * (factor === null ? 1 : factor);
    const saldoPendiente = work.sumChildSaldo + remnant;
    const estado = workState({
      cobroTerceros,
      childCount: work.childCount,
      sumChildGross: work.sumChildGross,
      saldoPendiente,
      pagadoTerceros: work.sumPaid,
      valorRecibido: received
    });
    stateCounts[estado] = (stateCounts[estado] || 0) + 1;
    addCurrency(allTime.currentOutstandingByCurrency, currency, saldoPendiente);
    addCurrency(allTime.unassignedGrossByCurrency, currency, unassignedGross);
  }

  const years = [...byYearRaw.keys()].sort((a, b) => b - a);
  const byYear = {};
  for (const year of years) {
    byYear[String(year)] = {
      year,
      COP: finalizeCurrencyReconciliation(byYearRaw.get(year).COP),
      USD: finalizeCurrencyReconciliation(byYearRaw.get(year).USD)
    };
  }

  return {
    source: {
      sheet: "PAGO_TERCEROS",
      persistedFactsOnly: true,
      legacyDerivedColumnsIgnored: [
        "Moneda",
        "Valor bruto trabajo",
        "Valor recibido cliente",
        "Tasa retención",
        "Neto estimado tercero",
        "Saldo tercero",
        "Estado tercero"
      ]
    },
    allTime: {
      ...allTime,
      registeredGrossByCurrency: finalizeCurrencyTotals(allTime.registeredGrossByCurrency),
      detailedGrossByCurrency: finalizeCurrencyTotals(allTime.detailedGrossByCurrency),
      actualPaidByCurrency: finalizeCurrencyTotals(allTime.actualPaidByCurrency),
      currentOutstandingByCurrency: finalizeCurrencyTotals(allTime.currentOutstandingByCurrency),
      unassignedGrossByCurrency: finalizeCurrencyTotals(allTime.unassignedGrossByCurrency),
      stateCounts,
      childStateCounts
    },
    copByThirdParty: buildThirdPartyCopByName(financeRows, thirdPartyRows),
    years,
    byYear,
    dataQuality
  };
}

function enhancedDiagnostic(error) {
  const message = String(error?.message || error || "");
  if (message.startsWith("Google Sheets PAGO_TERCEROS read failed with status ")) {
    const status = message.match(/(\d+)$/)?.[1] || "unknown";
    return { stage: "third_party_sheets_read", code: `third_party_sheets_http_${status}` };
  }
  if (message === "Google Sheets returned no PAGO_TERCEROS header row") {
    return { stage: "third_party_sheets_read", code: "third_party_sheets_no_header_row" };
  }
  return financeHealthDiagnostic(error);
}

export async function handleFinanceThirdPartyDashboardApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch, now = new Date() } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  if (path !== "/api/admin/finance/dashboard") return null;

  if (typeof verifyAdmin !== "function") {
    return jsonResponse({ ok: false, error: "Admin verification unavailable" }, 503);
  }
  const user = await verifyAdmin(request, env);
  if (!user) return jsonResponse({ ok: false, error: "Unauthorized" }, 403);
  if (request.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  try {
    const [finance, thirdParty, settings] = await Promise.all([
      readFinanceRows(env, fetchImpl),
      readThirdPartyValues(env, fetchImpl),
      readFinanceSettings(env)
    ]);
    const financeSchema = validateFinanceHeaders(finance.headers);
    if (!financeSchema.ok) {
      return jsonResponse({
        ok: false,
        source: "google-sheets",
        access: "read-only",
        stage: "schema_validation",
        code: "schema_mismatch",
        schema: financeSchema
      }, 503);
    }
    const thirdPartySchemaResult = thirdPartySchema(thirdParty.headers);
    if (!thirdPartySchemaResult.ok) {
      return jsonResponse({
        ok: false,
        source: "google-sheets",
        access: "read-only",
        stage: "third_party_schema_validation",
        code: "third_party_schema_mismatch",
        schema: thirdPartySchemaResult
      }, 503);
    }

    const ledger = buildThirdPartyLedger(finance.rows, thirdParty.rows);
    const summary = buildFinanceSummary(finance.rows);
    const analytics = buildFinanceAnalytics(finance.rows, {
      now,
      taxReserveSettings: settings.taxReserve
    });
    analytics.thirdPartyReconciliation = ledger.byYear;
    analytics.thirdPartyYears = ledger.years;

    return jsonResponse({
      ok: true,
      source: "google-sheets",
      access: "read-only",
      range: finance.range,
      schema: financeSchema,
      thirdPartySchema: thirdPartySchemaResult,
      summary: {
        ...summary,
        thirdPartyActual: ledger.allTime
      },
      analytics,
      thirdPartyLedger: ledger,
      settings
    });
  } catch (error) {
    console.error("[SD.Live] Third-party Finance dashboard request failed", String(error?.message || error));
    return jsonResponse({
      ok: false,
      source: "google-sheets",
      access: "read-only",
      error: "Finance source unavailable",
      ...enhancedDiagnostic(error)
    }, 503);
  }
}
