import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import {
  EXPECTED_THIRD_PARTY_HEADERS,
  handleFinanceThirdPartyDashboardApi
} from "../finance-third-party-dashboard-api.js";

const FINANCE_INDEX = Object.fromEntries(
  EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
);
const THIRD_INDEX = Object.fromEntries(
  EXPECTED_THIRD_PARTY_HEADERS.map((header, index) => [header, index])
);

function row(headers, index, values) {
  const result = Array(headers.length).fill("");
  Object.entries(values).forEach(([field, value]) => { result[index[field]] = value; });
  return result;
}

function fakeDb() {
  return {
    prepare() {
      return {
        bind() { return this; },
        async run() { return { success: true }; },
        async first() { return null; }
      };
    }
  };
}

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  GOOGLE_FINANCE_SPREADSHEET_ID: "spreadsheet-id",
  CMS_DB: fakeDb()
};

const financeRow = row(EXPECTED_FINANCE_HEADERS, FINANCE_INDEX, {
  "ID": "private-work-id",
  "Fecha trabajo": "2026-05-05",
  "Año": 2026,
  "Month Number": 5,
  "Cliente": "Client A",
  "Moneda": "COP",
  "Valor bruto": 1000000,
  "Valor Neto": 900000,
  "Estado": "Pagado",
  "Valor Recibido": 900000,
  "Fecha pago": "2026-06-10",
  "Año Pago": 2026,
  "Month Number (pago)": 6,
  "Impuestos / Fees": 100000,
  "Cobro terceros": 200000,
  "Notas": "private parent note",
  "NUM CONTACTO": "+57-private"
});

const thirdPartyRow = row(EXPECTED_THIRD_PARTY_HEADERS, THIRD_INDEX, {
  "ID tercero": "private-third-id",
  "Trabajo ID": "private-work-id",
  "Tercero": "Private third party name",
  "Bruto tercero": 200000,
  "Valor pagado tercero": 180000,
  "Fecha pago tercero": "2026-07-01",
  "Notas": "private third-party note"
});

function fakeFetch(url) {
  const value = String(url);
  if (value === "https://oauth2.googleapis.com/token") {
    return Promise.resolve(new Response(JSON.stringify({ access_token: "access-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
  }

  const decoded = decodeURIComponent(value);
  if (decoded.includes("PAGO_TERCEROS!A1:N3000")) {
    return Promise.resolve(new Response(JSON.stringify({
      range: "PAGO_TERCEROS!A1:N3000",
      majorDimension: "ROWS",
      values: [[...EXPECTED_THIRD_PARTY_HEADERS], thirdPartyRow]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
  }

  if (decoded.includes("REGISTRO!A1:AC3000")) {
    return Promise.resolve(new Response(JSON.stringify({
      range: "REGISTRO!A1:AC3000",
      majorDimension: "ROWS",
      values: [[...EXPECTED_FINANCE_HEADERS], financeRow]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
  }

  throw new Error(`Unexpected fetch: ${value}`);
}

test("enhanced Finance endpoint exposes only the third-party name needed for COP reconciliation, not private row data", async () => {
  const response = await handleFinanceThirdPartyDashboardApi(
    new Request("https://sdlive.show/api/admin/finance/dashboard"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl: fakeFetch,
      now: new Date("2026-09-06T12:00:00-05:00")
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.access, "read-only");
  assert.equal(body.thirdPartySchema.ok, true);
  assert.equal(body.summary.thirdPartyActual.actualPaidByCurrency.COP, 180000);
  assert.equal(body.summary.thirdPartyActual.currentOutstandingByCurrency.COP, 0);

  const reconciliation = body.analytics.thirdPartyReconciliation["2026"].COP;
  assert.equal(reconciliation.billedGross, 1000000);
  assert.equal(reconciliation.ownGross, 800000);
  assert.equal(reconciliation.thirdPartyGross, 200000);
  assert.equal(reconciliation.bankReceived, 900000);
  assert.equal(reconciliation.ownCashReceived, 720000);
  assert.equal(reconciliation.estimatedThirdPartyPayable, 180000);
  assert.equal(reconciliation.actualThirdPartyPaid, 180000);

  assert.deepEqual(body.thirdPartyLedger.copByThirdParty, [
    {
      name: "Private third party name",
      debt: 0,
      collected: 180000,
      paid: 180000
    }
  ]);

  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("private-work-id"), false);
  assert.equal(serialized.includes("private-third-id"), false);
  assert.equal(serialized.includes("Private third party name"), true);
  assert.equal(serialized.includes("private parent note"), false);
  assert.equal(serialized.includes("private third-party note"), false);
  assert.equal(serialized.includes("+57-private"), false);
});

test("enhanced Finance endpoint rejects a changed PAGO_TERCEROS physical schema", async () => {
  const changedHeaders = [...EXPECTED_THIRD_PARTY_HEADERS];
  changedHeaders[4] = "Moneda calc";

  async function schemaFetch(url) {
    const value = String(url);
    if (value === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const decoded = decodeURIComponent(value);
    const values = decoded.includes("PAGO_TERCEROS!A1:N3000")
      ? [[...changedHeaders]]
      : [[...EXPECTED_FINANCE_HEADERS], financeRow];
    return new Response(JSON.stringify({ values }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  const response = await handleFinanceThirdPartyDashboardApi(
    new Request("https://sdlive.show/api/admin/finance/dashboard"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl: schemaFetch
    }
  );

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.stage, "third_party_schema_validation");
  assert.equal(body.code, "third_party_schema_mismatch");
  assert.equal(body.schema.mismatchAt, 4);
});
