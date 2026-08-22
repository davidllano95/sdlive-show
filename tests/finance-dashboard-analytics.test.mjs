import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import { buildFinanceAnalytics } from "../finance-dashboard-api.js";

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

const ROWS = [
  row({
    "Fecha trabajo": "2026-01-05",
    "Año": 2026,
    "Month Number": 1,
    "Cliente": "Client A",
    "Moneda": "COP",
    "Valor bruto": 1200000,
    "Impuestos / Fees": 100000,
    "Valor Neto": 1100000,
    "Estado": "Pagado",
    "Fecha cuenta enviada": "2026-01-10",
    "Fecha pago": "2026-01-20",
    "Año Pago": 2026,
    "Month Number (pago)": 1,
    "Valor Recibido": 1000000,
    "ID": "paid-cop-a"
  }),
  row({
    "Fecha trabajo": "2026-03-02",
    "Año": 2026,
    "Month Number": 3,
    "Cliente": "Client B",
    "Moneda": "COP",
    "Valor bruto": 2200000,
    "Impuestos / Fees": 200000,
    "Valor Neto": 2000000,
    "Estado": "Pagado",
    "Fecha cuenta enviada": "2026-03-01",
    "Fecha pago": "2026-03-31",
    "Año Pago": 2026,
    "Month Number (pago)": 3,
    "Valor Recibido": 2000000,
    "ID": "paid-cop-b"
  }),
  row({
    "Fecha trabajo": "2026-06-01",
    "Año": 2026,
    "Month Number": 6,
    "Cliente": "Client USD",
    "Moneda": "USD",
    "Valor bruto": 1100,
    "Impuestos / Fees": 100,
    "Valor Neto": 1000,
    "Estado": "Pagado",
    "Fecha cuenta enviada": "2026-06-05",
    "Fecha pago": "2026-06-15",
    "Año Pago": 2026,
    "Month Number (pago)": 6,
    "Valor Recibido": 1000,
    "ID": "paid-usd"
  }),
  row({
    "Fecha trabajo": "2026-08-15",
    "Año": 2026,
    "Month Number": 8,
    "Cliente": "Current debtor",
    "Moneda": "COP",
    "Valor Neto": 500000,
    "Estado": "Cuenta enviada",
    "Fecha cuenta enviada": "2026-08-16",
    "Días sin pagar": 20,
    "ID": "receivable-cop"
  }),
  row({
    "Fecha trabajo": "2026-07-01",
    "Año": 2026,
    "Month Number": 7,
    "Cliente": "LiventX",
    "Moneda": "USD",
    "Valor Neto": 700,
    "Estado": "Evaluada",
    "Fecha cuenta enviada": "2026-07-05",
    "Fecha evaluación": "2026-07-07",
    "Días sin pagar": 45,
    "ID": "blocked-usd"
  }),
  row({
    "Fecha trabajo": "2026-05-01",
    "Año": 2026,
    "Month Number": 5,
    "Cliente": "Old debtor",
    "Moneda": "COP",
    "Valor Neto": 250000,
    "Estado": "Cuenta enviada",
    "Fecha cuenta enviada": "2026-05-05",
    "Días sin pagar": 75,
    "ID": "old-cop"
  }),
  row({
    "Fecha trabajo": "2026-09-10",
    "Año": 2026,
    "Month Number": 9,
    "Cliente": "Future work",
    "Moneda": "COP",
    "Valor Neto": 5000000,
    "Estado": "Pendiente Envio",
    "ID": "future-work"
  })
];

test("finance analytics separates received, produced, clients and YTD averages", () => {
  const analytics = buildFinanceAnalytics(ROWS, {
    now: new Date("2026-08-22T17:00:00-05:00")
  });
  const year = analytics.byYear["2026"];

  assert.deepEqual(analytics.years, [2026]);
  assert.equal(analytics.defaultYear, 2026);

  assert.equal(year.received.COP.total, 3000000);
  assert.equal(year.received.COP.bestMonth.month, 3);
  assert.equal(year.received.COP.bestMonth.amount, 2000000);
  assert.equal(year.received.COP.averageMonthCount, 8);
  assert.equal(year.received.COP.averageMonthly, 375000);
  assert.equal(year.received.USD.total, 1000);

  assert.equal(year.produced.COP.monthly[0].amount, 1100000);
  assert.equal(year.produced.COP.monthly[2].amount, 2000000);
  assert.equal(year.produced.COP.monthly[7].amount, 500000);
  assert.equal(year.produced.COP.monthly[8].amount, 0);

  assert.equal(year.topClients.COP[0].client, "Client B");
  assert.equal(year.topClients.COP[0].amount, 2000000);
  assert.equal(year.clientConcentration.COP.top3SharePercent, 100);

  assert.equal(year.paymentPerformance.COP.sampleSize, 2);
  assert.equal(year.paymentPerformance.COP.averageDays, 20);
  assert.equal(year.paymentPerformance.COP.medianDays, 20);
  assert.equal(year.fees.COP.total, 300000);
  assert.equal(year.fees.COP.effectiveRatePercent, 8.8);
});

test("finance analytics tracks unpaid balances including workflow-blocked amounts", () => {
  const analytics = buildFinanceAnalytics(ROWS, {
    now: new Date("2026-08-22T17:00:00-05:00")
  });

  const copAging = analytics.receivables.aging.COP;
  const usdAging = analytics.receivables.aging.USD;

  assert.deepEqual(copAging.map((entry) => [entry.key, entry.count, entry.amount]), [
    ["0-30", 1, 500000],
    ["31-60", 0, 0],
    ["61+", 1, 250000]
  ]);

  assert.equal(usdAging[1].key, "31-60");
  assert.equal(usdAging[1].amount, 700);
  assert.equal(usdAging[1].workflowBlockedCount, 1);
  assert.equal(usdAging[1].workflowBlockedAmount, 700);

  assert.equal(analytics.receivables.topDebtors.COP[0].client, "Current debtor");
  assert.equal(analytics.receivables.topDebtors.COP[0].amount, 500000);
});

test("tax reserve stays user-configurable and applies only from the chosen date", () => {
  const analytics = buildFinanceAnalytics(ROWS, {
    now: new Date("2026-08-22T17:00:00-05:00"),
    taxReserveSettings: {
      enabled: true,
      rates: { COP: 25, USD: 20 },
      applyFrom: "2026-03-01"
    }
  });
  const reserve = analytics.byYear["2026"].taxReserve;

  assert.equal(reserve.configured, true);
  assert.equal(reserve.COP.ratePercent, 25);
  assert.equal(reserve.COP.reserveTotal, 500000);
  assert.equal(reserve.COP.monthly[0].amount, 0);
  assert.equal(reserve.COP.monthly[2].amount, 500000);
  assert.equal(reserve.USD.reserveTotal, 200);
  assert.equal(reserve.USD.afterReserve, 800);
});
