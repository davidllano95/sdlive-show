import test from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import {
  buildIncomeReport,
  parseIncomeReportOptions,
  incomeReportCsv,
  handleFinanceIncomeReportApi
} from "../finance-income-report-api.js";

const INDEX = Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((name, index) => [name, index]));
function row(values) {
  const cells = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [key, value] of Object.entries(values)) cells[INDEX[key]] = value;
  return cells;
}
const example = [
  row({
    ID: "first", "Fecha trabajo": "2026-08-14", "Fecha pago": "2026-09-20",
    "Cliente": "LiventX", "Proyecto / Show": "Gala", "Rol": "A1",
    Moneda: "COP", "Valor bruto": 900000, "Impuestos / Fees": 6894,
    "Estado": "Pagado", "Valor Recibido": 893106, "Cobro terceros": 450000
  }),
  row({
    ID: "second", "Fecha trabajo": "2026-09-10", "Estado": "Cuenta enviada",
    "Cliente": "Cliente B", "Proyecto / Show": "Montaje",
    Moneda: "COP", "Valor bruto": 800000, "Cobro terceros": 0
  }),
  row({
    ID: "third", "Fecha trabajo": "2025-12-20", "Fecha pago": "2026-09-24",
    "Cliente": "=FORMULA()", Moneda: "USD", "Estado": "Pagado",
    "Valor bruto": 1000, "Valor Recibido": 1000
  }),
  row({
    ID: "fourth", "Fecha trabajo": "2026-09-15", "Fecha pago": "2026-09-25",
    "Cliente": "Cliente C", "Estado": "Pagado",
    "Moneda": "COP", "Valor bruto": 100, "Valor Recibido": "",
    "Cobro terceros": 0
  })
];

test("payment basis counts only received owner cash in payment month and separates third parties", () => {
  const report = buildIncomeReport(example, { start: "2026-09-01", end: "2026-09-30", basis: "payment", currency: "ALL", client: "" });
  assert.equal(report.recordCount, 3);
  assert.equal(report.summary.COP.owner, 446553);
  assert.equal(report.summary.COP.bank, 893106);
  assert.equal(report.summary.COP.gross, 900100);
  assert.equal(report.summary.COP.thirdPartyGross, 450000);
  assert.equal(report.summary.COP.fees, 6894);
  assert.equal(report.summary.COP.net, 0);
  assert.equal(report.summary.USD.owner, 1000);
  assert.equal(report.anomalies.missingPaymentAmounts, 1);
  assert.deepEqual(report.monthly, [
    { month: "2026-09", currency: "COP", amount: 446553 },
    { month: "2026-09", currency: "USD", amount: 1000 }
  ]);
  assert.equal(report.records[0].id, "first");
  assert.equal(report.records[0].thirdPartyPayable, 446553);
});

test("work basis includes pending recorded gross but not unrelated previous-year work", () => {
  const report = buildIncomeReport(example, { start: "2026-09-01", end: "2026-09-30", basis: "work", currency: "COP", client: "" });
  assert.equal(report.recordCount, 2);
  assert.equal(report.summary.COP.owner, 800100);
  assert.equal(report.summary.USD.owner, 0);
  assert.equal(report.records[0].id, "second");
  assert.equal(report.records[1].id, "fourth");
});

test("filter by partial client name retains only matching native-currency entries", () => {
  const report = buildIncomeReport(example, { start: "2026-09-01", end: "2026-09-30", basis: "payment", currency: "COP", client: "livent" });
  assert.equal(report.recordCount, 1);
  assert.equal(report.records[0].id, "first");
  assert.equal(report.summary.COP.owner, 446553);
});

test("unknown-date rows are noted as unlocated, not treated as zero or put into guessed months", () => {
  const records = [row({ ID: "unlocated", Moneda: "COP", "Estado": "Pagado", "Valor bruto": 500, "Valor Recibido": 500 })];
  const report = buildIncomeReport(records, { start: "2026-01-01", end: "2026-12-31", basis: "payment" });
  assert.equal(report.recordCount, 0);
  assert.equal(report.anomalies.missingBasisDate, 1);
});

test("CSV exports safe spreadsheet text, semicolon separator, and decimal-comma numbers", () => {
  const report = buildIncomeReport(example, { start: "2026-09-01", end: "2026-09-30", basis: "payment" });
  const csv = incomeReportCsv(report);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Cliente";"Proyecto \/ Show";"Rol"/);
  assert.match(csv, /;"'=FORMULA\(\)";/);
  assert.match(csv, /;893106;/);
  assert.match(csv, /;446553;/);
  assert.match(csv, /;"Pagado";"USD";1000;/);
  assert.match(csv, /\r\n/);
});

test("options accept bounded date ranges and reject invalid modes and unsupported currencies", () => {
  const parsed = parseIncomeReportOptions(new URL("https://sdlive.show/api/admin/finance/income-report?basis=work&start=2026-01-01&end=2026-03-31&currency=COP"));
  assert.equal(parsed.basis, "work");
  assert.equal(parsed.start, "2026-01-01");
  assert.equal(parsed.currency, "COP");
  for (const query of [
    "basis=weird", "start=2026-02-31", "start=2026-12-01&end=2026-01-01", "currency=EUR", "format=excel"
  ]) {
    assert.throws(() => parseIncomeReportOptions(new URL("https://sdlive.show/api/admin/finance/income-report?" + query)));
  }
});

test("income report is protected by existing admin authentication and GET-only contract", async () => {
  const request = new Request("https://sdlive.show/api/admin/finance/income-report?start=2026-01-01&end=2026-12-31");
  const unauthorized = await handleFinanceIncomeReportApi(request, {}, { verifyAdmin: async () => null });
  assert.equal(unauthorized.status, 403);
  assert.equal(unauthorized.headers.get("Cache-Control"), "no-store");
  const unsupported = await handleFinanceIncomeReportApi(new Request(request.url, { method: "POST" }), {}, { verifyAdmin: async () => ({ email: "test@example.com" }) });
  assert.equal(unsupported.status, 405);
  const malformed = await handleFinanceIncomeReportApi(new Request(request.url + "&basis=invalid"), {}, { verifyAdmin: async () => ({ email: "test@example.com" }) });
  assert.equal(malformed.status, 400);
});
