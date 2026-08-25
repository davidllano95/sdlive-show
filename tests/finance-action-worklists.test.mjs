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

test("finance summary exposes read-only action queues with exact blockers", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2026-08-20",
      "Fecha fin": "2026-08-22",
      "Cliente": "Invoice me",
      "Proyecto / Show": "Past show",
      "Moneda": "COP",
      "Valor bruto": 1000,
      "Valor Neto": 900,
      "Estado": "Pendiente Envio",
      "ID": "secret-invoice-id",
      "Notas": "private note",
      "NUM CONTACTO": "+57-secret"
    }),
    row({
      "Fecha trabajo": "2026-08-20",
      "Fecha fin": "2026-08-23",
      "Cliente": "Today",
      "Proyecto / Show": "Multi-day show ending today",
      "Moneda": "COP",
      "Valor bruto": 500,
      "Valor Neto": 450,
      "Estado": "Pendiente Envio",
      "ID": "secret-today-id"
    }),
    row({
      "Fecha trabajo": "2026-08-20",
      "Fecha fin": "2026-08-24",
      "Cliente": "Future",
      "Proyecto / Show": "Ongoing multi-day show",
      "Moneda": "USD",
      "Valor bruto": 300,
      "Valor Neto": 275,
      "Estado": "Pendiente Envio",
      "ID": "secret-future-id"
    }),
    row({
      "Fecha trabajo": "",
      "Fecha fin": "",
      "Cliente": "Bad date",
      "Moneda": "USD",
      "Valor bruto": 200,
      "Valor Neto": 180,
      "Estado": "Pendiente Envio",
      "ID": "secret-date-id"
    }),
    row({
      "Fecha trabajo": "2026-08-01",
      "Cliente": "LiventX",
      "Proyecto / Show": "Needs both",
      "Moneda": "USD",
      "Valor Neto": 600,
      "Estado": "Cuenta enviada",
      "Fecha cuenta enviada": "2026-08-05",
      "Días sin pagar": 18,
      "ID": "secret-liventx-id"
    }),
    row({
      "Fecha trabajo": "2026-08-04",
      "Cliente": "LiventX",
      "Proyecto / Show": "Ready to sign",
      "Moneda": "USD",
      "Valor Neto": 625,
      "Estado": "Evaluada",
      "Fecha evaluación": "2026-08-18",
      "ID": "secret-liventx-sign-id"
    }),
    row({
      "Fecha trabajo": "2026-08-02",
      "Cliente": "Regular client",
      "Proyecto / Show": "Collect now",
      "Moneda": "COP",
      "Valor Neto": 700,
      "Estado": "Cuenta enviada",
      "Fecha cuenta enviada": "2026-08-06",
      "Días sin pagar": 17,
      "Rango Aging": "15-30 días",
      "ID": "secret-collect-id"
    })
  ], { now: new Date("2026-08-23T16:00:00Z") });

  assert.equal(summary.workQueues.toInvoice.length, 1);
  assert.equal(summary.workQueues.toInvoice[0].client, "Invoice me");
  assert.equal(summary.workQueues.toInvoice[0].endDate, "2026-08-22");
  assert.equal(summary.workQueues.toInvoice[0].action, "send_invoice");
  assert.equal(summary.workQueues.collectible.length, 1);
  assert.equal(summary.workQueues.collectible[0].client, "Regular client");

  assert.equal(summary.workQueues.blocked.length, 4);
  const byClient = Object.fromEntries(summary.workQueues.blocked.map((item) => [item.client, item]));
  assert.deepEqual(byClient.Today.reasonCodes, ["work_date_today"]);
  assert.equal(byClient.Today.endDate, "2026-08-23");
  assert.deepEqual(byClient.Future.reasonCodes, ["work_date_future"]);
  assert.equal(byClient.Future.endDate, "2026-08-24");
  assert.deepEqual(byClient["Bad date"].reasonCodes, ["invalid_work_date"]);
  assert.deepEqual(byClient.LiventX.reasonCodes, ["missing_evaluation", "missing_signature"]);

  assert.equal(summary.liventxSigningReview.active, true);
  assert.equal(summary.liventxSigningReview.count, 1);
  assert.equal(summary.workQueues.liventxReadyToSign.length, 1);
  assert.equal(summary.workQueues.liventxReadyToSign[0].project, "Ready to sign");
  assert.equal(summary.workQueues.liventxReadyToSign[0].evaluationDate, "2026-08-18");
  assert.equal(summary.workQueues.liventxReadyToSign[0].action, "sign_invoice");

  const serialized = JSON.stringify(summary.workQueues);
  assert.equal(serialized.includes("secret-"), false);
  assert.equal(serialized.includes("private note"), false);
  assert.equal(serialized.includes("+57-secret"), false);
});

test("dedicated Finance workspace loads branded card, LiventX signing review and aging worklists lazily", async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL("../admin/finance/index.html", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance-action-worklists.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance-action-worklists.css", import.meta.url), "utf8")
  ]);

  assert.match(html, /finance-action-worklists\.css\?v=20260823-3/);
  assert.match(html, /finance-action-worklists\.js\?v=20260825-1/);
  assert.match(script, /financeToInvoiceCount/);
  assert.match(script, /financeReceivableCount/);
  assert.match(script, /financeBlockedCount/);
  assert.match(script, /financeLiventXSigningCard/);
  assert.match(script, /liventxReadyToSign/);
  assert.match(script, /liventxReviewActive/);
  assert.match(script, /sign_invoice: "Sign the invoice"/);
  assert.match(script, /sign_invoice: "Firmar la factura"/);
  assert.match(script, /data\?\.summary\?\.workQueues/);
  assert.match(script, /missing_evaluation: "Send evaluation"/);
  assert.match(script, /missing_signature: "Sign invoice"/);
  assert.match(script, /missing_evaluation: "Enviar evaluación"/);
  assert.match(script, /missing_signature: "Firmar factura"/);
  assert.match(script, /work_date_today/);
  assert.match(script, /work_date_future/);
  assert.match(script, /credentials: "same-origin"/);

  assert.match(script, /const AGING_BUCKETS/);
  assert.match(script, /financeAgingCop/);
  assert.match(script, /financeAgingUsd/);
  assert.match(script, /function agingKeyFromDays/);
  assert.match(script, /queues\.collectible/);
  assert.match(script, /queues\.blocked/);
  assert.match(script, /workflowType: "collectible"/);
  assert.match(script, /workflowType: "blocked"/);
  assert.match(script, /finance-aging-bar--interactive/);
  assert.match(script, /value === null \|\| value === undefined \|\| value === ""/);

  assert.match(styles, /var\(--accent\)/);
  assert.match(styles, /rgba\(var\(--accent-rgb\)/);
  assert.match(styles, /finance-aging-bar--interactive/);
  assert.match(styles, /finance-action-item__workflow\.is-collectible/);
  assert.match(styles, /finance-action-item__workflow\.is-blocked/);
  assert.doesNotMatch(styles, /#dfff69/i);
  assert.doesNotMatch(styles, /223,\s*255,\s*105/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});