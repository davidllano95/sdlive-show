import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import { buildOwnerFinanceProjection } from "../finance-owner-money.js";

const INDEX = Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]));

function row(values) {
  const result = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(values)) result[INDEX[field]] = value;
  return result;
}

const NOW = new Date("2026-09-26T17:00:00-05:00");

test("owner projection removes proportional third-party money while preserving full transaction totals", () => {
  const rows = [
    row({
      "ID": "production-case",
      "Fecha trabajo": "2026-09-01",
      "Año": 2026,
      "Month Number": 9,
      "Cliente": "LiventX",
      "Proyecto / Show": "Production case",
      "Moneda": "COP",
      "Valor bruto": 900000,
      "Estado": "Pagado",
      "Fecha cuenta enviada": "2026-09-02",
      "Fecha pago": "2026-09-20",
      "Año Pago": 2026,
      "Month Number (pago)": 9,
      "Valor Recibido": 893106,
      "Cobro terceros": 450000,
      "Impuestos / Fees": 6894
    }),
    row({
      "ID": "collectible",
      "Fecha trabajo": "2026-08-01",
      "Año": 2026,
      "Month Number": 8,
      "Cliente": "Client B",
      "Proyecto / Show": "Open owner balance",
      "Moneda": "COP",
      "Valor bruto": 1000000,
      "Estado": "Cuenta enviada",
      "Fecha cuenta enviada": "2026-08-02",
      "Días sin pagar": 20,
      "Cobro terceros": 200000
    }),
    row({
      "ID": "to-invoice",
      "Fecha trabajo": "2026-07-01",
      "Año": 2026,
      "Month Number": 7,
      "Cliente": "Client C",
      "Proyecto / Show": "Ready to invoice",
      "Moneda": "COP",
      "Valor bruto": 500000,
      "Estado": "Pendiente Envio",
      "Cobro terceros": 100000
    }),
    row({
      "ID": "usd-owner",
      "Fecha trabajo": "2026-06-01",
      "Año": 2026,
      "Month Number": 6,
      "Cliente": "Client USD",
      "Moneda": "USD",
      "Valor bruto": 1000,
      "Estado": "Pagado",
      "Fecha pago": "2026-06-10",
      "Año Pago": 2026,
      "Month Number (pago)": 6,
      "Valor Recibido": 1000
    })
  ];

  const projection = buildOwnerFinanceProjection(rows, { now: NOW });
  const year = projection.analytics.byYear["2026"];

  assert.equal(projection.summary.received.amountByCurrency.COP, 446553);
  assert.equal(projection.summary.received.bankAmountByCurrency.COP, 893106);
  assert.equal(projection.summary.received.amountByCurrency.USD, 1000);

  assert.equal(projection.summary.receivables.netByCurrency.COP, 800000);
  assert.equal(projection.summary.toInvoice.grossByCurrency.COP, 400000);

  assert.equal(year.received.COP.total, 446553);
  assert.equal(year.produced.COP.total, 1650000);
  assert.equal(year.topClients.COP[0].client, "LiventX");
  assert.equal(year.topClients.COP[0].amount, 446553);

  assert.deepEqual(year.transactionTotals.COP, {
    billed: 2400000,
    bankReceived: 893106,
    thirdPartyGross: 750000,
    thirdPartyPayable: 446553
  });

  assert.equal(projection.transactionTotals.allTime.bankReceivedByCurrency.COP, 893106);
  assert.equal(projection.transactionTotals.allTime.ownerReceivedByCurrency.COP, 446553);
  assert.equal(projection.contract.rawTransactionFactsPreserved, true);
  assert.equal(projection.contract.taxTreatmentInferred, false);
});

test("owner cash fails closed for an invalid proportional allocation but preserves bank received", () => {
  const rows = [
    row({
      "ID": "invalid-pass-through",
      "Fecha trabajo": "2026-01-01",
      "Año": 2026,
      "Month Number": 1,
      "Cliente": "Client A",
      "Moneda": "COP",
      "Valor bruto": 100,
      "Estado": "Pagado",
      "Fecha pago": "2026-01-02",
      "Año Pago": 2026,
      "Month Number (pago)": 1,
      "Valor Recibido": 110,
      "Cobro terceros": 50
    })
  ];

  const projection = buildOwnerFinanceProjection(rows, { now: NOW });
  assert.equal(projection.summary.received.amountByCurrency.COP, 0);
  assert.equal(projection.summary.received.bankAmountByCurrency.COP, 110);
  assert.equal(projection.summary.dataQuality.invalidOwnerAllocationCount, 1);
});

test("a no-third-party overpayment remains owner cash instead of being discarded", () => {
  const rows = [
    row({
      "ID": "no-pass-through",
      "Fecha trabajo": "2026-01-01",
      "Año": 2026,
      "Month Number": 1,
      "Cliente": "Client A",
      "Moneda": "COP",
      "Valor bruto": 100,
      "Estado": "Pagado",
      "Fecha pago": "2026-01-02",
      "Año Pago": 2026,
      "Month Number (pago)": 1,
      "Valor Recibido": 110
    })
  ];

  const projection = buildOwnerFinanceProjection(rows, { now: NOW });
  assert.equal(projection.summary.received.amountByCurrency.COP, 110);
  assert.equal(projection.summary.received.bankAmountByCurrency.COP, 110);
  assert.equal(projection.summary.dataQuality.invalidOwnerAllocationCount, 0);
});
