import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

await import("../admin/finance-pass-through-math.js");

const { calculate } = globalThis.SDLivePassThroughMath;

test("pass-through calculator prorates retentions and reconciles the bank deposit", () => {
  const result = calculate({
    invoiced: 450000,
    received: 405000,
    thirdParties: [{ name: "Nicolás", amount: 100000 }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.totalRetention, 45000);
  assert.equal(result.retentionRate, 0.1);
  assert.equal(result.myGross, 350000);
  assert.equal(result.myRetention, 35000);
  assert.equal(result.myNet, 315000);
  assert.equal(result.thirdPartyGross, 100000);
  assert.equal(result.thirdPartyRetention, 10000);
  assert.equal(result.thirdPartyPayable, 90000);
  assert.equal(result.reconciliation, 405000);
  assert.deepEqual(result.thirdParties[0], {
    name: "Nicolás",
    gross: 100000,
    retention: 10000,
    payable: 90000
  });
});

test("pass-through calculator supports several third parties", () => {
  const result = calculate({
    invoiced: 1000,
    received: 900,
    thirdParties: [
      { name: "A", amount: 200 },
      { name: "B", amount: 300 }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.myGross, 500);
  assert.equal(result.myRetention, 50);
  assert.equal(result.myNet, 450);
  assert.equal(result.thirdPartyRetention, 50);
  assert.equal(result.thirdPartyPayable, 450);
  assert.equal(result.reconciliation, result.received);
  assert.deepEqual(result.thirdParties.map((party) => party.payable), [180, 270]);
});

test("pass-through calculator rejects impossible allocations", () => {
  assert.equal(calculate({ invoiced: 100, received: 110 }).code, "received_exceeds_invoiced");
  assert.equal(calculate({ invoiced: 100, received: 90, thirdParties: [{ amount: 101 }] }).code, "third_parties_exceed_invoiced");
  assert.equal(calculate({ invoiced: 0, received: 0 }).code, "missing_totals");
});

test("Finance workspace loads the calculator locally without adding a write-back path", () => {
  const html = readFileSync(new URL("../admin/finance/index.html", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../admin/finance-pass-through-calculator.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../admin/finance-pass-through-calculator.css", import.meta.url), "utf8");

  const mathIndex = html.indexOf("finance-pass-through-math.js");
  const uiIndex = html.indexOf("finance-pass-through-calculator.js");
  assert.ok(mathIndex > -1 && uiIndex > mathIndex);
  assert.match(html, /finance-pass-through-calculator\.css/);
  assert.match(ui, /Calculador de retenciones y pagos a terceros/);
  assert.match(ui, /nothing is saved or sent to Google Sheets/);
  assert.doesNotMatch(ui, /\/api\/admin\/finance/);
  assert.doesNotMatch(ui, /fetch\s*\(/);
  assert.ok(css.includes(".finance-pass-through__results"));
  assert.ok(css.includes("@media(max-width:560px)"));
});
