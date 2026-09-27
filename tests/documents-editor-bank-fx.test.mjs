import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../admin/documents/editor.js", import.meta.url), "utf8");
const drafts = readFileSync(new URL("../documents-drafts.js", import.meta.url), "utf8");

test("editor uses an explicit bank censor checkbox for both document kinds", () => {
  assert.match(editor, /Censor bank details/);
  assert.match(editor, /censorBankDetails/);
  assert.match(editor, /showBankDetails: !censorBankDetails/);
  assert.match(editor, /censorBankDetails: false, showBankDetails: true/);
  assert.match(drafts, /draft\.censorBankDetails == null/);
  assert.match(drafts, /censorBankDetails: !showBankDetails/);
});

test("invoice original expense editor accepts broader ISO currencies and FX metadata", () => {
  for (const currency of ["EUR", "GBP", "AUD", "CAD", "MXN", "BRL", "CHF", "JPY", "SGD", "NZD"]) {
    assert.match(editor, new RegExp(`"${currency}"`));
  }
  assert.match(editor, /line-original-currency/);
  assert.match(editor, /maxLength = 3/);
  assert.match(editor, /line-exchange-rate/);
  assert.match(editor, /line-exchange-rate-date/);
  assert.match(editor, /FX rate · 1 original = document currency \(optional\)/);
  assert.match(editor, /FX rate date \(optional\)/);
  assert.match(editor, /exchangeRate:/);
  assert.match(editor, /exchangeRateDate:/);
  assert.match(drafts, /exchangeRate: text\(line\?\.exchangeRate, 40\)/);
  assert.match(drafts, /exchangeRateDate: text\(line\?\.exchangeRateDate, 20\)/);
});
