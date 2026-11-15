import { EXPECTED_FINANCE_HEADERS, financeHealthDiagnostic, readFinanceRows, validateFinanceHeaders } from "./finance-api.js";
import { ownerFacts, parseSheetDate, displaySheetDate } from "./finance-owner-money.js";

const CURRENCIES = new Set(["COP", "USD"]);
const FIELD_INDEX = Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((name, index) => [name, index]));
const REPORT_COLUMNS = Object.freeze([
  ["id", "ID"],
  ["workDate", "Fecha trabajo"],
  ["endDate", "Fecha fin"],
  ["paymentDate", "Fecha pago"],
  ["invoiceDate", "Fecha cuenta enviada"],
  ["client", "Cliente"],
  ["project", "Proyecto / Show"],
  ["role", "Rol"],
  ["status", "Estado"],
  ["currency", "Moneda"],
  ["gross", "Valor bruto transacción"],
  ["thirdPartyGross", "Bruto terceros"],
  ["ownGross", "Bruto atribuible propio"],
  ["fees", "Impuestos / Fees registrados"],
  ["net", "Valor Neto registrado"],
  ["received", "Recibido en banco"],
  ["ownCashReceived", "Recibido atribuible propio"],
  ["thirdPartyPayable", "Neto tercero estimado"],
  ["method", "Método de pago"],
  ["review", "Advertencias"]
]);

function cell(row, field) {
  return row?.[FIELD_INDEX[field]];
}
function string(value) {
  return value == null ? "" : String(value).trim();
}
function numeric(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function cleanDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const date = parseSheetDate(value);
  if (!date || displaySheetDate(value) !== value) return null;
  return value;
}
function rowDate(value) {
  const date = parseSheetDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}
function totals() {
  return { COP: { owner: 0, gross: 0, thirdPartyGross: 0, bank: 0, count: 0 }, USD: { owner: 0, gross: 0, thirdPartyGross: 0, bank: 0, count: 0 } };
}
function moneyOrNull(value) {
  return value === null ? null : roundMoney(value);
}

export function parseIncomeReportOptions(url) {
  const nowYear = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", year: "numeric" }).format(new Date()));
  const year = String(nowYear);
  const start = string(url.searchParams.get("start") || year + "-01-01");
  const end = string(url.searchParams.get("end") || year + "-12-31");
  const basis = string(url.searchParams.get("basis") || "payment");
  const currency = string(url.searchParams.get("currency") || "ALL").toUpperCase();
  const client = string(url.searchParams.get("client")).slice(0, 120);
  const format = string(url.searchParams.get("format") || "json");
  if (!cleanDate(start) || !cleanDate(end) || start > end) throw new Error("invalid_report_period");
  if (!["payment", "work"].includes(basis)) throw new Error("invalid_report_basis");
  if (currency !== "ALL" && !CURRENCIES.has(currency)) throw new Error("invalid_report_currency");
  if (format !== "json" && format !== "csv") throw new Error("invalid_report_format");
  return { start, end, basis, currency, client, format };
}

export function buildIncomeReport(rows, { start, end, basis = "payment", currency = "ALL", client = "" }) {
  const records = [];
  const summary = totals();
  const monthMap = new Map();
  const clientMap = new Map();
  const anomalies = { invalidAmounts: 0, missingPaymentAmounts: 0, invalidOwnerAllocation: 0 };
  for (const row of rows || []) {
    const id = string(cell(row, "ID"));
    if (!id) continue;
    const state = string(cell(row, "Estado"));
    const isPaid = state.toLowerCase() === "pagado";
    if (basis === "payment" && !isPaid) continue;
    const date = rowDate(cell(row, basis === "payment" ? "Fecha pago" : "Fecha trabajo"));
    if (!date || date < start || date > end) continue;
    const currencyValue = string(cell(row, "Moneda")).toUpperCase();
    if (currency !== "ALL" && currencyValue !== currency) continue;
    if (!CURRENCIES.has(currencyValue)) continue;
    const clientName = string(cell(row, "Cliente"));
    if (client && !clientName.toLocaleLowerCase("es").includes(client.toLocaleLowerCase("es"))) continue;

    const facts = ownerFacts(row);
    const fees = numeric(cell(row, "Impuestos / Fees"));
    const net = numeric(cell(row, "Valor Neto"));
    const issues = [];
    if (!facts.validThirdParty || facts.ownGross === null) {
      issues.push("Bruto o atribución a terceros inválidos");
      anomalies.invalidAmounts += 1;
    }
    if (isPaid && facts.received === null) {
      issues.push("Pagado sin Valor Recibido");
      anomalies.missingPaymentAmounts += 1;
    }
    if (isPaid && facts.received !== null && (!facts.validCashAllocation || facts.ownCashReceived === null)) {
      issues.push("Distribución de cobro inválida");
      anomalies.invalidOwnerAllocation += 1;
    }
    const entry = {
      id,
      workDate: rowDate(cell(row, "Fecha trabajo")),
      endDate: rowDate(cell(row, "Fecha fin")),
      paymentDate: rowDate(cell(row, "Fecha pago")),
      invoiceDate: rowDate(cell(row, "Fecha cuenta enviada")),
      client: clientName,
      project: string(cell(row, "Proyecto / Show")),
      role: string(cell(row, "Rol")),
      status: state,
      currency: currencyValue,
      gross: moneyOrNull(facts.gross),
      thirdPartyGross: moneyOrNull(facts.thirdPartyGross),
      ownGross: moneyOrNull(facts.ownGross),
      fees: moneyOrNull(fees),
      net: moneyOrNull(net),
      received: isPaid ? moneyOrNull(facts.received) : null,
      ownCashReceived: isPaid ? moneyOrNull(facts.ownCashReceived) : null,
      thirdPartyPayable: isPaid ? moneyOrNull(facts.thirdPartyPayable) : null,
      method: string(cell(row, "Método de pago")),
      review: issues.join("; ")
    };
    records.push(entry);
    const amount = basis === "payment" ? entry.ownCashReceived : entry.ownGross;
    const target = summary[currencyValue];
    target.count += 1;
    if (amount !== null) target.owner += amount;
    if (entry.gross !== null) target.gross += entry.gross;
    if (entry.thirdPartyGross !== null) target.thirdPartyGross += entry.thirdPartyGross;
    if (entry.received !== null) target.bank += entry.received;
    if (amount !== null) {
      const monthKey = date.slice(0, 7) + "|" + currencyValue;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
      const clientKey = clientName + "|" + currencyValue;
      clientMap.set(clientKey, (clientMap.get(clientKey) || 0) + amount);
    }
  }
  records.sort((a, b) => {
    const first = basis === "payment" ? a.paymentDate : a.workDate;
    const second = basis === "payment" ? b.paymentDate : b.workDate;
    return first.localeCompare(second) || a.id.localeCompare(b.id);
  });
  for (const value of Object.values(summary)) {
    for (const key of ["owner", "gross", "thirdPartyGross", "bank"]) value[key] = roundMoney(value[key]);
  }
  const monthly = [...monthMap].map(([key, amount]) => {
    const [month, currency] = key.split("|");
    return { month, currency, amount: roundMoney(amount) };
  }).sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency));
  const byClient = [...clientMap].map(([key, amount]) => {
    const cut = key.lastIndexOf("|");
    return { client: key.slice(0, cut), currency: key.slice(cut + 1), amount: roundMoney(amount) };
  }).sort((a, b) => a.currency.localeCompare(b.currency) || b.amount - a.amount);
  return {
    ok: true,
    source: "google-sheets",
    access: "read-only",
    basis,
    period: { start, end },
    filters: { currency, client },
    units: ["COP", "USD"],
    summary,
    monthly,
    byClient,
    anomalies,
    recordCount: records.length,
    records
  };
}

function safeCsvCell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function incomeReportCsv(report) {
  const lines = [REPORT_COLUMNS.map(([, label]) => safeCsvCell(label)).join(",")];
  for (const record of report.records) {
    lines.push(REPORT_COLUMNS.map(([field]) => safeCsvCell(record[field])).join(","));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

function json(data, code = 200) {
  return new Response(JSON.stringify(data), {
    status: code,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

export async function handleFinanceIncomeReportApi(request, env, { verifyAdmin, fetchImpl = fetch } = {}) {
  if (new URL(request.url).pathname.replace(/\/+$/, "") !== "/api/admin/finance/income-report") return null;
  if (typeof verifyAdmin !== "function") return json({ ok: false, error: "Admin verification unavailable" }, 503);
  const user = await verifyAdmin(request, env);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 403);
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  let options;
  try {
    options = parseIncomeReportOptions(new URL(request.url));
  } catch (error) {
    return json({ ok: false, error: String(error.message) }, 400);
  }
  try {
    const data = await readFinanceRows(env, fetchImpl);
    if (!validateFinanceHeaders(data.headers).ok) return json({ ok: false, error: "Finance schema mismatch" }, 503);
    const report = buildIncomeReport(data.rows, options);
    if (options.format !== "csv") return json(report);
    const name = "SDLive_income_" + options.basis + "_" + options.start + "_" + options.end + ".csv";
    return new Response(incomeReportCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + name + '"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("[SD.Live] Income report source unavailable", String(error?.message || error));
    return json({ ok: false, error: "Finance source unavailable", ...financeHealthDiagnostic(error) }, 503);
  }
}
