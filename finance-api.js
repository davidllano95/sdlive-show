const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const FINANCE_HEADER_RANGE = "REGISTRO!A1:AA1";
const FINANCE_DATA_RANGE = "REGISTRO!A1:AA3000";
const SUPPORTED_CURRENCIES = Object.freeze(["COP", "USD"]);

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
  "NUM CONTACTO"
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
    let day = first;
    let month = second;

    if (first <= 12 && second > 12) {
      month = first;
      day = second;
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
  const workDateKey = sheetDateKey(recordCell(row, "Fecha trabajo"));
  const invoiceReady = workDateKey !== null && workDateKey < todayKey;
  return {
    workDateKey,
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
    workDate: cleanString(recordCell(row, "Fecha trabajo")),
    client: cleanString(recordCell(row, "Cliente")),
    project: cleanString(recordCell(row, "Proyecto / Show")),
    currency: currency || rawCurrency || null,
    state: cleanString(recordCell(row, "Estado"))
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

  const mismatchAt = EXPECTED_FINANCE_HEADERS.findIndex(
    (expected, index) => headers[index] !== expected
  );

  if (
    mismatchAt !== -1 ||
    headers.length !== EXPECTED_FINANCE_HEADERS.length
  ) {
    return {
      ok: false,
      columnCount: headers.length,
      mismatchAt: mismatchAt === -1
        ? Math.min(headers.length, EXPECTED_FINANCE_HEADERS.length)
        : mismatchAt
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
    dateTimeRenderOption: "FORMATTED_STRING"
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
  return {
    range: result.range,
    headers: result.values[0],
    rows: result.values.slice(1).filter(hasPersistedId)
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
  const agingMap = new Map();
  const priority = [];
  const toInvoiceQueue = [];
  const blockedQueue = [];

  let toInvoiceCount = 0;
  let receivableCount = 0;
  let paidCount = 0;
  let paidMissingReceivedCount = 0;
  let collectionBlockedCount = 0;
  let unsupportedCurrencyCount = 0;

  for (const row of records) {
    const currency = normalizedCurrency(recordCell(row, "Moneda"));
    const rawCurrency = cleanString(recordCell(row, "Moneda"));
    if (rawCurrency && !currency) unsupportedCurrencyCount += 1;

    const state = recordCell(row, "Estado");
    const netAmount = numericValue(recordCell(row, "Valor Neto"));

    if (isPendingInvoiceState(state)) {
      const eligibility = pendingInvoiceEligibility(row, todayKey);
      const grossAmount = numericValue(recordCell(row, "Valor bruto"));
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
      if (received === null) paidMissingReceivedCount += 1;
      addCurrencyAmount(receivedByCurrency, currency, received);
      addCurrencyAmount(
        paidFeesByCurrency,
        currency,
        numericValue(recordCell(row, "Impuestos / Fees"))
      );
      continue;
    }

    const eligibility = collectionEligibility(row);
    const daysUnpaid = numericValue(recordCell(row, "Días sin pagar"));
    if (eligibility.workflowBlocked) {
      collectionBlockedCount += 1;
      addCurrencyAmount(blockedNetByCurrency, currency, netAmount);
      blockedQueue.push({
        ...publicWorkItem(row, currency, rawCurrency),
        netAmount: netAmount === null ? null : roundMoney(netAmount),
        invoiceSentDate: cleanString(recordCell(row, "Fecha cuenta enviada")),
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
      workDate: cleanString(recordCell(row, "Fecha trabajo")),
      client: cleanString(recordCell(row, "Cliente")),
      project: cleanString(recordCell(row, "Proyecto / Show")),
      currency: currency || rawCurrency || null,
      netAmount: netAmount === null ? null : roundMoney(netAmount),
      state: cleanString(state),
      invoiceSentDate: cleanString(recordCell(row, "Fecha cuenta enviada")),
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
    const dateA = sheetDateKey(a.workDate) ?? Number.MAX_SAFE_INTEGER;
    const dateB = sheetDateKey(b.workDate) ?? Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.client).localeCompare(String(b.client));
  });

  blockedQueue.sort((a, b) => {
    const daysA = a.daysUnpaid ?? -1;
    const daysB = b.daysUnpaid ?? -1;
    if (daysB !== daysA) return daysB - daysA;
    const dateA = sheetDateKey(a.workDate) ?? Number.MAX_SAFE_INTEGER;
    const dateB = sheetDateKey(b.workDate) ?? Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.client).localeCompare(String(b.client));
  });

  const aging = [...agingMap.values()]
    .sort((a, b) => b.maxDays - a.maxDays || a.bucket.localeCompare(b.bucket))
    .map(({ maxDays, ...entry }) => ({
      ...entry,
      byCurrency: finalizedCurrencyTotals(entry.byCurrency)
    }));

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
    workQueues: {
      toInvoice: toInvoiceQueue,
      collectible: priority,
      blocked: blockedQueue
    },
    received: {
      paidCount,
      amountByCurrency: finalizedCurrencyTotals(receivedByCurrency),
      feesByCurrency: finalizedCurrencyTotals(paidFeesByCurrency),
      missingReceivedAmountCount: paidMissingReceivedCount
    },
    dataQuality: {
      unsupportedCurrencyCount
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
