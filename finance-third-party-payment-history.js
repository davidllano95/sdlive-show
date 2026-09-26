import { EXPECTED_FINANCE_HEADERS } from "./finance-api.js";

const FINANCE_INDEX = Object.freeze(
  Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]))
);
const THIRD_INDEX = Object.freeze({
  id: 0,
  workId: 1,
  name: 2,
  paid: 9,
  paidDate: 10
});
const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);

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

function financeCell(row, field) {
  return row?.[FINANCE_INDEX[field]];
}

function normalizedCurrency(value) {
  const currency = cleanString(value).toUpperCase();
  return SUPPORTED_CURRENCIES.includes(currency) ? currency : null;
}

function parseSheetDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + Math.round(value * 86400000));
    return Number.isNaN(date.getTime()) ? null : date;
  }

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

function displayDate(value) {
  const date = parseSheetDate(value);
  if (!date) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function buildThirdPartyPaymentHistory(financeRows, thirdPartyRows) {
  const parents = new Map();
  const totals = { COP: 0, USD: 0 };
  const items = [];
  let missingParentCount = 0;
  let missingDateCount = 0;
  let unsupportedCurrencyCount = 0;

  for (const row of Array.isArray(financeRows) ? financeRows : []) {
    const id = cleanString(financeCell(row, "ID"));
    if (!id) continue;
    parents.set(id, {
      client: cleanString(financeCell(row, "Cliente")),
      project: cleanString(financeCell(row, "Proyecto / Show")),
      currency: normalizedCurrency(financeCell(row, "Moneda"))
    });
  }

  for (const row of Array.isArray(thirdPartyRows) ? thirdPartyRows : []) {
    const paid = numericValue(row?.[THIRD_INDEX.paid]);
    if (paid === null || paid <= 0) continue;

    const workId = cleanString(row?.[THIRD_INDEX.workId]);
    const parent = parents.get(workId);
    if (!parent) {
      missingParentCount += 1;
      continue;
    }
    if (!parent.currency) {
      unsupportedCurrencyCount += 1;
      continue;
    }

    const paymentDate = displayDate(row?.[THIRD_INDEX.paidDate]);
    if (!paymentDate) missingDateCount += 1;

    const amount = roundMoney(paid);
    totals[parent.currency] += amount;
    items.push({
      name: cleanString(row?.[THIRD_INDEX.name]) || "Sin nombre",
      date: paymentDate || null,
      amount,
      currency: parent.currency,
      client: parent.client,
      project: parent.project
    });
  }

  items.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    if (a.name !== b.name) return a.name.localeCompare(b.name, "es");
    return b.amount - a.amount;
  });

  return {
    count: items.length,
    totalsByCurrency: {
      COP: roundMoney(totals.COP),
      USD: roundMoney(totals.USD)
    },
    items,
    semantics: {
      source: "PAGO_TERCEROS persisted payment facts",
      cumulativePerObligation: true,
      eventLevelPartialPaymentHistory: false
    },
    dataQuality: {
      missingParentCount,
      missingDateCount,
      unsupportedCurrencyCount
    }
  };
}
