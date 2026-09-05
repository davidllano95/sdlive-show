import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS, buildFinanceSummary } from "../finance-api.js";

const INDEX = Object.fromEntries(
  EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
);

function row(values) {
  const result = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(values)) result[INDEX[field]] = value;
  return result;
}

test("finance summary separates third-party gross, payable and own cash by currency", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2026-09-01",
      Cliente: "Client COP",
      Moneda: "COP",
      "Valor bruto": 450000,
      "Valor Neto": 405000,
      Estado: "Pagado",
      "Fecha pago": "2026-09-03",
      "Valor Recibido": 405000,
      "Cobro terceros": 100000,
      ID: "cop-third-party"
    }),
    row({
      "Fecha trabajo": "2026-09-01",
      Cliente: "Client USD",
      Moneda: "USD",
      "Valor bruto": 1000,
      "Valor Neto": 900,
      Estado: "Pagado",
      "Fecha pago": "2026-09-04",
      "Valor Recibido": 900,
      "Cobro terceros": 300,
      ID: "usd-third-party"
    }),
    row({
      "Fecha trabajo": "2026-09-02",
      Cliente: "Own only",
      Moneda: "COP",
      "Valor bruto": 200000,
      "Valor Neto": 190000,
      Estado: "Pagado",
      "Fecha pago": "2026-09-05",
      "Valor Recibido": 190000,
      ID: "cop-own-only"
    })
  ], { now: new Date("2026-09-05T13:00:00-05:00") });

  assert.deepEqual(summary.thirdParty, {
    commitmentCount: 2,
    paymentCount: 2,
    committedGrossByCurrency: { COP: 100000, USD: 300 },
    grossByCurrency: { COP: 100000, USD: 300 },
    collectedGrossByCurrency: { COP: 100000, USD: 300 },
    pendingCollectionGrossByCurrency: { COP: 0, USD: 0 },
    payableByCurrency: { COP: 90000, USD: 270 },
    ownCashReceivedByCurrency: { COP: 505000, USD: 630 },
    invalidAllocationCount: 0
  });
  assert.deepEqual(summary.received.amountByCurrency, { COP: 595000, USD: 900 });
});

test("invalid third-party allocations are surfaced instead of silently clamped", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2026-09-01",
      Cliente: "Broken row",
      Moneda: "COP",
      "Valor bruto": 100000,
      Estado: "Pagado",
      "Fecha pago": "2026-09-03",
      "Valor Recibido": 90000,
      "Cobro terceros": 120000,
      ID: "invalid-third-party"
    })
  ], { now: new Date("2026-09-05T13:00:00-05:00") });

  assert.equal(summary.thirdParty.paymentCount, 0);
  assert.deepEqual(summary.thirdParty.payableByCurrency, { COP: 0, USD: 0 });
  assert.equal(summary.thirdParty.invalidAllocationCount, 1);
  assert.equal(summary.dataQuality.invalidThirdPartyAllocationCount, 1);
});
