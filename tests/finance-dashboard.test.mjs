import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  EXPECTED_FINANCE_HEADERS,
  buildFinanceSummary
} from "../finance-api.js";

const INDEX = Object.fromEntries(
  EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
);

function row(values) {
  const result = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(values)) {
    result[INDEX[field]] = value;
  }
  return result;
}

test("finance summary rounds money and reports workflow-blocked amounts", () => {
  const summary = buildFinanceSummary([
    row({
      "Cliente": "LiventX",
      "Moneda": "USD",
      "Valor Neto": 123.456,
      "Estado": "Cuenta enviada",
      "Fecha cuenta enviada": "2026-08-01",
      "Fecha evaluación": "2026-08-02",
      "Fecha firma": "",
      "ID": "blocked"
    }),
    row({
      "Cliente": "Paid client",
      "Moneda": "USD",
      "Estado": "Pagado",
      "Impuestos / Fees": 5.990000000000009,
      "Valor Recibido": 100.125,
      "ID": "paid"
    })
  ]);

  assert.equal(summary.receivables.workflowBlockedCount, 1);
  assert.deepEqual(summary.receivables.workflowBlockedNetByCurrency, {
    COP: 0,
    USD: 123.46
  });
  assert.deepEqual(summary.received.feesByCurrency, {
    COP: 0,
    USD: 5.99
  });
  assert.deepEqual(summary.received.amountByCurrency, {
    COP: 0,
    USD: 100.13
  });
});

test("admin dashboard loads modular finance analytics without sensitive fields", () => {
  const dashboard = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
  const finance = readFileSync(new URL("../admin/finance-dashboard.js", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../admin/finance-dashboard.css", import.meta.url), "utf8");
  const mobile = readFileSync(new URL("../admin/mobile-dashboard.css", import.meta.url), "utf8");

  assert.match(dashboard, /finance-dashboard\.js/);
  assert.match(finance, /\/api\/admin\/finance\/dashboard/);
  assert.match(finance, /\/api\/admin\/finance\/settings/);
  assert.match(finance, /workflowBlockedNetByCurrency/);
  assert.match(finance, /generatedVsReceived/);
  assert.match(finance, /Top clients/);
  assert.match(finance, /Tax reserve/);
  assert.doesNotMatch(finance, /NUM CONTACTO/);
  assert.doesNotMatch(finance, /\bNotas\b/);
  assert.ok(styles.includes(".finance-overview"));
  assert.ok(styles.includes(".finance-chart-line"));
  assert.ok(styles.includes(".finance-tax-panel"));
  assert.match(mobile, /min-width:0!important/);
  assert.match(mobile, /\.app-sidebar/);
});
