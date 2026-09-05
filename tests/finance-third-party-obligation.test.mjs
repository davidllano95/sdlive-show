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
  for (const [field, value] of Object.entries(values)) result[INDEX[field]] = value;
  return result;
}

test("third-party obligations include structured amounts before client collection", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2026-08-01",
      Cliente: "Unpaid client",
      Moneda: "COP",
      "Valor bruto": 1000,
      "Valor Neto": 900,
      "Cobro terceros": 300,
      Estado: "Cuenta enviada",
      "Fecha cuenta enviada": "2026-08-02",
      "Días sin pagar": 10,
      ID: "unpaid-cop"
    }),
    row({
      "Fecha trabajo": "2026-08-03",
      Cliente: "Paid client",
      Moneda: "COP",
      "Valor bruto": 1000,
      "Impuestos / Fees": 100,
      "Valor Neto": 900,
      "Cobro terceros": 200,
      Estado: "Pagado",
      "Fecha cuenta enviada": "2026-08-04",
      "Fecha pago": "2026-08-10",
      "Valor Recibido": 900,
      ID: "paid-cop"
    }),
    row({
      "Fecha trabajo": "2026-08-05",
      Cliente: "Not invoiced yet",
      Moneda: "USD",
      "Valor bruto": 500,
      "Valor Neto": 500,
      "Cobro terceros": 100,
      Estado: "Pendiente Envio",
      ID: "pending-usd"
    })
  ], {
    now: new Date("2026-09-05T13:00:00-05:00")
  });

  assert.equal(summary.thirdParty.commitmentCount, 3);
  assert.equal(summary.thirdParty.paymentCount, 1);
  assert.deepEqual(summary.thirdParty.committedGrossByCurrency, { COP: 500, USD: 100 });
  assert.deepEqual(summary.thirdParty.collectedGrossByCurrency, { COP: 200, USD: 0 });
  assert.deepEqual(summary.thirdParty.pendingCollectionGrossByCurrency, { COP: 300, USD: 100 });
  assert.deepEqual(summary.thirdParty.payableByCurrency, { COP: 180, USD: 0 });
});

test("third-party card presents registered obligations and keeps calculator navigation", () => {
  const ui = readFileSync(new URL("../admin/finance-pass-through-calculator.js", import.meta.url), "utf8");

  assert.match(ui, /Obligaciones a terceros/);
  assert.match(ui, /Third-party obligations/);
  assert.match(ui, /commitmentCount/);
  assert.match(ui, /committedGrossByCurrency/);
  assert.match(ui, /pendingCollectionGrossByCurrency/);
  assert.match(ui, /payableByCurrency/);
  assert.match(ui, /scrollIntoView/);
  assert.match(ui, /data-invoiced/);
});
