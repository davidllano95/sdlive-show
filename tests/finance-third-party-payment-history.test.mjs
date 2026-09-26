import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import { buildThirdPartyPaymentHistory } from "../finance-third-party-payment-history.js";

const FINANCE_INDEX = Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]));

function financeRow(values) {
  const row = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(values)) row[FINANCE_INDEX[field]] = value;
  return row;
}

function thirdRow({ id, workId, name, paid, date }) {
  const row = Array(14).fill("");
  row[0] = id;
  row[1] = workId;
  row[2] = name;
  row[9] = paid;
  row[10] = date;
  return row;
}

test("paid third-party history is enriched with parent context and sorted newest first", () => {
  const financeRows = [
    financeRow({
      "ID": "work-cop",
      "Cliente": "Client COP",
      "Proyecto / Show": "Show COP",
      "Moneda": "COP"
    }),
    financeRow({
      "ID": "work-usd",
      "Cliente": "Client USD",
      "Proyecto / Show": "Show USD",
      "Moneda": "USD"
    })
  ];
  const thirdRows = [
    thirdRow({ id: "third-1", workId: "work-cop", name: "Nicolas", paid: 446553, date: "2026-09-21" }),
    thirdRow({ id: "third-2", workId: "work-usd", name: "Alex", paid: 180.25, date: "2026-09-25" }),
    thirdRow({ id: "third-unpaid", workId: "work-cop", name: "Unpaid", paid: 0, date: "" })
  ];

  const history = buildThirdPartyPaymentHistory(financeRows, thirdRows);

  assert.equal(history.count, 2);
  assert.deepEqual(history.totalsByCurrency, { COP: 446553, USD: 180.25 });
  assert.deepEqual(history.items[0], {
    name: "Alex",
    date: "2026-09-25",
    amount: 180.25,
    currency: "USD",
    client: "Client USD",
    project: "Show USD"
  });
  assert.deepEqual(history.items[1], {
    name: "Nicolas",
    date: "2026-09-21",
    amount: 446553,
    currency: "COP",
    client: "Client COP",
    project: "Show COP"
  });
  assert.equal(history.semantics.cumulativePerObligation, true);
  assert.equal(history.semantics.eventLevelPartialPaymentHistory, false);
});

test("history reports missing dates without inventing them", () => {
  const financeRows = [financeRow({ "ID": "work", "Cliente": "Client", "Moneda": "COP" })];
  const thirdRows = [thirdRow({ id: "third", workId: "work", name: "Nicolas", paid: 100000, date: "" })];

  const history = buildThirdPartyPaymentHistory(financeRows, thirdRows);
  assert.equal(history.count, 1);
  assert.equal(history.items[0].date, null);
  assert.equal(history.dataQuality.missingDateCount, 1);
});
