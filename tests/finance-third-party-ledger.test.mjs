import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import {
  EXPECTED_THIRD_PARTY_HEADERS,
  buildThirdPartyLedger,
  validateThirdPartyHeaders
} from "../finance-third-party-dashboard-api.js";

const FINANCE_INDEX = Object.fromEntries(
  EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
);
const THIRD_INDEX = Object.fromEntries(
  EXPECTED_THIRD_PARTY_HEADERS.map((header, index) => [header, index])
);

function financeRow(values) {
  const row = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  Object.entries(values).forEach(([field, value]) => { row[FINANCE_INDEX[field]] = value; });
  return row;
}

function thirdRow(values) {
  const row = Array(EXPECTED_THIRD_PARTY_HEADERS.length).fill("");
  Object.entries(values).forEach(([field, value]) => { row[THIRD_INDEX[field]] = value; });
  return row;
}

test("third-party schema requires the physical PAGO_TERCEROS headers in exact order", () => {
  assert.deepEqual(validateThirdPartyHeaders([...EXPECTED_THIRD_PARTY_HEADERS]), {
    ok: true,
    columnCount: 14,
    mismatchAt: null
  });
  const changed = [...EXPECTED_THIRD_PARTY_HEADERS];
  changed[4] = "Moneda calc";
  assert.equal(validateThirdPartyHeaders(changed).ok, false);
  assert.equal(validateThirdPartyHeaders(changed).mismatchAt, 4);
});

test("ledger derives child/work balances from persisted facts and keeps unassigned third-party money outstanding", () => {
  const parents = [financeRow({
    "ID": "work-1",
    "Fecha trabajo": "2026-09-01",
    "Año": 2026,
    "Month Number": 9,
    "Moneda": "COP",
    "Valor bruto": 1000000,
    "Valor Recibido": 900000,
    "Fecha pago": "2026-09-10",
    "Año Pago": 2026,
    "Month Number (pago)": 9,
    "Impuestos / Fees": 100000,
    "Cobro terceros": 300000
  })];
  const children = [thirdRow({
    "ID tercero": "third-1",
    "Trabajo ID": "work-1",
    "Tercero": "Nicolas",
    "Bruto tercero": 100000,
    "Valor pagado tercero": 40000,
    "Fecha pago tercero": "2026-09-12",
    "Notas": "must not be needed for math"
  })];

  const ledger = buildThirdPartyLedger(parents, children);
  assert.equal(ledger.allTime.registeredGrossByCurrency.COP, 300000);
  assert.equal(ledger.allTime.detailedGrossByCurrency.COP, 100000);
  assert.equal(ledger.allTime.unassignedGrossByCurrency.COP, 200000);
  assert.equal(ledger.allTime.actualPaidByCurrency.COP, 40000);
  // Child net = 90k, child balance = 50k; unassigned 200k * 0.9 = 180k.
  assert.equal(ledger.allTime.currentOutstandingByCurrency.COP, 230000);
  assert.equal(ledger.allTime.childStateCounts.Parcial, 1);
  assert.equal(ledger.allTime.stateCounts["Desglose incompleto"], 1);
});

test("ledger preserves payment-state priority before client collection and flags overpayment", () => {
  const parents = [
    financeRow({
      "ID": "paid-before-client",
      "Fecha trabajo": "2026-08-01",
      "Año": 2026,
      "Month Number": 8,
      "Moneda": "COP",
      "Valor bruto": 500000,
      "Cobro terceros": 100000
    }),
    financeRow({
      "ID": "overpaid",
      "Fecha trabajo": "2026-08-02",
      "Año": 2026,
      "Month Number": 8,
      "Moneda": "COP",
      "Valor bruto": 500000,
      "Valor Recibido": 450000,
      "Cobro terceros": 100000
    })
  ];
  const children = [
    thirdRow({
      "ID tercero": "t-1",
      "Trabajo ID": "paid-before-client",
      "Bruto tercero": 100000,
      "Valor pagado tercero": 100000,
      "Fecha pago tercero": "2026-08-03"
    }),
    thirdRow({
      "ID tercero": "t-2",
      "Trabajo ID": "overpaid",
      "Bruto tercero": 100000,
      "Valor pagado tercero": 95000,
      "Fecha pago tercero": "2026-08-04"
    })
  ];

  const ledger = buildThirdPartyLedger(parents, children);
  assert.equal(ledger.allTime.childStateCounts.Pagado, 1);
  assert.equal(ledger.allTime.childStateCounts["Revisar sobrepago"], 1);
  assert.equal(ledger.allTime.stateCounts.Pagado, 1);
  assert.equal(ledger.allTime.stateCounts["Revisar sobrepago"], 1);
});

test("selected-year reconciliation separates own money, third-party money and real third-party disbursements", () => {
  const parents = [financeRow({
    "ID": "work-1",
    "Fecha trabajo": "2026-05-05",
    "Año": 2026,
    "Month Number": 5,
    "Moneda": "COP",
    "Valor bruto": 1000000,
    "Cobro terceros": 200000,
    "Valor Recibido": 900000,
    "Fecha pago": "2026-06-10",
    "Año Pago": 2026,
    "Month Number (pago)": 6,
    "Impuestos / Fees": 100000
  })];
  const children = [thirdRow({
    "ID tercero": "t-1",
    "Trabajo ID": "work-1",
    "Bruto tercero": 200000,
    "Valor pagado tercero": 180000,
    "Fecha pago tercero": "2026-07-01"
  })];

  const ledger = buildThirdPartyLedger(parents, children);
  const cop = ledger.byYear["2026"].COP;
  assert.equal(cop.billedGross, 1000000);
  assert.equal(cop.ownGross, 800000);
  assert.equal(cop.thirdPartyGross, 200000);
  assert.equal(cop.bankReceived, 900000);
  assert.equal(cop.ownCashReceived, 720000);
  assert.equal(cop.estimatedThirdPartyPayable, 180000);
  assert.equal(cop.actualThirdPartyPaid, 180000);
  assert.equal(cop.fees, 100000);
  assert.equal(cop.monthly[4].ownGross, 800000);
  assert.equal(cop.monthly[5].ownCashReceived, 720000);
  assert.equal(cop.monthly[6].actualThirdPartyPaid, 180000);
});

test("ledger never reads the seven legacy derived cells as source facts", () => {
  const parent = financeRow({
    "ID": "work-1",
    "Fecha trabajo": "2026-01-01",
    "Año": 2026,
    "Month Number": 1,
    "Moneda": "USD",
    "Valor bruto": 1000,
    "Valor Recibido": 900,
    "Cobro terceros": 200
  });
  const child = thirdRow({
    "ID tercero": "t-1",
    "Trabajo ID": "work-1",
    "Bruto tercero": 200,
    "Moneda": "COP",
    "Valor bruto trabajo": 999999,
    "Valor recibido cliente": 1,
    "Tasa retención": 0.99,
    "Neto estimado tercero": 1,
    "Valor pagado tercero": 180,
    "Fecha pago tercero": "2026-01-02",
    "Saldo tercero": 999,
    "Estado tercero": "WRONG"
  });

  const ledger = buildThirdPartyLedger([parent], [child]);
  assert.equal(ledger.allTime.detailedGrossByCurrency.USD, 200);
  assert.equal(ledger.allTime.actualPaidByCurrency.USD, 180);
  assert.equal(ledger.allTime.currentOutstandingByCurrency.USD, 0);
  assert.equal(ledger.allTime.childStateCounts.Pagado, 1);
});
