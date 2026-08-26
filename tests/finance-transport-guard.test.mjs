import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  formattedSheetDateToSerial,
  financeUpstreamUrl,
  normalizeFinanceDateValues
} from "../finance-upstream.js";

function serialFor(year, month, day) {
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((Date.UTC(year, month - 1, day) - epoch) / 86400000);
}

test("Finance rewrites Sheets dates to the previously proven formatted transport", () => {
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

test("Finance stability runtime remains below the stabilization wrapper and before page bootstrap", async () => {
  const [runtime, html, wrangler, wrapper] = await Promise.all([
    readFile(new URL("../admin/finance-runtime-stability.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance/index.html", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../admin-stabilization-worker.js", import.meta.url), "utf8")
  ]);

  assert.match(runtime, /REQUEST_TIMEOUT_MS = 12000/);
  assert.match(runtime, /SHORT_CACHE_MS = 1500/);
  assert.match(runtime, /cachedResponse\.clone\(\)/);
  assert.match(runtime, /source\?\.classList\.contains\("is-error"\)/);
  assert.doesNotMatch(runtime, /MutationObserver/);

  const stabilityIndex = html.indexOf("finance-runtime-stability.js?v=20260825-1");
  const pageIndex = html.indexOf("finance-page.js?v=20260823-1");
  assert.ok(stabilityIndex > -1 && pageIndex > stabilityIndex);
  assert.match(wrangler, /"main": "\.\/admin-stabilization-worker\.js"/);
  assert.match(wrapper, /import baseWorker from "\.\/public-form-rate-limit\.js"/);
  assert.match(wrapper, /baseWorker\.fetch\(/);
});