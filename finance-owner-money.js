import { EXPECTED_FINANCE_HEADERS } from "./finance-api.js";

const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);
const FIELD_INDEX = Object.freeze(
  Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]))
);

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

function isPaid(row) {
  return cleanString(recordCell(row, "Estado")).toLowerCase() === "pagado";
}

function isPendingInvoice(row) {
  return cleanString(recordCell(row, "Estado")).toLowerCase() === "pendiente envio";
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
    let day = first;
    let month = second;
    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    } else if (first <= 12 && second <= 12) {
      month = first;
      day = second;
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

function displaySheetDate(value) {
  const date = parseSheetDate(value);
  if (!date) return cleanString(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysInUtc(date) {
  return Math.floor(date.getTime() / 86400000);
}

function currentBogotaParts(now) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function explicitYearMonth(row, yearField, monthField, dateField) {
  const year = Number(recordCell(row, yearField));
  const month = Number(recordCell(row, monthField));
  if (
    Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(month) && month >= 1 && month <= 12
  ) {
    return { year, month };
  }
  const date = parseSheetDate(recordCell(row, dateField));
  return date ? { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } : null;
}

function ownerFacts(row) {
  const gross = numericValue(recordCell(row, "Valor bruto"));
  const received = numericValue(recordCell(row, "Valor Recibido"));
  const rawThirdParty = numericValue(recordCell(row, "Cobro terceros"));
  const thirdPartyGross = rawThirdParty === null ? 0 : rawThirdParty;
  const validGross = gross !== null && gross >= 0;
  const validThirdParty = validGross && thirdPartyGross >= 0 && thirdPartyGross <= gross;
  const ownGross = validThirdParty ? gross - thirdPartyGross : null;

  let ownCashReceived = null;
  let thirdPartyPayable = null;
  let validCashAllocation = true;

  if (received !== null && isPaid(row)) {
    if (thirdPartyGross === 0 && validGross) {
      ownCashReceived = received;
      thirdPartyPayable = 0;
    } else if (
      validThirdParty && gross > 0 &&
      received >= 0 && received <= gross
    ) {
      const factor = received / gross;
      thirdPartyPayable = thirdPartyGross * factor;
      ownCashReceived = received - thirdPartyPayable;
    } else {
      validCashAllocation = false;
    }
  }

  return {
    gross,
    received,
    thirdPartyGross,
    validThirdParty,
    ownGross,
    ownCashReceived,
    thirdPartyPayable,
    validCashAllocation
  };
}

function currentWorkDate(row) {
  return parseSheetDate(recordCell(row, "Fecha fin")) || parseSheetDate(recordCell(row, "Fecha trabajo"));
}

function invoiceReady(row, todayUtc) {
  const workDate = currentWorkDate(row);
  return workDate ? daysInUtc(workDate) < daysInUtc(todayUtc) : false;
}

function collectionEligibility(row) {
  if (isPaid(row) || isPendingInvoice(row) || !cleanString(recordCell(row, "Fecha cuenta enviada"))) {
    return { collectible: false, blocked: false };
  }
  const isLiventX = cleanString(recordCell(row, "Cliente")).toLowerCase() === "liventx";
  if (!isLiventX) return { collectible: true, blocked: false };
  const ready = Boolean(
    cleanString(recordCell(row, "Fecha evaluación")) &&
    cleanString(recordCell(row, "Fecha firma"))
  );
  return { collectible: ready, blocked: !ready };
}

function publicWorkItem(row, currency, amount) {
  return {
    workDate: displaySheetDate(recordCell(row, "Fecha trabajo")),
    endDate: displaySheetDate(recordCell(row, "Fecha fin")),
    client: cleanString(recordCell(row, "Cliente")),
    project: cleanString(recordCell(row, "Proyecto / Show")),
    currency,
    netAmount: amount === null ? null : roundMoney(amount),
    state: cleanString(recordCell(row, "Estado")),
    invoiceSentDate: displaySheetDate(recordCell(row, "Fecha cuenta enviada")),
    daysUnpaid: numericValue(recordCell(row, "Días sin pagar"))
  };
}

function emptyMonthly() {
  return Array.from({ length: 12 }, (_, index) => ({ month: index + 1, amount: 0 }));
}

function emptyCurrencySeries() {
  return { COP: emptyMonthly(), USD: emptyMonthly() };
}

function emptyCurrencyMap() {
  return { COP: new Map(), USD: new Map() };
}

function monthsForAverage(year, nowParts) {
  if (year < nowParts.year) return 12;
  if (year === nowParts.year) return nowParts.month;
  return 0;
}

function finalizeSeries(monthly, year, nowParts) {
  const finalized = monthly.map((entry) => ({ month: entry.month, amount: roundMoney(entry.amount) }));
  const denominator = monthsForAverage(year, nowParts);
  const eligible = denominator > 0 ? finalized.slice(0, denominator) : [];
  const total = roundMoney(eligible.reduce((sum, entry) => sum + entry.amount, 0));
  const best = eligible.reduce((winner, entry) => (!winner || entry.amount > winner.amount ? entry : winner), null);
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

function agingKey(days) {
  if (!Number.isFinite(days)) return null;
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "61+";
}

function emptyAgingCurrency() {
  return [
    { key: "0-30", label: "0–30 days", count: 0, amount: 0, workflowBlockedCount: 0, workflowBlockedAmount: 0 },
    { key: "31-60", label: "31–60 days", count: 0, amount: 0, workflowBlockedCount: 0, workflowBlockedAmount: 0 },
    { key: "61+", label: "61+ days", count: 0, amount: 0, workflowBlockedCount: 0, workflowBlockedAmount: 0 }
  ];
}

function emptyTransactionYear() {
  return {
    COP: { billed: 0, bankReceived: 0, thirdPartyGross: 0, thirdPartyPayable: 0 },
    USD: { billed: 0, bankReceived: 0, thirdPartyGross: 0, thirdPartyPayable: 0 }
  };
}

function finalizeTransactionYear(raw) {
  return Object.fromEntries(SUPPORTED_CURRENCIES.map((currency) => [currency, {
    billed: roundMoney(raw[currency].billed),
    bankReceived: roundMoney(raw[currency].bankReceived),
    thirdPartyGross: roundMoney(raw[currency].thirdPartyGross),
    thirdPartyPayable: roundMoney(raw[currency].thirdPartyPayable)
  }]));
}

export function buildOwnerFinanceProjection(
  rows,
  { now = new Date(), rawSummary = {}, rawAnalytics = {} } = {}
) {
  const records = Array.isArray(rows) ? rows : [];
  const nowParts = currentBogotaParts(now);
  const todayUtc = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day));

  const toInvoice = emptyCurrencyTotals();
  const collectible = emptyCurrencyTotals();
  const blocked = emptyCurrencyTotals();
  const receivedAllTime = emptyCurrencyTotals();
  const billedAllTime = emptyCurrencyTotals();
  const bankReceivedAllTime = emptyCurrencyTotals();
  const thirdPartyGrossAllTime = emptyCurrencyTotals();
  const thirdPartyPayableAllTime = emptyCurrencyTotals();
  const ownerGeneratedAllTime = emptyCurrencyTotals();
  const currentAging = { COP: emptyAgingCurrency(), USD: emptyAgingCurrency() };
  const currentDebtors = emptyCurrencyMap();
  const priority = [];

  let toInvoiceCount = 0;
  let collectibleCount = 0;
  let blockedCount = 0;
  let paidCount = 0;
  let missingReceivedAmountCount = 0;
  let invalidOwnerAllocationCount = 0;

  const yearSet = new Set(Array.isArray(rawAnalytics?.years) ? rawAnalytics.years : [nowParts.year]);
  yearSet.add(nowParts.year);
  const rawByYear = new Map();

  function yearBucket(year) {
    if (!rawByYear.has(year)) {
      rawByYear.set(year, {
        received: emptyCurrencySeries(),
        produced: emptyCurrencySeries(),
        topClients: emptyCurrencyMap(),
        transactions: emptyTransactionYear()
      });
    }
    return rawByYear.get(year);
  }

  for (const row of records) {
    const currency = currencyForRow(row);
    if (!currency) continue;
    const facts = ownerFacts(row);
    const workDate = parseSheetDate(recordCell(row, "Fecha trabajo"));
    const isFuture = workDate
      ? daysInUtc(workDate) > daysInUtc(todayUtc)
      : false;
    const workYm = explicitYearMonth(row, "Año", "Month Number", "Fecha trabajo");

    if (facts.gross !== null && !isFuture) addCurrency(billedAllTime, currency, facts.gross);
    if (facts.validThirdParty && !isFuture) {
      addCurrency(thirdPartyGrossAllTime, currency, facts.thirdPartyGross);
      addCurrency(ownerGeneratedAllTime, currency, facts.ownGross);
    }

    if (workYm) {
      yearSet.add(workYm.year);
      const bucket = yearBucket(workYm.year);
      if (!isFuture && facts.gross !== null) bucket.transactions[currency].billed += facts.gross;
      if (!isFuture && facts.validThirdParty && facts.ownGross !== null) {
        bucket.produced[currency][workYm.month - 1].amount += facts.ownGross;
        bucket.transactions[currency].thirdPartyGross += facts.thirdPartyGross;
      }
    }

    if (isPendingInvoice(row)) {
      if (invoiceReady(row, todayUtc)) {
        toInvoiceCount += 1;
        addCurrency(toInvoice, currency, facts.ownGross);
      }
    } else if (!isPaid(row)) {
      const eligibility = collectionEligibility(row);
      if (eligibility.blocked) {
        blockedCount += 1;
        addCurrency(blocked, currency, facts.ownGross);
      } else if (eligibility.collectible) {
        collectibleCount += 1;
        addCurrency(collectible, currency, facts.ownGross);
        const item = publicWorkItem(row, currency, facts.ownGross);
        priority.push(item);
      }

      if (eligibility.collectible || eligibility.blocked) {
        const days = numericValue(recordCell(row, "Días sin pagar"));
        const key = agingKey(days);
        if (key && facts.ownGross !== null) {
          const aging = currentAging[currency].find((entry) => entry.key === key);
          aging.count += 1;
          aging.amount += facts.ownGross;
          if (eligibility.blocked) {
            aging.workflowBlockedCount += 1;
            aging.workflowBlockedAmount += facts.ownGross;
          }
        }
        if (facts.ownGross !== null) {
          const client = cleanString(recordCell(row, "Cliente")) || "Unknown client";
          const debtor = currentDebtors[currency].get(client) || { amount: 0, count: 0, maxDays: 0 };
          debtor.amount += facts.ownGross;
          debtor.count += 1;
          debtor.maxDays = Math.max(debtor.maxDays, Number.isFinite(days) ? days : 0);
          currentDebtors[currency].set(client, debtor);
        }
      }
    }

    if (!isPaid(row)) continue;
    paidCount += 1;
    if (facts.received === null) {
      missingReceivedAmountCount += 1;
      continue;
    }

    addCurrency(bankReceivedAllTime, currency, facts.received);
    const paymentYm = explicitYearMonth(row, "Año Pago", "Month Number (pago)", "Fecha pago");
    if (paymentYm) {
      yearSet.add(paymentYm.year);
      const bucket = yearBucket(paymentYm.year);
      bucket.transactions[currency].bankReceived += facts.received;
      if (facts.thirdPartyPayable !== null) bucket.transactions[currency].thirdPartyPayable += facts.thirdPartyPayable;
    }

    if (!facts.validCashAllocation || facts.ownCashReceived === null) {
      invalidOwnerAllocationCount += 1;
      continue;
    }

    addCurrency(receivedAllTime, currency, facts.ownCashReceived);
    addCurrency(thirdPartyPayableAllTime, currency, facts.thirdPartyPayable || 0);
    if (paymentYm) {
      const bucket = yearBucket(paymentYm.year);
      bucket.received[currency][paymentYm.month - 1].amount += facts.ownCashReceived;
      const client = cleanString(recordCell(row, "Cliente")) || "Unknown client";
      bucket.topClients[currency].set(
        client,
        (bucket.topClients[currency].get(client) || 0) + facts.ownCashReceived
      );
    }
  }

  priority.sort((a, b) => {
    const daysA = a.daysUnpaid ?? -1;
    const daysB = b.daysUnpaid ?? -1;
    if (daysB !== daysA) return daysB - daysA;
    return String(a.client).localeCompare(String(b.client));
  });

  const years = [...yearSet].sort((a, b) => b - a);
  const byYear = {};
  for (const year of years) {
    const raw = yearBucket(year);
    const received = {};
    const produced = {};
    const topClients = {};
    const clientConcentration = {};
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
    }

    const rawYear = rawAnalytics?.byYear?.[String(year)] || {};
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
      paymentPerformance: rawYear.paymentPerformance || { COP: {}, USD: {} },
      fees: rawYear.fees || { COP: {}, USD: {} },
      transactionTotals: finalizeTransactionYear(raw.transactions)
    };
  }

  const receivables = { aging: {}, topDebtors: {} };
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

  const ownerSummary = {
    recordCount: rawSummary?.recordCount ?? records.length,
    toInvoice: {
      count: toInvoiceCount,
      grossByCurrency: finalizeCurrencyTotals(toInvoice)
    },
    receivables: {
      count: collectibleCount,
      netByCurrency: finalizeCurrencyTotals(collectible),
      workflowBlockedCount: blockedCount,
      workflowBlockedNetByCurrency: finalizeCurrencyTotals(blocked),
      priority: priority.slice(0, 10)
    },
    received: {
      paidCount,
      amountByCurrency: finalizeCurrencyTotals(receivedAllTime),
      bankAmountByCurrency: finalizeCurrencyTotals(bankReceivedAllTime),
      feesByCurrency: rawSummary?.received?.feesByCurrency || emptyCurrencyTotals(),
      missingReceivedAmountCount
    },
    dataQuality: {
      ...(rawSummary?.dataQuality || {}),
      invalidOwnerAllocationCount
    }
  };

  const ownerAnalytics = {
    asOf: new Date(now).toISOString(),
    timezone: "America/Bogota",
    years,
    defaultYear: years.includes(nowParts.year) ? nowParts.year : years[0],
    byYear,
    receivables,
    dataQuality: {
      ...(rawAnalytics?.dataQuality || {}),
      invalidOwnerAllocationCount
    }
  };

  return {
    summary: ownerSummary,
    analytics: ownerAnalytics,
    transactionTotals: {
      allTime: {
        billedByCurrency: finalizeCurrencyTotals(billedAllTime),
        bankReceivedByCurrency: finalizeCurrencyTotals(bankReceivedAllTime),
        thirdPartyGrossByCurrency: finalizeCurrencyTotals(thirdPartyGrossAllTime),
        thirdPartyPayableByCurrency: finalizeCurrencyTotals(thirdPartyPayableAllTime),
        ownerGeneratedByCurrency: finalizeCurrencyTotals(ownerGeneratedAllTime),
        ownerReceivedByCurrency: finalizeCurrencyTotals(receivedAllTime)
      }
    },
    contract: {
      ownerGenerated: "Valor bruto - valid Cobro terceros",
      ownerReceivable: "unpaid owner gross share",
      ownerCashReceived: "Valor Recibido - proportional third-party payable",
      rawTransactionFactsPreserved: true,
      taxTreatmentInferred: false
    }
  };
}
