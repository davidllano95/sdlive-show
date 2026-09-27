import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../admin/documents/editor.js", import.meta.url), "utf8");
const hardening = readFileSync(new URL("../admin/documents/settings-hardening.js", import.meta.url), "utf8");
const drafts = readFileSync(new URL("../documents-drafts.js", import.meta.url), "utf8");

test("editor uses an explicit bank censor checkbox for both document kinds", () => {
  assert.match(editor, /Censor bank details/);
  assert.match(editor, /censorBankDetails/);
  assert.match(editor, /showBankDetails: !censorBankDetails/);
  assert.match(editor, /censorBankDetails: false, showBankDetails: true/);
  assert.match(drafts, /draft\.censorBankDetails == null/);
  assert.match(drafts, /censorBankDetails: !showBankDetails/);
});

test("invoice original expense editor accepts ISO currencies and uses USD-base FX without a date", () => {
  for (const currency of ["EUR", "GBP", "AUD", "CAD", "MXN", "BRL", "CHF", "JPY", "SGD", "NZD"]) {
    assert.match(editor, new RegExp(`"${currency}"`));
  }
  assert.match(editor, /line-original-currency/);
  assert.match(editor, /maxLength = 3/);
  assert.match(editor, /line-exchange-rate/);
  assert.match(hardening, /FX rate · 1 USD = original currency \(optional\)/);
  assert.match(hardening, /line-exchange-rate-date/);
  assert.match(hardening, /date\.value = ""/);
  assert.match(hardening, /fieldNode\.hidden = true/);
  assert.match(drafts, /exchangeRate: text\(line\?\.exchangeRate, 40\)/);
  assert.doesNotMatch(drafts, /exchangeRateDate: text\(line\?\.exchangeRateDate, 20\)/);
  assert.match(drafts, /exchangeRateDate: _legacyExchangeRateDate/);
});
