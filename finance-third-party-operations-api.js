import {
  EXPECTED_FINANCE_HEADERS,
  fetchGoogleAccessToken,
  readFinanceRows,
  validateFinanceHeaders
} from "./finance-api.js";
import {
  EXPECTED_THIRD_PARTY_HEADERS,
  validateThirdPartyHeaders
} from "./finance-third-party-dashboard-api.js";

const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const THIRD_PARTY_RANGE = "PAGO_TERCEROS!A1:N3000";
const OPERATIONS_PATH = "/api/admin/finance/third-party/obligations";
const MARK_PAID_PATH = "/api/admin/finance/third-party/mark-paid";
const SUPPORTED_CURRENCIES = new Set(["COP", "USD"]);

const FINANCE_INDEX = Object.freeze(
  Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]))
);
const THIRD_INDEX = Object.freeze(
  Object.fromEntries(EXPECTED_THIRD_PARTY_HEADERS.map((header, index) => [header, index]))
);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function number(value) {
  if (value === "" || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.round((parsed + Number.EPSILON) * 100) / 100
    : 0;
}

function financeCell(row, field) {
  return row?.[FINANCE_INDEX[field]];
}

function thirdCell(row, field) {
  return row?.[THIRD_INDEX[field]];
}

function currencyOf(row) {
  const currency = clean(financeCell(row, "Moneda")).toUpperCase();
  return SUPPORTED_CURRENCIES.has(currency) ? currency : null;
}

function allocationFactor(gross, received) {
  if (
    gross === null || gross <= 0 ||
    received === null || received < 0 || received > gross
  ) return null;
  return received / gross;
}

function isPaid(row) {
  return clean(financeCell(row, "Estado")).toLowerCase() === "pagado";
}

function workflowReadyForCollection(row) {
  const state = clean(financeCell(row, "Estado")).toLowerCase();
  const sent = clean(financeCell(row, "Fecha cuenta enviada"));
  if (state === "pagado" || state === "pendiente envio" || !sent) return false;

  if (clean(financeCell(row, "Cliente")).toLowerCase() !== "liventx") return true;
  return Boolean(
    clean(financeCell(row, "Fecha evaluación")) &&
    clean(financeCell(row, "Fecha firma"))
  );
}

function opaqueRef(rowNumber, id, workId) {
  const input = `${rowNumber}|${clean(id)}|${clean(workId)}`;
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `tp_${hash.toString(16).padStart(16, "0")}`;
}

function bogotaDate(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function readThirdPartyRows(env, fetchImpl = fetch) {
  const spreadsheetId = clean(env?.GOOGLE_FINANCE_SPREADSHEET_ID);
  if (!spreadsheetId) throw new Error("Missing finance configuration: GOOGLE_FINANCE_SPREADSHEET_ID");

  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER"
  });
  const url = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(THIRD_PARTY_RANGE)}?${params}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });
  if (!response.ok) throw new Error(`Google Sheets PAGO_TERCEROS read failed with status ${response.status}`);

  const data = await response.json().catch(() => null);
  const values = data?.values;
  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    throw new Error("Google Sheets returned no PAGO_TERCEROS header row");
  }

  return {
    headers: values[0],
    rows: values.slice(1).map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter((entry) => clean(thirdCell(entry.row, "ID tercero")))
  };
}

function buildOperationalObligations(financeRows, thirdEntries) {
  const parents = new Map();
  const detailByWork = new Map();
  const items = [];

  for (const row of Array.isArray(financeRows) ? financeRows : []) {
    const id = clean(financeCell(row, "ID"));
    const currency = currencyOf(row);
    const gross = number(financeCell(row, "Valor bruto"));
    const thirdGross = number(financeCell(row, "Cobro terceros"));
    if (!id || !currency || gross === null || gross <= 0 || thirdGross === null || thirdGross <= 0 || thirdGross > gross) continue;
    parents.set(id, {
      row,
      currency,
      gross,
      received: number(financeCell(row, "Valor Recibido")),
      thirdGross
    });
    detailByWork.set(id, 0);
  }

  for (const entry of Array.isArray(thirdEntries) ? thirdEntries : []) {
    const row = entry.row;
    const workId = clean(thirdCell(row, "Trabajo ID"));
    const parent = parents.get(workId);
    if (!parent) continue;

    const gross = number(thirdCell(row, "Bruto tercero"));
    const paid = number(thirdCell(row, "Valor pagado tercero")) ?? 0;
    if (gross === null || gross <= 0) continue;
    detailByWork.set(workId, (detailByWork.get(workId) || 0) + gross);

    const factor = allocationFactor(parent.gross, parent.received);
    const base = factor === null ? gross : gross * factor;
    const debt = base - paid;
    if (!(debt > 0)) continue;

    let status = null;
    if (isPaid(parent.row) && factor !== null) status = "ready_to_pay";
    else if (workflowReadyForCollection(parent.row)) status = "waiting_client";
    if (!status) continue;

    items.push({
      ref: opaqueRef(entry.rowNumber, thirdCell(row, "ID tercero"), workId),
      name: clean(thirdCell(row, "Tercero")) || "Sin nombre",
      project: clean(financeCell(parent.row, "Proyecto / Show")),
      client: clean(financeCell(parent.row, "Cliente")),
      currency: parent.currency,
      amount: money(debt),
      status,
      canMarkPaid: status === "ready_to_pay",
      _rowNumber: entry.rowNumber,
      _currentPaid: paid,
      _id: clean(thirdCell(row, "ID tercero"))
    });
  }

  for (const [workId, parent] of parents.entries()) {
    const detailed = detailByWork.get(workId) || 0;
    const unassignedGross = parent.thirdGross > detailed ? parent.thirdGross - detailed : 0;
    if (!(unassignedGross > 0)) continue;

    const factor = allocationFactor(parent.gross, parent.received);
    const debt = unassignedGross * (factor === null ? 1 : factor);
    if (!(debt > 0)) continue;

    let status = null;
    if (isPaid(parent.row) && factor !== null) status = "ready_to_pay";
    else if (workflowReadyForCollection(parent.row)) status = "waiting_client";
    if (!status) continue;

    items.push({
      ref: null,
      name: "Sin desglose",
      project: clean(financeCell(parent.row, "Proyecto / Show")),
      client: clean(financeCell(parent.row, "Cliente")),
      currency: parent.currency,
      amount: money(debt),
      status,
      canMarkPaid: false,
      _rowNumber: null,
      _currentPaid: 0,
      _id: null
    });
  }

  items.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ready_to_pay" ? -1 : 1;
    if (a.currency !== b.currency) return a.currency.localeCompare(b.currency);
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.name.localeCompare(b.name, "es");
  });

  return items;
}

function publicOperations(items) {
  const visible = items.map(({ _rowNumber, _currentPaid, _id, ...item }) => item);
  const totals = {
    waitingClient: { count: 0, COP: 0, USD: 0 },
    readyToPay: { count: 0, COP: 0, USD: 0 }
  };

  for (const item of visible) {
    const bucket = item.status === "ready_to_pay" ? totals.readyToPay : totals.waitingClient;
    bucket.count += 1;
    bucket[item.currency] += item.amount;
  }

  totals.waitingClient.COP = money(totals.waitingClient.COP);
  totals.waitingClient.USD = money(totals.waitingClient.USD);
  totals.readyToPay.COP = money(totals.readyToPay.COP);
  totals.readyToPay.USD = money(totals.readyToPay.USD);

  return {
    items: visible,
    totals,
    count: visible.length
  };
}

async function snapshot(env, fetchImpl) {
  const [finance, thirdParty] = await Promise.all([
    readFinanceRows(env, fetchImpl),
    readThirdPartyRows(env, fetchImpl)
  ]);

  const financeSchema = validateFinanceHeaders(finance.headers);
  const thirdPartySchema = validateThirdPartyHeaders(thirdParty.headers);
  if (!financeSchema.ok) throw new Error("Finance schema mismatch");
  if (!thirdPartySchema.ok) throw new Error("PAGO_TERCEROS schema mismatch");

  return {
    finance,
    thirdParty,
    items: buildOperationalObligations(finance.rows, thirdParty.rows)
  };
}

async function writePayment(env, rowNumber, paidAmount, date, fetchImpl) {
  const spreadsheetId = clean(env?.GOOGLE_FINANCE_SPREADSHEET_ID);
  if (!spreadsheetId) throw new Error("Missing finance configuration: GOOGLE_FINANCE_SPREADSHEET_ID");
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const range = `PAGO_TERCEROS!J${rowNumber}:K${rowNumber}`;
  const params = new URLSearchParams({ valueInputOption: "USER_ENTERED" });
  const url = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?${params}`;
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values: [[money(paidAmount), date]]
    })
  });
  if (!response.ok) throw new Error(`Google Sheets PAGO_TERCEROS write failed with status ${response.status}`);
  return response.json().catch(() => ({}));
}

export async function handleFinanceThirdPartyOperationsApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch, now = new Date() } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  if (path !== OPERATIONS_PATH && path !== MARK_PAID_PATH) return null;

  if (typeof verifyAdmin !== "function") return json({ ok: false, error: "Admin verification unavailable" }, 503);
  const user = await verifyAdmin(request, env);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 403);

  try {
    if (path === OPERATIONS_PATH) {
      if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
      const current = await snapshot(env, fetchImpl);
      return json({
        ok: true,
        source: "google-sheets",
        access: "operational",
        ...publicOperations(current.items)
      });
    }

    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
    const body = await request.json().catch(() => null);
    const ref = clean(body?.ref);
    if (!ref) return json({ ok: false, error: "Missing third-party payment reference" }, 400);

    const current = await snapshot(env, fetchImpl);
    const target = current.items.find((item) => item.ref === ref);
    if (!target) return json({ ok: false, error: "Third-party obligation is no longer pending" }, 409);
    if (target.status !== "ready_to_pay" || !target.canMarkPaid || !target._rowNumber) {
      return json({ ok: false, error: "Third-party obligation is not ready to pay" }, 409);
    }

    const newPaid = target._currentPaid + target.amount;
    const date = bogotaDate(now);
    await writePayment(env, target._rowNumber, newPaid, date, fetchImpl);

    const refreshed = await snapshot(env, fetchImpl);
    const stillPending = refreshed.items.find((item) => item.ref === ref);
    if (stillPending?.status === "ready_to_pay" && stillPending.amount > 0) {
      return json({ ok: false, error: "Payment write could not be verified" }, 503);
    }

    return json({
      ok: true,
      source: "google-sheets",
      access: "write-fact-only",
      payment: {
        name: target.name,
        project: target.project,
        client: target.client,
        currency: target.currency,
        amount: target.amount,
        date
      },
      ...publicOperations(refreshed.items)
    });
  } catch (error) {
    console.error("[SD.Live] Third-party operations request failed", String(error?.message || error));
    return json({
      ok: false,
      error: "Third-party operations unavailable",
      detail: String(error?.message || error)
    }, 503);
  }
}
