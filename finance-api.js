const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const FINANCE_HEADER_RANGE = "REGISTRO!A1:AC1";
const FINANCE_DATA_RANGE = "REGISTRO!A1:AC3000";
const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);
const LIVENTX_SIGNING_REVIEW_DAY = 20;

export const EXPECTED_FINANCE_HEADERS = Object.freeze([
  "Fecha trabajo",
  "Mes",
  "Año",
  "Cliente",
  "Proyecto / Show",
  "Rol",
  "Moneda",
  "Valor bruto",
  "Impuestos / Fees",
  "Valor Neto",
  "Estado",
  "Fecha cuenta enviada",
  "Fecha evaluación",
  "Fecha firma",
  "Fecha pago",
  "Método de pago",
  "Días sin pagar",
  "Notas",
  "Month Number",
  "Año Pago",
  "Month Number (pago)",
  "Mes de pago",
  "Rango Aging",
  "ID",
  "Valor Recibido",
  "MES PAGO KEY",
  "NUM CONTACTO",
  "Fecha fin",
  "Cobro terceros"
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

function requiredEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`Missing finance configuration: ${name}`);
  return value;
}

function cleanString(value) {
  return value === undefined || value === null
    ? ""
    : String(value).trim();
}

function normalizeHeader(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function financeFieldIndex(headers) {
  if (!Array.isArray(headers)) return null;

  const byNormalizedHeader = new Map();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !byNormalizedHeader.has(normalized)) {
      byNormalizedHeader.set(normalized, index);
    }
  });

  return Object.fromEntries(
    EXPECTED_FINANCE_HEADERS.map((field) => [
      field,
      byNormalizedHeader.get(normalizeHeader(field))
    ])
  );
}

export function normalizeFinanceRows(headers, rows) {
  const fieldIndex = financeFieldIndex(headers);
  if (!fieldIndex || !Array.isArray(rows)) return [];

  return rows
    .map((row) => EXPECTED_FINANCE_HEADERS.map((field) => {
      const index = fieldIndex[field];
      return Number.isInteger(index) ? row?.[index] : "";
    }))
    .filter(hasPersistedId);
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

function finalizedCurrencyTotals(totals) {
  return {
    COP: roundMoney(totals?.COP || 0),
    USD: roundMoney(totals?.USD || 0)
  };
}

function normalizedCurrency(value) {
  const currency = cleanString(value).toUpperCase();
  return SUPPORTED_CURRENCIES.includes(currency) ? currency : null;
}

function addCurrencyAmount(totals, currency, amount) {
  if (!currency || amount === null) return;
  totals[currency] += amount;
}

function recordCell(row, field) {
  return row?.[FIELD_INDEX[field]];
}

function hasPersistedId(row) {
  return Boolean(cleanString(recordCell(row, "ID")));
}

function isPaidState(value) {
  return cleanString(value).toLowerCase() === "pagado";
}

function isPendingInvoiceState(value) {
  return cleanString(value).toLowerCase() === "pendiente envio";
}

function calculateThirdPartyAllocation({ gross, received, thirdPartyGross }) {
  if (
    gross === null ||
    received === null ||
    thirdPartyGross === null ||
    gross <= 0 ||
    received < 0 ||
    received > gross ||
    thirdPartyGross < 0 ||
    thirdPartyGross > gross
  ) {
    return null;
  }

  const retentionRate = (gross - received) / gross;
  const thirdPartyRetention = thirdPartyGross * retentionRate;
  const thirdPartyPayable = thirdPartyGross - thirdPartyRetention;
  return {
    gross: roundMoney(thirdPartyGross),
    retention: roundMoney(thirdPartyRetention),
    payable: roundMoney(thirdPartyPayable)
  };
}

function dateKey(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return year * 10000 + month * 100 + day;
}

function sheetDateKey(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + Math.round(value * 86400000));
    if (Number.isNaN(date.getTime())) return null;
    return dateKey(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  const text = cleanString(value);
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return dateKey(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    let month = first;
    let day = second;

    // Finance historically received Google Sheets formatted strings in M/D/YYYY.
    // Only flip to D/M when the first component cannot be a month.
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }

    return dateKey(year, month, day);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateKey(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate()
  );
}

function displaySheetDate(value) {
  const key = sheetDateKey(value);
  if (!Number.isInteger(key)) return cleanString(value);
  const year = Math.floor(key / 10000);
  const month = Math.floor((key % 10000) / 100);
  const day = key % 100;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateKeyUtcDay(key) {
  if (!Number.isInteger(key)) return null;
  const year = Math.floor(key / 10000);
  const month = Math.floor((key % 10000) / 100);
  const day = key % 100;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 86400000);
}

function currentBogotaDateKey(now) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return dateKey(parts.year, parts.month, parts.day);
}

function pendingInvoiceEligibility(row, todayKey) {
  const startDateKey = sheetDateKey(recordCell(row, "Fecha trabajo"));
  const endDateKey = sheetDateKey(recordCell(row, "Fecha fin"));
  const billingDateKey = endDateKey ?? startDateKey;
  const invoiceReady = billingDateKey !== null && billingDateKey < todayKey;
  return {
    workDateKey: billingDateKey,
    startDateKey,
    endDateKey,
    usesEndDate: endDateKey !== null,
    invoiceReady,
    workflowBlocked: !invoiceReady
  };
}

function collectionEligibility(row) {
  const state = recordCell(row, "Estado");
  const sentAt = cleanString(recordCell(row, "Fecha cuenta enviada"));

  if (isPaidState(state) || isPendingInvoiceState(state) || !sentAt) {
    return { collectible: false, workflowBlocked: false };
  }

  const client = cleanString(recordCell(row, "Cliente"));
  if (client !== "LiventX") {
    return { collectible: true, workflowBlocked: false };
  }

  const evaluatedAt = cleanString(recordCell(row, "Fecha evaluación"));
  const signedAt = cleanString(recordCell(row, "Fecha firma"));
  const ready = Boolean(evaluatedAt && signedAt);

  return {
    collectible: ready,
    workflowBlocked: !ready
  };
}

function publicWorkItem(row, currency, rawCurrency) {
  return {
    workDate: displaySheetDate(recordCell(row, "Fecha trabajo")),
    endDate: displaySheetDate(recordCell(row, "Fecha fin")),
    client: cleanString(recordCell(row, "Cliente")),
    project: cleanString(recordCell(row, "Proyecto / Show")),
    currency: currency || rawCurrency || null,
    state: cleanString(recordCell(row, "Estado"))
  };
}

function publicQualityItem(row, currency, rawCurrency) {
  const grossAmount = numericValue(recordCell(row, "Valor bruto"));
  const netAmount = numericValue(recordCell(row, "Valor Neto"));
  const receivedAmount = numericValue(recordCell(row, "Valor Recibido"));
  const daysUnpaid = numericValue(recordCell(row, "Días sin pagar"));

  return {
    ...publicWorkItem(row, currency, rawCurrency),
    grossAmount: grossAmount === null ? null : roundMoney(grossAmount),
    netAmount: netAmount === null ? null : roundMoney(netAmount),
    receivedAmount: receivedAmount === null ? null : roundMoney(receivedAmount),
    invoiceSentDate: displaySheetDate(recordCell(row, "Fecha cuenta enviada")),
    paymentDate: displaySheetDate(recordCell(row, "Fecha pago")),
    daysUnpaid
  };
}

function blockedReasonCodes(row, { todayKey, pendingEligibility = null } = {}) {
  if (pendingEligibility) {
    if (pendingEligibility.workDateKey === null) return ["invalid_work_date"];
    if (pendingEligibility.workDateKey === todayKey) return ["work_date_today"];
    if (pendingEligibility.workDateKey > todayKey) return ["work_date_future"];
    return ["invoice_not_ready"];
  }

  const reasons = [];
  if (cleanString(recordCell(row, "Cliente")) === "LiventX") {
    if (!cleanString(recordCell(row, "Fecha evaluación"))) reasons.push("missing_evaluation");
    if (!cleanString(recordCell(row, "Fecha firma"))) reasons.push("missing_signature");
  }
  return reasons.length ? reasons : ["workflow_incomplete"];
}

export function financeHealthDiagnostic(error) {
  const message = String(error?.message || error || "");

  const missingMatch = message.match(/^Missing finance configuration: ([A-Z0-9_]+)$/);
  if (missingMatch) {
    return {
      stage: "configuration",
      code: `missing_${missingMatch[1]}`
    };
  }

  const oauthStatusMatch = message.match(/^Google OAuth token exchange failed with status (\d+)$/);
  if (oauthStatusMatch) {
    return {
      stage: "oauth_exchange",
      code: `oauth_http_${oauthStatusMatch[1]}`
    };
  }

  if (message === "Google OAuth token exchange returned no access token") {
    return {
      stage: "oauth_exchange",
      code: "oauth_no_access_token"
    };
  }

  const sheetsStatusMatch = message.match(/^Google Sheets read failed with status (\d+)$/);
  if (sheetsStatusMatch) {
    return {
      stage: "sheets_read",
      code: `sheets_http_${sheetsStatusMatch[1]}`
    };
  }

  if (message === "Google Sheets returned no REGISTRO header row") {
    return {
      stage: "sheets_read",
      code: "sheets_no_header_row"
    };
  }

  return {
    stage: "unknown",
    code: "finance_unavailable"
  };
}

export function validateFinanceHeaders(headers) {
  if (!Array.isArray(headers)) {
    return {
      ok: false,
      columnCount: 0,
      mismatchAt: 0
    };
  }

  const fieldIndex = financeFieldIndex(headers);
  const mismatchAt = EXPECTED_FINANCE_HEADERS.findIndex(
    (field) => !Number.isInteger(fieldIndex?.[field])
  );

  if (mismatchAt !== -1) {
    return {
      ok: false,
      columnCount: headers.length,
      mismatchAt
    };
  }

  return {
    ok: true,
    columnCount: headers.length,
    mismatchAt: null
  };
}

export async function fetchGoogleAccessToken(env, fetchImpl = fetch) {
  const clientId = requiredEnv(env, "GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requiredEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = requiredEnv(env, "GOOGLE_OAUTH_REFRESH_TOKEN");

  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const accessToken = String(data?.access_token || "").trim();

  if (!accessToken) {
    throw new Error("Google OAuth token exchange returned no access token");
  }

  return accessToken;
}

async function readFinanceValues(env, range, fetchImpl = fetch) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const encodedRange = encodeURIComponent(range);
  const spreadsheet = encodeURIComponent(spreadsheetId);
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
    throw new Error(`Google Sheets read failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const values = data?.values;

  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    throw new Error("Google Sheets returned no REGISTRO header row");
  }

  return {
    range: data?.range || range,
    values
  };
}

export async function readFinanceHeader(env, fetchImpl = fetch) {
  const result = await readFinanceValues(env, FINANCE_HEADER_RANGE, fetchImpl);
  return {
    range: result.range,
    headers: result.values[0]
  };
}

export async function readFinanceRows(env, fetchImpl = fetch) {
  const result = await readFinanceValues(env, FINANCE_DATA_RANGE, fetchImpl);
  const headers = result.values[0];
  return {
    range: result.range,
    headers,
    rows: normalizeFinanceRows(headers, result.values.slice(1))
  };
}

export function buildFinanceSummary(rows, { now = new Date() } = {}) {
  const records = Array.isArray(rows) ? rows.filter(hasPersistedId) : [];
  const todayKey = currentBogotaDateKey(now);
  const toInvoiceGrossByCurrency = emptyCurrencyTotals();
  const receivableNetByCurrency = emptyCurrencyTotals();
  const blockedNetByCurrency = emptyCurrencyTotals();
  const receivedByCurrency = emptyCurrencyTotals();
  const paidFeesByCurrency = emptyCurrencyTotals();
  const thirdPartyCommittedGrossByCurrency = emptyCurrencyTotals();
  const thirdPartyCollectedGrossByCurrency = emptyCurrencyTotals();
  const thirdPartyPendingCollectionGrossByCurrency = emptyCurrencyTotals();
  const thirdPartyPayableByCurrency = emptyCurrencyTotals();
  const agingMap = new Map();
  const priority = [];
  const toInvoiceQueue = [];
  const blockedQueue = [];
  const liventxReadyToSignQueue = [];
  const qualityQueues = {
    missingReceivedAmount: [],
    unsupportedCurrency: [],
    missingAging: [],
    missingPaymentDate: [],
    invalidPaymentDuration: []
  };

  let toInvoiceCount = 0;
  let receivableCount = 0;
  let paidCount = 0;
  let paidMissingReceivedCount = 0;
  let collectionBlockedCount = 0;
  let unsupportedCurrencyCount = 0;
  let thirdPartyCommitmentCount = 0;
  let thirdPartyPaymentCount = 0;
  let invalidThirdPartyAllocationCount = 0;

  for (const row of records) {
    const currency = normalizedCurrency(recordCell(row, "Moneda"));
    const rawCurrency = cleanString(recordCell(row, "Moneda"));
    if (rawCurrency && !currency) {
      unsupportedCurrencyCount += 1;
      qualityQueues.unsupportedCurrency.push(publicQualityItem(row, currency, rawCurrency));
    }

    const state = recordCell(row, "Estado");
    const netAmount = numericValue(recordCell(row, "Valor Neto"));
    const grossAmount = numericValue(recordCell(row, "Valor bruto"));
    const thirdPartyGross = numericValue(recordCell(row, "Cobro terceros"));
    const hasThirdPartyValue = thirdPartyGross !== null && thirdPartyGross !== 0;
    let validThirdPartyCommitment = false;

    if (hasThirdPartyValue) {
      if (
        thirdPartyGross > 0 &&
        grossAmount !== null &&
        grossAmount > 0 &&
        thirdPartyGross <= grossAmount
      ) {
        validThirdPartyCommitment = true;
        thirdPartyCommitmentCount += 1;
        addCurrencyAmount(thirdPartyCommittedGrossByCurrency, currency, thirdPartyGross);
        if (!isPaidState(state)) {
          addCurrencyAmount(thirdPartyPendingCollectionGrossByCurrency, currency, thirdPartyGross);
        }
      } else {
        invalidThirdPartyAllocationCount += 1;
      }
    }

    const isLiventX = cleanString(recordCell(row, "Cliente")).toLowerCase() === "liventx";
    const evaluatedAt = cleanString(recordCell(row, "Fecha evaluación"));
    const signedAt = cleanString(recordCell(row, "Fecha firma"));

    if (
      isLiventX &&
      !isPaidState(state) &&
      !isPendingInvoiceState(state) &&
      evaluatedAt &&
      !signedAt
    ) {
      liventxReadyToSignQueue.push({
        ...publicWorkItem(row, currency, rawCurrency),
        netAmount: netAmount === null ? null : roundMoney(netAmount),
        invoiceSentDate: displaySheetDate(recordCell(row, "Fecha cuenta enviada")),
        evaluationDate: displaySheetDate(recordCell(row, "Fecha evaluación")),
        reasonCodes: ["missing_signature"],
        action: "sign_invoice"
      });
    }

    if (isPendingInvoiceState(state)) {
      const eligibility = pendingInvoiceEligibility(row, todayKey);
      if (eligibility.invoiceReady) {
        toInvoiceCount += 1;
        addCurrencyAmount(toInvoiceGrossByCurrency, currency, grossAmount);
        toInvoiceQueue.push({
          ...publicWorkItem(row, currency, rawCurrency),
          grossAmount: grossAmount === null ? null : roundMoney(grossAmount),
          netAmount: netAmount === null ? null : roundMoney(netAmount),
          action: "send_invoice"
        });
      } else {
        collectionBlockedCount += 1;
        addCurrencyAmount(blockedNetByCurrency, currency, netAmount);
        blockedQueue.push({
          ...publicWorkItem(row, currency, rawCurrency),
          netAmount: netAmount === null ? null : roundMoney(netAmount),
          invoiceSentDate: "",
          daysUnpaid: null,
          reasonCodes: blockedReasonCodes(row, {
            todayKey,
            pendingEligibility: eligibility
          })
        });
      }
      continue;
    }

    if (isPaidState(state)) {
      paidCount += 1;
      const received = numericValue(recordCell(row, "Valor Recibido"));
      if (received === null) {
        paidMissingReceivedCount += 1;
        qualityQueues.missingReceivedAmount.push(publicQualityItem(row, currency, rawCurrency));
      }

      if (validThirdPartyCommitment) {
        const allocation = calculateThirdPartyAllocation({
          gross: grossAmount,
          received,
          thirdPartyGross
        });
        if (allocation) {
          thirdPartyPaymentCount += 1;
          addCurrencyAmount(thirdPartyCollectedGrossByCurrency, currency, allocation.gross);
          addCurrencyAmount(thirdPartyPayableByCurrency, currency, allocation.payable);
        } else {
          invalidThirdPartyAllocationCount += 1;
        }
      }

      const paymentDateKey = sheetDateKey(recordCell(row, "Fecha pago"));
      if (paymentDateKey === null) {
        qualityQueues.missingPaymentDate.push(publicQualityItem(row, currency, rawCurrency));
      } else {
        const sentDateKey = sheetDateKey(recordCell(row, "Fecha cuenta enviada"));
        const sentDay = dateKeyUtcDay(sentDateKey);
        const paidDay = dateKeyUtcDay(paymentDateKey);
        if (sentDay !== null && paidDay !== null) {
          const paymentDurationDays = paidDay - sentDay;
          if (paymentDurationDays < 0 || paymentDurationDays >= 3650) {
            qualityQueues.invalidPaymentDuration.push({
              ...publicQualityItem(row, currency, rawCurrency),
              paymentDurationDays
            });
          }
        }
      }

      addCurrencyAmount(receivedByCurrency, currency, received);
      addCurrencyAmount(
        paidFeesByCurrency,
        currency,
        numericValue(recordCell(row, "Impuestos / Fees"))
      );
      continue;
    }

    const sentAt = cleanString(recordCell(row, "Fecha cuenta enviada"));
    const daysUnpaid = numericValue(recordCell(row, "Días sin pagar"));
    if (sentAt && daysUnpaid === null) {
      qualityQueues.missingAging.push(publicQualityItem(row, currency, rawCurrency));
    }

    const eligibility = collectionEligibility(row);
    if (eligibility.workflowBlocked) {
      collectionBlockedCount += 1;
      addCurrencyAmount(blockedNetByCurrency, currency, netAmount);
      blockedQueue.push({
        ...publicWorkItem(row, currency, rawCurrency),
        netAmount: netAmount === null ? null : roundMoney(netAmount),
        invoiceSentDate: displaySheetDate(recordCell(row, "Fecha cuenta enviada")),
        daysUnpaid,
        reasonCodes: blockedReasonCodes(row, { todayKey })
      });
    }
    if (!eligibility.collectible) continue;

    receivableCount += 1;
    addCurrencyAmount(receivableNetByCurrency, currency, netAmount);

    const agingBucket = cleanString(recordCell(row, "Rango Aging")) || "Sin rango";
    const aging = agingMap.get(agingBucket) || {
      bucket: agingBucket,
      count: 0,
      byCurrency: emptyCurrencyTotals(),
      maxDays: -1
    };
    aging.count += 1;
    addCurrencyAmount(aging.byCurrency, currency, netAmount);
    if (daysUnpaid !== null) aging.maxDays = Math.max(aging.maxDays, daysUnpaid);
    agingMap.set(agingBucket, aging);

    priority.push({
      workDate: displaySheetDate(recordCell(row, "Fecha trabajo")),
      client: cleanString(recordCell(row, "Cliente")),
      project: cleanString(recordCell(row, "Proyecto / Show")),
      currency: currency || rawCurrency || null,
      netAmount: netAmount === null ? null : roundMoney(netAmount),
      state: cleanString(state),
      invoiceSentDate: displaySheetDate(recordCell(row, "Fecha cuenta enviada")),
      daysUnpaid,
      aging: agingBucket
    });
  }

  priority.sort((a, b) => {
    const daysA = a.daysUnpaid ?? -1;
    const daysB = b.daysUnpaid ?? -1;
    if (daysB !== daysA) return daysB - daysA;
    return String(a.client).localeCompare(String(b.client));
  });

  toInvoiceQueue.sort((a, b) => {
    const dateA = sheetDateKey(a.endDate) ?? sheetDateKey(a.workDate) ?? Number.MAX_SAFE_INTEGER;
    const dateB = sheetDateKey(b.endDate) ?? sheetDateKey(b.workDate) ?? Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.client).localeCompare(String(b.client));
  });

  blockedQueue.sort((a, b) => {
    const daysA = a.daysUnpaid ?? -1;
    const daysB = b.daysUnpaid ?? -1;
    if (daysB !== daysA) return daysB - daysA;
    const dateA = sheetDateKey(a.endDate) ?? sheetDateKey(a.workDate) ?? Number.MAX_SAFE_INTEGER;
    const dateB = sheetDateKey(b.endDate) ?? sheetDateKey(b.workDate) ?? Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.client).localeCompare(String(b.client));
  });

  liventxReadyToSignQueue.sort((a, b) => {
    const evaluationA = sheetDateKey(a.evaluationDate) ?? Number.MAX_SAFE_INTEGER;
    const evaluationB = sheetDateKey(b.evaluationDate) ?? Number.MAX_SAFE_INTEGER;
    if (evaluationA !== evaluationB) return evaluationA - evaluationB;
    const dateA = sheetDateKey(a.endDate) ?? sheetDateKey(a.workDate) ?? Number.MAX_SAFE_INTEGER;
    const dateB = sheetDateKey(b.endDate) ?? sheetDateKey(b.workDate) ?? Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.project).localeCompare(String(b.project));
  });

  Object.values(qualityQueues).forEach((queue) => {
    queue.sort((a, b) => {
      const dateA = sheetDateKey(a.workDate) ?? Number.MAX_SAFE_INTEGER;
      const dateB = sheetDateKey(b.workDate) ?? Number.MAX_SAFE_INTEGER;
      if (dateA !== dateB) return dateA - dateB;
      return String(a.client).localeCompare(String(b.client));
    });
  });

  const aging = [...agingMap.values()]
    .sort((a, b) => b.maxDays - a.maxDays || a.bucket.localeCompare(b.bucket))
    .map(({ maxDays, ...entry }) => ({
      ...entry,
      byCurrency: finalizedCurrencyTotals(entry.byCurrency)
    }));

  const receivedTotals = finalizedCurrencyTotals(receivedByCurrency);
  const thirdPartyCommittedGrossTotals = finalizedCurrencyTotals(thirdPartyCommittedGrossByCurrency);
  const thirdPartyCollectedGrossTotals = finalizedCurrencyTotals(thirdPartyCollectedGrossByCurrency);
  const thirdPartyPendingCollectionGrossTotals = finalizedCurrencyTotals(thirdPartyPendingCollectionGrossByCurrency);
  const thirdPartyPayableTotals = finalizedCurrencyTotals(thirdPartyPayableByCurrency);
  const ownCashReceivedByCurrency = {
    COP: roundMoney(receivedTotals.COP - thirdPartyPayableTotals.COP),
    USD: roundMoney(receivedTotals.USD - thirdPartyPayableTotals.USD)
  };

  return {
    recordCount: records.length,
    toInvoice: {
      count: toInvoiceCount,
      grossByCurrency: finalizedCurrencyTotals(toInvoiceGrossByCurrency)
    },
    receivables: {
      count: receivableCount,
      netByCurrency: finalizedCurrencyTotals(receivableNetByCurrency),
      workflowBlockedCount: collectionBlockedCount,
      workflowBlockedNetByCurrency: finalizedCurrencyTotals(blockedNetByCurrency),
      aging,
      priority: priority.slice(0, 10)
    },
    liventxSigningReview: {
      reviewDay: LIVENTX_SIGNING_REVIEW_DAY,
      active: (todayKey % 100) >= LIVENTX_SIGNING_REVIEW_DAY,
      count: liventxReadyToSignQueue.length
    },
    workQueues: {
      toInvoice: toInvoiceQueue,
      collectible: priority,
      blocked: blockedQueue,
      liventxReadyToSign: liventxReadyToSignQueue
    },
    received: {
      paidCount,
      amountByCurrency: receivedTotals,
      feesByCurrency: finalizedCurrencyTotals(paidFeesByCurrency),
      missingReceivedAmountCount: paidMissingReceivedCount
    },
    thirdParty: {
      commitmentCount: thirdPartyCommitmentCount,
      paymentCount: thirdPartyPaymentCount,
      committedGrossByCurrency: thirdPartyCommittedGrossTotals,
      grossByCurrency: thirdPartyCollectedGrossTotals,
      collectedGrossByCurrency: thirdPartyCollectedGrossTotals,
      pendingCollectionGrossByCurrency: thirdPartyPendingCollectionGrossTotals,
      payableByCurrency: thirdPartyPayableTotals,
      ownCashReceivedByCurrency,
      invalidAllocationCount: invalidThirdPartyAllocationCount
    },
    dataQuality: {
      paidMissingReceivedAmountCount: qualityQueues.missingReceivedAmount.length,
      unsupportedCurrencyCount,
      unpaidMissingAgingCount: qualityQueues.missingAging.length,
      paidMissingPaymentDateCount: qualityQueues.missingPaymentDate.length,
      invalidPaymentDurationCount: qualityQueues.invalidPaymentDuration.length,
      invalidThirdPartyAllocationCount,
      queues: qualityQueues
    }
  };
}

function financeUnavailableResponse(error) {
  console.error(
    "[SD.Live] Finance API request failed",
    String(error?.message || error)
  );

  return jsonResponse({
    ok: false,
    source: "google-sheets",
    access: "read-only",
    error: "Finance source unavailable",
    ...financeHealthDiagnostic(error)
  }, 503);
}

function schemaMismatchResponse(schema) {
  return jsonResponse({
    ok: false,
    source: "google-sheets",
    access: "read-only",
    stage: "schema_validation",
    code: "schema_mismatch",
    schema
  }, 503);
}

export async function handleFinanceApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;

  if (!path.startsWith("/api/admin/finance")) return null;

  if (typeof verifyAdmin !== "function") {
    return jsonResponse({ ok: false, error: "Admin verification unavailable" }, 503);
  }

  const user = await verifyAdmin(request, env);
  if (!user) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 403);
  }

  if (
    path !== "/api/admin/finance/health" &&
    path !== "/api/admin/finance/summary"
  ) {
    return jsonResponse({ ok: false, error: "Finance API route not found" }, 404);
  }

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  if (path === "/api/admin/finance/health") {
    try {
      const result = await readFinanceHeader(env, fetchImpl);
      const schema = validateFinanceHeaders(result.headers);

      if (!schema.ok) return schemaMismatchResponse(schema);

      return jsonResponse({
        ok: true,
        source: "google-sheets",
        access: "read-only",
        range: result.range,
        schema
      });
    } catch (error) {
      return financeUnavailableResponse(error);
    }
  }

  try {
    const result = await readFinanceRows(env, fetchImpl);
    const schema = validateFinanceHeaders(result.headers);

    if (!schema.ok) return schemaMismatchResponse(schema);

    return jsonResponse({
      ok: true,
      source: "google-sheets",
      access: "read-only",
      range: result.range,
      schema,
      summary: buildFinanceSummary(result.rows)
    });
  } catch (error) {
    return financeUnavailableResponse(error);
  }
}