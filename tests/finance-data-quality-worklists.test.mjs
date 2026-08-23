import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  EXPECTED_FINANCE_HEADERS,
  buildFinanceSummary
} from "../finance-api.js";

const INDEX = Object.fromEntries(
  EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
);

function row(values) {
  const result = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(values)) result[INDEX[field]] = value;
  return result;
}

test("finance summary exposes sanitized data-quality worklists for each visible warning", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2026-01-01",
      "Cliente": "Missing received",
      "Proyecto / Show": "Paid show",
      "Moneda": "COP",
      "Valor bruto": 1000,
      "Valor Neto": 900,
      "Estado": "Pagado",
      "Fecha cuenta enviada": "2026-01-02",
      "Fecha pago": "2026-01-10",
      "Valor Recibido": "",
      "ID": "private-missing-received",
      "Notas": "private note one",
      "NUM CONTACTO": "+57-private-one"
    }),
    row({
      "Fecha trabajo": "2026-02-01",
      "Cliente": "Bad currency",
      "Proyecto / Show": "Currency show",
      "Moneda": "EUR",
      "Valor bruto": 2000,
      "Valor Neto": 1800,
      "Estado": "Pendiente Envio",
      "ID": "private-currency",
      "Notas": "private note two",
      "NUM CONTACTO": "+57-private-two"
    }),
    row({
      "Fecha trabajo": "2026-03-01",
      "Cliente": "Missing aging",
      "Proyecto / Show": "Aging show",
      "Moneda": "USD",
      "Valor Neto": 500,
      "Estado": "Cuenta enviada",
      "Fecha cuenta enviada": "2026-03-02",
      "Días sin pagar": "",
      "ID": "private-aging"
    }),
    row({
      "Fecha trabajo": "2026-04-01",
      "Cliente": "Missing paid date",
      "Proyecto / Show": "Date show",
      "Moneda": "COP",
      "Valor bruto": 3000,
      "Valor Neto": 2800,
      "Estado": "Pagado",
      "Fecha cuenta enviada": "2026-04-02",
      "Fecha pago": "",
      "Valor Recibido": 2800,
      "ID": "private-paid-date"
    }),
    row({
      "Fecha trabajo": "2026-05-01",
      "Cliente": "Invalid duration",
      "Proyecto / Show": "Duration show",
      "Moneda": "USD",
      "Valor bruto": 100,
      "Valor Neto": 90,
      "Estado": "Pagado",
      "Fecha cuenta enviada": "2026-05-20",
      "Fecha pago": "2026-05-10",
      "Valor Recibido": 90,
      "ID": "private-duration"
    })
  ], { now: new Date("2026-08-23T18:00:00Z") });

  const quality = summary.dataQuality;
  assert.equal(quality.paidMissingReceivedAmountCount, 1);
  assert.equal(quality.unsupportedCurrencyCount, 1);
  assert.equal(quality.unpaidMissingAgingCount, 1);
  assert.equal(quality.paidMissingPaymentDateCount, 1);
  assert.equal(quality.invalidPaymentDurationCount, 1);

  assert.equal(quality.queues.missingReceivedAmount[0].client, "Missing received");
  assert.equal(quality.queues.unsupportedCurrency[0].currency, "EUR");
  assert.equal(quality.queues.missingAging[0].client, "Missing aging");
  assert.equal(quality.queues.missingPaymentDate[0].client, "Missing paid date");
  assert.equal(quality.queues.invalidPaymentDuration[0].paymentDurationDays, -10);

  const serialized = JSON.stringify(quality.queues);
  assert.equal(serialized.includes("private-"), false);
  assert.equal(serialized.includes("private note"), false);
  assert.equal(serialized.includes("+57-private"), false);
});

test("Finance workspace wires all five quality warnings to lazy branded drilldowns", async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL("../admin/finance/index.html", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance-data-quality-worklists.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance-data-quality-worklists.css", import.meta.url), "utf8")
  ]);

  assert.match(html, /finance-data-quality-worklists\.css\?v=20260823-2/);
  assert.match(html, /finance-data-quality-worklists\.js\?v=20260823-1/);
  assert.match(script, /missingReceivedAmount/);
  assert.match(script, /unsupportedCurrency/);
  assert.match(script, /missingAging/);
  assert.match(script, /missingPaymentDate/);
  assert.match(script, /invalidPaymentDuration/);
  assert.match(script, /data\?\.summary\?\.dataQuality\?\.queues/);
  assert.match(script, /credentials: "same-origin"/);
  assert.match(script, /Registrar el valor realmente recibido/);
  assert.match(script, /Corregir Moneda a COP o USD/);
  assert.match(script, /Revisar Días sin pagar \/ Rango Aging en SD\.Live Track/);
  assert.match(script, /Registrar o corregir la fecha de pago/);
  assert.match(script, /Revisar las fechas de cuenta enviada y pago/);
  assert.doesNotMatch(script, /NUM CONTACTO/);
  assert.doesNotMatch(script, /Notas/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) auto auto/);
  assert.match(styles, /\.finance-quality-row--interactive > strong/);
  assert.match(styles, /\.finance-quality-row__drilldown[\s\S]*position: static/);
  assert.match(styles, /var\(--accent\)/);
  assert.match(styles, /rgba\(var\(--accent-rgb\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});