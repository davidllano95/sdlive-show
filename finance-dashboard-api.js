import {
  EXPECTED_FINANCE_HEADERS,
  buildFinanceSummary,
  financeHealthDiagnostic,
  readFinanceRows,
  validateFinanceHeaders
} from "./finance-api.js";

const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);
const AGING_BUCKETS = Object.freeze([
  { key: "0-30", label: "0–30 days", min: 0, max: 30 },
  { key: "31-60", label: "31–60 days", min: 31, max: 60 },
  { key: "61+", label: "61+ days", min: 61, max: Infinity }
]);

const FIELD_INDEX = Object.freeze(
  Object.fromEntries(
    EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
  )
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

function roundPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 10) / 10;
}

function recordCell(row, field) {
  return row?.[FIELD_INDEX[field]];
}

function currencyForRow(row) {
  const currency = cleanString(recordCell(row, "Moneda")).toUpperCase();
  return SUPPORTED_CURRENCIES.includes(currency) ? currency : null;
}

function isPaid(row) {
  return cleanString(recordCell(row, "Estado")).toLowerCase() === "pagado";
}

function isPendingInvoice(row) {
  return cleanString(recordCell(row, "Estado")).toLowerCase() === "pendiente envio";
}

function isWorkflowBlocked(row) {
  if (cleanString(recordCell(row, "Cliente")) !== "LiventX") return false;
  return !cleanString(recordCell(row, "Fecha evaluación")) ||
    !cleanString(recordCell(row, "Fecha firma"));
}

function emptyMonthly() {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    amount: 0
  }));
}

function emptyCurrencySeries() {
  return {
    COP: emptyMonthly(),
    USD: emptyMonthly()
  };
}

function emptyCurrencyMap() {
  return {
    COP: new Map(),
    USD: new Map()
  };
}

function daysInUtc(date) {
  return Math.floor(date.getTime() / 86400000);
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
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    let day = first;
    let month = second;

    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function explicitYearMonth(row, yearField, monthField, dateField) {
  const year = Number(recordCell(row, yearField));
  const month = Number(recordCell(row, monthField));

  if (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }

  const date = parseSheetDate(recordCell(row, dateField));
  if (!date) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  };
}

function currentBogotaParts(now) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function monthsForAverage(year, nowParts) {
  if (year < nowParts.year) return 12;
  if (year === nowParts.year) return nowParts.month;
  return 0;
}

function finalizeMonthly(monthly) {
  return monthly.map((entry) => ({
    month: entry.month,
    amount: roundMoney(entry.amount)
  }));
}

function finalizeSeries(monthly, year, nowParts) {
  const finalized = finalizeMonthly(monthly);
  const denominator = monthsForAverage(year, nowParts);
  const eligibleMonths = denominator > 0 ? finalized.slice(0, denominator) : [];
  const total = roundMoney(eligibleMonths.reduce((sum, entry) => sum + entry.amount, 0));
  const best = eligibleMonths.reduce((winner, entry) => {
    if (!winner || entry.amount > winner.amount) return entry;
    return winner;
  }, null);

  return {
    total,
    averageMonthly: denominator ? roundMoney(total / denominator) : 0,
    averageMonthCount: denominator,
    bestMonth: best ? { month: best.month, amount: best.amount } : null,
    monthly: finalized
  };
}

function mapToRankedRows(map, total) {
  return [...map.entries()]
    .map(([client, amount]) => ({ client, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount || a.client.localeCompare(b.client))
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      sharePercent: total > 0 ? roundPercent((entry.amount / total) * 100) : 0
    }));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function agingKey(days) {
  if (!Number.isFinite(days)) return null;
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "61+";
}

function emptyAgingCurrency() {
  return AGING_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: 0,
    amount: 0,
    workflowBlockedCount: 0,
    workflowBlockedAmount: 0
  }));
}

function normalizeReserveSettings(settings = {}) {
  const rates = settings?.rates || {};
  return {
    enabled: Boolean(settings?.enabled),
    rates: {
      COP: numericValue(rates.COP),
      USD: numericValue(rates.USD)
    },
    applyFrom: cleanString(settings?.applyFrom) || null,
    calculationBase: "cash_received"
  };
}

function reserveApplies(year, month, settings) {
  if (!settings.enabled) return false;
  if (!settings.applyFrom) return true;
  const match = settings.applyFrom.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return true;
  const applyKey = Number(match[1]) * 100 + Number(match[2]);
  return year * 100 + month >= applyKey;
}

function buildTaxReserve(year, receivedByCurrency, settings) {
  const normalized = normalizeReserveSettings(settings);
  const result = {
    configured: normalized.enabled && SUPPORTED_CURRENCIES.some((currency) => normalized.rates[currency] !== null),
    enabled: normalized.enabled,
    applyFrom: normalized.applyFrom,
    calculationBase: normalized.calculationBase,
    COP: null,
    USD: null
  };

  for (const currency of SUPPORTED_CURRENCIES) {
    const rate = normalized.rates[currency];
    if (rate === null) continue;
    const monthly = receivedByCurrency[currency].map((entry) => ({
      month: entry.month,
      amount: reserveApplies(year, entry.month, normalized)
        ? roundMoney(entry.amount * (rate / 100))
        : 0
    }));
    const reserveTotal = roundMoney(monthly.reduce((sum, entry) => sum + entry.amount, 0));
    const receivedTotal = roundMoney(receivedByCurrency[currency].reduce((sum, entry) => sum + entry.amount, 0));
    result[currency] = {
      ratePercent: rate,
      reserveTotal,
      afterReserve: roundMoney(receivedTotal - reserveTotal),
      monthly
    };
  }

  return result;
}

export function buildFinanceAnalytics(rows, { now = new Date(), taxReserveSettings = {} } = {}) {
  const records = Array.isArray(rows) ? rows : [];
  const nowParts = currentBogotaParts(now);
  const yearSet = new Set([nowParts.year]);
  const rawByYear = new Map();
  const currentAging = {
    COP: emptyAgingCurrency(),
    USD: emptyAgingCurrency()
  };
  const currentDebtors = emptyCurrencyMap();

  let unpaidMissingAgingCount = 0;
  let paidMissingPaymentDateCount = 0;
  let invalidPaymentDurationCount = 0;

  function yearBucket(year) {
    if (!rawByYear.has(year)) {
      rawByYear.set(year, {
        received: emptyCurrencySeries(),
        produced: emptyCurrencySeries(),
        topClients: emptyCurrencyMap(),
        clientPaymentDays: { COP: new Map(), USD: new Map() },
        paymentDays: { COP: [], USD: [] },
        paidGross: { COP: 0, USD: 0 },
        fees: { COP: 0, USD: 0 }
      });
    }
    return rawByYear.get(year);
  }

  for (const row of records) {
    const currency = currencyForRow(row);
    if (!currency) continue;

    const workYm = explicitYearMonth(row, "Año", "Month Number", "Fecha trabajo");
    if (workYm) {
      yearSet.add(workYm.year);
      const produced = numericValue(recordCell(row, "Valor Neto"));
      if (produced !== null) {
        const workDate = parseSheetDate(recordCell(row, "Fecha trabajo"));
        const isFuture = workDate
          ? daysInUtc(workDate) > daysInUtc(new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)))
          : workYm.year > nowParts.year || (workYm.year === nowParts.year && workYm.month > nowParts.month);
        if (!isFuture) {
          yearBucket(workYm.year).produced[currency][workYm.month - 1].amount += produced;
        }
      }
    }

    if (isPaid(row)) {
      const paymentYm = explicitYearMonth(row, "Año Pago", "Month Number (pago)", "Fecha pago");
      if (!paymentYm) {
        paidMissingPaymentDateCount += 1;
        continue;
      }

      yearSet.add(paymentYm.year);
      const bucket = yearBucket(paymentYm.year);
      const received = numericValue(recordCell(row, "Valor Recibido"));
      const client = cleanString(recordCell(row, "Cliente")) || "Unknown client";
      const fee = numericValue(recordCell(row, "Impuestos / Fees"));
      const gross = numericValue(recordCell(row, "Valor bruto"));

      if (received !== null) {
        bucket.received[currency][paymentYm.month - 1].amount += received;
        bucket.topClients[currency].set(
          client,
          (bucket.topClients[currency].get(client) || 0) + received
        );
      }
      if (fee !== null) bucket.fees[currency] += fee;
      if (gross !== null) bucket.paidGross[currency] += gross;

      const sentDate = parseSheetDate(recordCell(row, "Fecha cuenta enviada"));
      const paidDate = parseSheetDate(recordCell(row, "Fecha pago"));
      if (sentDate && paidDate) {
        const days = daysInUtc(paidDate) - daysInUtc(sentDate);
        if (days >= 0 && days < 3650) {
          bucket.paymentDays[currency].push(days);
          const clientDays = bucket.clientPaymentDays[currency].get(client) || [];
          clientDays.push(days);
          bucket.clientPaymentDays[currency].set(client, clientDays);
        } else {
          invalidPaymentDurationCount += 1;
        }
      }
      continue;
    }

    const sentAt = cleanString(recordCell(row, "Fecha cuenta enviada"));
    if (!sentAt || isPendingInvoice(row)) continue;

    const net = numericValue(recordCell(row, "Valor Neto"));
    const days = numericValue(recordCell(row, "Días sin pagar"));
    const key = agingKey(days);
    const blocked = isWorkflowBlocked(row);

    if (!key) {
      unpaidMissingAgingCount += 1;
    } else {
      const aging = currentAging[currency].find((entry) => entry.key === key);
      aging.count += 1;
      if (net !== null) aging.amount += net;
      if (blocked) {
        aging.workflowBlockedCount += 1;
        if (net !== null) aging.workflowBlockedAmount += net;
      }
    }

    if (net !== null) {
      const client = cleanString(recordCell(row, "Cliente")) || "Unknown client";
      const debtor = currentDebtors[currency].get(client) || { amount: 0, count: 0, maxDays: 0 };
      debtor.amount += net;
      debtor.count += 1;
      debtor.maxDays = Math.max(debtor.maxDays, Number.isFinite(days) ? days : 0);
      currentDebtors[currency].set(client, debtor);
    }
  }

  const years = [...yearSet].sort((a, b) => b - a);
  const byYear = {};

  for (const year of years) {
    const raw = yearBucket(year);
    const received = {};
    const produced = {};
    const topClients = {};
    const clientConcentration = {};
    const paymentPerformance = {};
    const fees = {};

    for (const currency of SUPPORTED_CURRENCIES) {
      received[currency] = finalizeSeries(raw.received[currency], year, nowParts);
      produced[currency] = finalizeSeries(raw.produced[currency], year, nowParts);
      topClients[currency] = mapToRankedRows(raw.topClients[currency], received[currency].total);
      const top3Total = topClients[currency].slice(0, 3).reduce((sum, entry) => sum + entry.amount, 0);
      clientConcentration[currency] = {
        top3Amount: roundMoney(top3Total),
        top3SharePercent: received[currency].total > 0
          ? roundPercent((top3Total / received[currency].total) * 100)
          : 0
      };

      const durations = raw.paymentDays[currency];
      const slowestClients = [...raw.clientPaymentDays[currency].entries()]
        .map(([client, values]) => ({
          client,
          averageDays: roundPercent(values.reduce((sum, value) => sum + value, 0) / values.length),
          payments: values.length
        }))
        .sort((a, b) => b.averageDays - a.averageDays || a.client.localeCompare(b.client))
        .slice(0, 5);
      paymentPerformance[currency] = {
        sampleSize: durations.length,
        averageDays: durations.length
          ? roundPercent(durations.reduce((sum, value) => sum + value, 0) / durations.length)
          : null,
        medianDays: durations.length ? roundPercent(median(durations)) : null,
        slowestClients
      };

      fees[currency] = {
        total: roundMoney(raw.fees[currency]),
        paidGross: roundMoney(raw.paidGross[currency]),
        effectiveRatePercent: raw.paidGross[currency] > 0
          ? roundPercent((raw.fees[currency] / raw.paidGross[currency]) * 100)
          : 0
      };
    }

    byYear[String(year)] = {
      year,
      received,
      produced,
      generatedVsReceived: {
        COP: received.COP.monthly.map((entry, index) => ({
          month: entry.month,
          generated: produced.COP.monthly[index].amount,
          received: entry.amount
        })),
        USD: received.USD.monthly.map((entry, index) => ({
          month: entry.month,
          generated: produced.USD.monthly[index].amount,
          received: entry.amount
        }))
      },
      topClients,
      clientConcentration,
      paymentPerformance,
      fees,
      taxReserve: buildTaxReserve(year, raw.received, taxReserveSettings)
    };
  }

  const receivables = {
    aging: {},
    topDebtors: {}
  };

  for (const currency of SUPPORTED_CURRENCIES) {
    receivables.aging[currency] = currentAging[currency].map((entry) => ({
      ...entry,
      amount: roundMoney(entry.amount),
      workflowBlockedAmount: roundMoney(entry.workflowBlockedAmount)
    }));
    receivables.topDebtors[currency] = [...currentDebtors[currency].entries()]
      .map(([client, value]) => ({
        client,
        amount: roundMoney(value.amount),
        count: value.count,
        maxDays: value.maxDays
      }))
      .sort((a, b) => b.amount - a.amount || b.maxDays - a.maxDays || a.client.localeCompare(b.client))
      .slice(0, 5);
  }

  return {
    asOf: new Date(now).toISOString(),
    timezone: "America/Bogota",
    years,
    defaultYear: years.includes(nowParts.year) ? nowParts.year : years[0],
    byYear,
    receivables,
    dataQuality: {
      unpaidMissingAgingCount,
      paidMissingPaymentDateCount,
      invalidPaymentDurationCount
    }
  };
}

let financeSettingsSchemaPromise = null;

async function ensureFinanceSettingsSchema(env) {
  if (!financeSettingsSchemaPromise) {
    financeSettingsSchemaPromise = env.CMS_DB.prepare(`
      CREATE TABLE IF NOT EXISTS finance_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        tax_reserve_enabled INTEGER NOT NULL DEFAULT 0,
        tax_reserve_cop_percent REAL,
        tax_reserve_usd_percent REAL,
        tax_reserve_apply_from TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT
      )
    `).run().catch((error) => {
      financeSettingsSchemaPromise = null;
      throw error;
    });
  }
  return financeSettingsSchemaPromise;
}

export async function readFinanceSettings(env) {
  await ensureFinanceSettingsSchema(env);
  const row = await env.CMS_DB.prepare(`
    SELECT
      tax_reserve_enabled,
      tax_reserve_cop_percent,
      tax_reserve_usd_percent,
      tax_reserve_apply_from,
      updated_at,
      updated_by
    FROM finance_settings
    WHERE id = 1
  `).first();

  return {
    taxReserve: {
      enabled: Boolean(row?.tax_reserve_enabled),
      rates: {
        COP: row?.tax_reserve_cop_percent ?? null,
        USD: row?.tax_reserve_usd_percent ?? null
      },
      applyFrom: row?.tax_reserve_apply_from || null,
      calculationBase: "cash_received"
    },
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null
  };
}

function validateRate(value, field) {
  if (value === null || value === "" || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new Error(`${field} must be between 0 and 100`);
  }
  return Math.round(number * 100) / 100;
}

function validateApplyFrom(value) {
  if (value === null || value === "" || value === undefined) return null;
  const text = cleanString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("applyFrom must use YYYY-MM-DD");
  }
  const date = parseSheetDate(text);
  if (!date) throw new Error("applyFrom must be a valid date");
  return text;
}

async function updateFinanceSettings(request, env, user) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }

  const text = await request.text();
  if (text.length > 10000) throw new Error("Request body is too large");
  const body = JSON.parse(text);
  const reserve = body?.taxReserve || {};
  const enabled = reserve.enabled === true;
  const cop = validateRate(reserve?.rates?.COP, "COP reserve rate");
  const usd = validateRate(reserve?.rates?.USD, "USD reserve rate");
  const applyFrom = validateApplyFrom(reserve.applyFrom);

  await ensureFinanceSettingsSchema(env);
  await env.CMS_DB.prepare(`
    INSERT INTO finance_settings (
      id,
      tax_reserve_enabled,
      tax_reserve_cop_percent,
      tax_reserve_usd_percent,
      tax_reserve_apply_from,
      updated_at,
      updated_by
    ) VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(id) DO UPDATE SET
      tax_reserve_enabled = excluded.tax_reserve_enabled,
      tax_reserve_cop_percent = excluded.tax_reserve_cop_percent,
      tax_reserve_usd_percent = excluded.tax_reserve_usd_percent,
      tax_reserve_apply_from = excluded.tax_reserve_apply_from,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = excluded.updated_by
  `).bind(enabled ? 1 : 0, cop, usd, applyFrom, user.email).run();

  return readFinanceSettings(env);
}

function financeUnavailableResponse(error) {
  console.error("[SD.Live] Finance dashboard API request failed", String(error?.message || error));
  return jsonResponse({
    ok: false,
    source: "google-sheets",
    access: "read-only",
    error: "Finance source unavailable",
    ...financeHealthDiagnostic(error)
  }, 503);
}

export async function handleFinanceDashboardApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch, now = new Date() } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

  if (
    path !== "/api/admin/finance/dashboard" &&
    path !== "/api/admin/finance/settings"
  ) {
    return null;
  }

  if (typeof verifyAdmin !== "function") {
    return jsonResponse({ ok: false, error: "Admin verification unavailable" }, 503);
  }

  const user = await verifyAdmin(request, env);
  if (!user) return jsonResponse({ ok: false, error: "Unauthorized" }, 403);

  if (path === "/api/admin/finance/settings") {
    try {
      if (request.method === "GET") {
        return jsonResponse({ ok: true, settings: await readFinanceSettings(env) });
      }
      if (request.method === "PUT") {
        return jsonResponse({ ok: true, settings: await updateFinanceSettings(request, env, user) });
      }
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: "Could not save finance settings",
        detail: String(error?.message || error)
      }, 400);
    }
  }

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const [result, settings] = await Promise.all([
      readFinanceRows(env, fetchImpl),
      readFinanceSettings(env)
    ]);
    const schema = validateFinanceHeaders(result.headers);
    if (!schema.ok) {
      return jsonResponse({
        ok: false,
        source: "google-sheets",
        access: "read-only",
        stage: "schema_validation",
        code: "schema_mismatch",
        schema
      }, 503);
    }

    return jsonResponse({
      ok: true,
      source: "google-sheets",
      access: "read-only",
      range: result.range,
      schema,
      summary: buildFinanceSummary(result.rows),
      analytics: buildFinanceAnalytics(result.rows, {
        now,
        taxReserveSettings: settings.taxReserve
      }),
      settings
    });
  } catch (error) {
    return financeUnavailableResponse(error);
  }
}
