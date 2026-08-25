import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPECTED_FINANCE_HEADERS,
  buildFinanceSummary,
  handleFinanceApi
} from "../finance-api.js";

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  GOOGLE_FINANCE_SPREADSHEET_ID: "spreadsheet-id"
};

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

const SAMPLE_ROWS = [
  row({
    "Fecha trabajo": "2026-08-01",
    "Cliente": "Cliente COP",
    "Proyecto / Show": "Show A",
    "Moneda": "COP",
    "Valor bruto": 1000,
    "Impuestos / Fees": 100,
    "Valor Neto": 900,
    "Estado": "Cuenta enviada",
    "Fecha cuenta enviada": "2026-08-05",
    "Días sin pagar": 10,
    "Rango Aging": "8-14 días",
    "ID": "row-cop"
  }),
  row({
    "Fecha trabajo": "2026-08-02",
    "Cliente": "LiventX",
    "Proyecto / Show": "Needs signature",
    "Moneda": "USD",
    "Valor bruto": 600,
    "Valor Neto": 550,
    "Estado": "Evaluada",
    "Fecha cuenta enviada": "2026-08-06",
    "Fecha evaluación": "2026-08-07",
    "Días sin pagar": 16,
    "Rango Aging": "15-30 días",
    "ID": "row-blocked"
  }),
  row({
    "Fecha trabajo": "2026-08-03",
    "Cliente": "LiventX",
    "Proyecto / Show": "Ready collection",
    "Moneda": "USD",
    "Valor bruto": 500,
    "Impuestos / Fees": 50,
    "Valor Neto": 450,
    "Estado": "Firmada",
    "Fecha cuenta enviada": "2026-08-04",
    "Fecha evaluación": "2026-08-05",
    "Fecha firma": "2026-08-06",
    "Días sin pagar": 20,
    "Rango Aging": "15-30 días",
    "ID": "row-usd"
  }),
  row({
    "Fecha trabajo": "2026-08-10",
    "Fecha fin": "2026-08-10",
    "Cliente": "Por facturar",
    "Proyecto / Show": "Show B",
    "Moneda": "COP",
    "Valor bruto": 700,
    "Valor Neto": 700,
    "Estado": "Pendiente Envio",
    "ID": "row-pending"
  }),
  row({
    "Fecha trabajo": "2026-07-10",
    "Cliente": "Pagado COP",
    "Proyecto / Show": "Show C",
    "Moneda": "COP",
    "Valor bruto": 1000,
    "Impuestos / Fees": 50,
    "Valor Neto": 950,
    "Estado": "Pagado",
    "Fecha pago": "2026-08-15",
    "ID": "row-paid-cop",
    "Valor Recibido": 950,
    "NUM CONTACTO": "+57-secret"
  }),
  row({
    "Fecha trabajo": "2026-07-11",
    "Cliente": "Pagado USD",
    "Proyecto / Show": "Show D",
    "Moneda": "USD",
    "Valor bruto": 400,
    "Impuestos / Fees": 25,
    "Valor Neto": 375,
    "Estado": "Pagado",
    "Fecha pago": "2026-08-16",
    "ID": "row-paid-usd"
  })
];

test("finance summary preserves collection rules and COP/USD separation", () => {
  const summary = buildFinanceSummary(SAMPLE_ROWS, {
    now: new Date("2026-08-23T16:00:00Z")
  });

  assert.equal(summary.recordCount, 6);
  assert.deepEqual(summary.toInvoice, {
    count: 1,
    grossByCurrency: { COP: 700, USD: 0 }
  });

  assert.equal(summary.receivables.count, 2);
  assert.deepEqual(summary.receivables.netByCurrency, {
    COP: 900,
    USD: 450
  });
  assert.equal(summary.receivables.workflowBlockedCount, 1);
  assert.deepEqual(summary.receivables.aging, [
    {
      bucket: "15-30 días",
      count: 1,
      byCurrency: { COP: 0, USD: 450 }
    },
    {
      bucket: "8-14 días",
      count: 1,
      byCurrency: { COP: 900, USD: 0 }
    }
  ]);

  assert.equal(summary.receivables.priority.length, 2);
  assert.equal(summary.receivables.priority[0].client, "LiventX");
  assert.equal(summary.receivables.priority[0].daysUnpaid, 20);
  assert.equal(summary.receivables.priority[1].client, "Cliente COP");

  assert.deepEqual(summary.liventxSigningReview, {
    reviewDay: 20,
    active: true,
    count: 1
  });
  assert.equal(summary.workQueues.liventxReadyToSign.length, 1);
  assert.equal(summary.workQueues.liventxReadyToSign[0].project, "Needs signature");
  assert.equal(summary.workQueues.liventxReadyToSign[0].evaluationDate, "2026-08-07");
  assert.deepEqual(summary.workQueues.liventxReadyToSign[0].reasonCodes, ["missing_signature"]);

  assert.deepEqual(summary.received, {
    paidCount: 2,
    amountByCurrency: { COP: 950, USD: 0 },
    feesByCurrency: { COP: 50, USD: 25 },
    missingReceivedAmountCount: 1
  });
});

test("LiventX signing queue remains visible before the 20th and becomes active on the 20th", () => {
  const before = buildFinanceSummary(SAMPLE_ROWS, {
    now: new Date("2026-08-19T16:00:00Z")
  });
  const onReviewDay = buildFinanceSummary(SAMPLE_ROWS, {
    now: new Date("2026-08-20T16:00:00Z")
  });

  assert.equal(before.liventxSigningReview.active, false);
  assert.equal(before.liventxSigningReview.count, 1);
  assert.equal(before.workQueues.liventxReadyToSign.length, 1);
  assert.equal(onReviewDay.liventxSigningReview.active, true);
  assert.equal(onReviewDay.liventxSigningReview.count, 1);
});

test("ambiguous Google-style M/D payment dates do not create false negative durations", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2/1/2026",
      "Cliente": "Alvaro Llano",
      "Proyecto / Show": "Congreso Iglesia",
      "Moneda": "COP",
      "Valor bruto": 2200000,
      "Valor Neto": 2200000,
      "Estado": "Pagado",
      "Fecha cuenta enviada": "2/4/2026",
      "Fecha pago": "2/19/2026",
      "Valor Recibido": 2200000,
      "ID": "alvaro"
    }),
    row({
      "Fecha trabajo": "5/8/2026",
      "Cliente": "Alejandro Puentes",
      "Proyecto / Show": "Festival parque Simón Bolívar",
      "Moneda": "COP",
      "Valor bruto": 700000,
      "Valor Neto": 693238,
      "Estado": "Pagado",
      "Fecha cuenta enviada": "5/11/2026",
      "Fecha pago": "5/14/2026",
      "Valor Recibido": 693238,
      "ID": "alejandro"
    })
  ], {
    now: new Date("2026-08-25T16:00:00Z")
  });

  assert.equal(summary.dataQuality.invalidPaymentDurationCount, 0);
  assert.equal(summary.dataQuality.queues.invalidPaymentDuration.length, 0);
});

test("pending invoices become facturable only after Fecha fin has passed in Bogota", () => {
  const summary = buildFinanceSummary([
    row({
      "Fecha trabajo": "2026-08-20",
      "Fecha fin": "2026-08-22",
      "Cliente": "Ended event",
      "Moneda": "COP",
      "Valor bruto": 1000,
      "Valor Neto": 900,
      "Estado": "Pendiente Envio",
      "ID": "ended"
    }),
    row({
      "Fecha trabajo": "2026-08-20",
      "Fecha fin": "2026-08-24",
      "Cliente": "Ongoing event",
      "Moneda": "USD",
      "Valor bruto": 400,
      "Valor Neto": 350,
      "Estado": "Pendiente Envio",
      "ID": "ongoing"
    }),
    row({
      "Fecha trabajo": "2026-08-21",
      "Fecha fin": "2026-08-23",
      "Cliente": "Ends today",
      "Moneda": "COP",
      "Valor bruto": 2000,
      "Valor Neto": 1800,
      "Estado": "Pendiente Envio",
      "ID": "today"
    }),
    row({
      "Fecha trabajo": "2026-08-24",
      "Fecha fin": "2026-08-25",
      "Cliente": "Future event",
      "Moneda": "USD",
      "Valor bruto": 300,
      "Valor Neto": 275,
      "Estado": "Pendiente Envio",
      "ID": "future"
    }),
    row({
      "Fecha trabajo": "2026-08-22",
      "Fecha fin": "",
      "Cliente": "Legacy single-day",
      "Moneda": "COP",
      "Valor bruto": 600,
      "Valor Neto": 550,
      "Estado": "Pendiente Envio",
      "ID": "legacy"
    }),
    row({
      "Fecha trabajo": "",
      "Fecha fin": "",
      "Cliente": "Missing date",
      "Moneda": "USD",
      "Valor bruto": 200,
      "Valor Neto": 180,
      "Estado": "Pendiente Envio",
      "ID": "missing"
    })
  ], {
    now: new Date("2026-08-23T16:00:00Z")
  });

  assert.deepEqual(summary.toInvoice, {
    count: 2,
    grossByCurrency: { COP: 1600, USD: 0 }
  });
  assert.deepEqual(summary.workQueues.toInvoice.map((item) => item.client), [
    "Ended event",
    "Legacy single-day"
  ]);
  assert.equal(summary.receivables.workflowBlockedCount, 4);
  assert.deepEqual(summary.receivables.workflowBlockedNetByCurrency, {
    COP: 1800,
    USD: 805
  });
  const blockedClients = summary.workQueues.blocked.map((item) => item.client).sort();
  assert.deepEqual(blockedClients, ["Ends today", "Future event", "Missing date", "Ongoing event"]);
  assert.equal(summary.receivables.count, 0);
  assert.equal(summary.receivables.priority.length, 0);
});

test("finance summary endpoint reads REGISTRO through Fecha fin and omits private/raw fields", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url) === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "temporary-access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      range: "REGISTRO!A1:AB3000",
      majorDimension: "ROWS",
      values: [[...EXPECTED_FINANCE_HEADERS], ...SAMPLE_ROWS]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const response = await handleFinanceApi(
    new Request("https://sdlive.show/api/admin/finance/summary"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.access, "read-only");
  assert.equal(body.schema.columnCount, 28);
  assert.equal(body.summary.recordCount, 6);
  assert.equal(body.summary.receivables.netByCurrency.COP, 900);
  assert.equal(body.summary.receivables.netByCurrency.USD, 450);

  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("+57-secret"), false);
  assert.equal(serialized.includes("NUM CONTACTO"), false);
  assert.equal(serialized.includes("Notas"), false);
  assert.equal(serialized.includes("row-paid-cop"), false);

  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /REGISTRO/);
  assert.match(calls[1].url, /A1%3AAB3000/);
  assert.match(calls[1].url, /valueRenderOption=UNFORMATTED_VALUE/);
  assert.match(calls[1].url, /dateTimeRenderOption=SERIAL_NUMBER/);
});

test("finance summary remains admin-only", async () => {
  let fetchCalled = false;
  const response = await handleFinanceApi(
    new Request("https://sdlive.show/api/admin/finance/summary"),
    ENV,
    {
      verifyAdmin: async () => null,
      fetchImpl: async () => {
        fetchCalled = true;
        throw new Error("should not fetch");
      }
    }
  );

  assert.equal(response.status, 403);
  assert.equal(fetchCalled, false);
});