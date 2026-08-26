import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  formattedSheetDateToSerial,
  financeUpstreamUrl,
  normalizeFinanceDateValues
} from "../finance-transport-guard.js";

function serialFor(year, month, day) {
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((Date.UTC(year, month - 1, day) - epoch) / 86400000);
}

test("Finance rewrites the Sheets date transport to the production-proven formatted mode", () => {
  const url = financeUpstreamUrl(
    "https://sheets.googleapis.com/v4/spreadsheets/id/values/REGISTRO?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER"
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("valueRenderOption"), "UNFORMATTED_VALUE");
  assert.equal(parsed.searchParams.get("dateTimeRenderOption"), "FORMATTED_STRING");
});

test("ambiguous Google-formatted M/D dates normalize back to unambiguous Sheets serials", () => {
  assert.equal(formattedSheetDateToSerial("2/4/2026"), serialFor(2026, 2, 4));
  assert.equal(formattedSheetDateToSerial("2/19/2026"), serialFor(2026, 2, 19));
  assert.equal(formattedSheetDateToSerial("5/11/2026"), serialFor(2026, 5, 11));
  assert.equal(formattedSheetDateToSerial("19/2/2026"), serialFor(2026, 2, 19));
});

test("only Finance date columns are normalized", () => {
  const values = [
    ["Fecha trabajo", "Cliente", "Fecha cuenta enviada", "Fecha pago", "Fecha fin"],
    ["2/1/2026", "Álvaro Llano", "2/4/2026", "2/19/2026", "2/1/2026"]
  ];
  const normalized = normalizeFinanceDateValues(values);
  assert.equal(normalized[1][0], serialFor(2026, 2, 1));
  assert.equal(normalized[1][1], "Álvaro Llano");
  assert.equal(normalized[1][2], serialFor(2026, 2, 4));
  assert.equal(normalized[1][3], serialFor(2026, 2, 19));
  assert.equal(normalized[1][4], serialFor(2026, 2, 1));
});

test("Finance connection guard prevents an indefinite Connecting state", async () => {
  const [guard, wrangler] = await Promise.all([
    readFile(new URL("../admin/finance-connection-guard.js", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  ]);
  assert.match(guard, /DEADLINE_MS = 12000/);
  assert.match(guard, /Finance request timed out · reload to retry/);
  assert.match(guard, /Finance online · read-only source/);
  assert.match(wrangler, /"main": "\.\/finance-transport-guard\.js"/);
});
