import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import { EXPECTED_THIRD_PARTY_HEADERS } from "../finance-third-party-dashboard-api.js";
import { handleFinanceThirdPartyOperationsApi } from "../finance-third-party-operations-api.js";

const FINANCE_INDEX = Object.fromEntries(EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index]));
const THIRD_INDEX = Object.fromEntries(EXPECTED_THIRD_PARTY_HEADERS.map((header, index) => [header, index]));

function financeRow(values) {
  const row = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  Object.entries(values).forEach(([field, value]) => { row[FINANCE_INDEX[field]] = value; });
  return row;
}

function thirdRow(values) {
  const row = Array(EXPECTED_THIRD_PARTY_HEADERS.length).fill("");
  Object.entries(values).forEach(([field, value]) => { row[THIRD_INDEX[field]] = value; });
  return row;
}

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  GOOGLE_FINANCE_SPREADSHEET_ID: "spreadsheet-id"
};

const parents = [
  financeRow({
    "ID": "wait-1",
    "Cliente": "Client A",
    "Proyecto / Show": "Waiting show",
    "Moneda": "COP",
    "Valor bruto": 1000000,
    "Estado": "Cuenta enviada",
    "Fecha cuenta enviada": "2026-09-01",
    "Cobro terceros": 200000
  }),
  financeRow({
    "ID": "ready-1",
    "Cliente": "Client B",
    "Proyecto / Show": "Ready show",
    "Moneda": "COP",
    "Valor bruto": 1000000,
    "Estado": "Pagado",
    "Valor Recibido": 900000,
    "Cobro terceros": 200000
  }),
  financeRow({
    "ID": "blocked-1",
    "Cliente": "LiventX",
    "Proyecto / Show": "Blocked show",
    "Moneda": "COP",
    "Valor bruto": 500000,
    "Estado": "Cuenta enviada",
    "Fecha cuenta enviada": "2026-09-01",
    "Fecha evaluación": "2026-09-02",
    "Cobro terceros": 100000
  }),
  financeRow({
    "ID": "usd-ready",
    "Cliente": "Client C",
    "Proyecto / Show": "USD show",
    "Moneda": "USD",
    "Valor bruto": 1000,
    "Estado": "Pagado",
    "Valor Recibido": 900,
    "Cobro terceros": 200
  })
];

function makeThirdRows() {
  return [
    thirdRow({
      "ID tercero": "third-wait",
      "Trabajo ID": "wait-1",
      "Tercero": "Nicolas",
      "Bruto tercero": 200000
    }),
    thirdRow({
      "ID tercero": "third-ready",
      "Trabajo ID": "ready-1",
      "Tercero": "Nicolas",
      "Bruto tercero": 200000,
      "Valor pagado tercero": 40000
    }),
    thirdRow({
      "ID tercero": "third-blocked",
      "Trabajo ID": "blocked-1",
      "Tercero": "Nicolas",
      "Bruto tercero": 100000
    }),
    thirdRow({
      "ID tercero": "third-usd",
      "Trabajo ID": "usd-ready",
      "Tercero": "Alex",
      "Bruto tercero": 200
    })
  ];
}

function fakeFinanceResponse() {
  return new Response(JSON.stringify({
    range: "REGISTRO!A1:AC3000",
    majorDimension: "ROWS",
    values: [[...EXPECTED_FINANCE_HEADERS], ...parents]
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function createFakeFetch() {
  let thirdRows = makeThirdRows();
  const writes = [];

  async function fakeFetch(url, options = {}) {
    const value = String(url);
    if (value === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const decoded = decodeURIComponent(value);
    if (options.method === "PUT" && decoded.includes("PAGO_TERCEROS!J")) {
      const body = JSON.parse(options.body);
      writes.push({ url: decoded, body });
      const match = decoded.match(/PAGO_TERCEROS!J(\d+):K\1/);
      assert.ok(match, "write range should target one J:K row");
      const sheetRow = Number(match[1]);
      const index = sheetRow - 2;
      thirdRows[index] = [...thirdRows[index]];
      thirdRows[index][THIRD_INDEX["Valor pagado tercero"]] = body.values[0][0];
      thirdRows[index][THIRD_INDEX["Fecha pago tercero"]] = body.values[0][1];
      return new Response(JSON.stringify({ updatedRange: body.range }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (decoded.includes("PAGO_TERCEROS!A1:N3000")) {
      return new Response(JSON.stringify({
        range: "PAGO_TERCEROS!A1:N3000",
        majorDimension: "ROWS",
        values: [[...EXPECTED_THIRD_PARTY_HEADERS], ...thirdRows]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (decoded.includes("REGISTRO!A1:AC3000")) return fakeFinanceResponse();
    throw new Error(`Unexpected fetch: ${value}`);
  }

  return { fakeFetch, writes };
}

const verifyAdmin = async () => ({ email: "sam@sdlive.show" });

test("operational obligations only include collection-ready and client-paid rows", async () => {
  const { fakeFetch } = createFakeFetch();
  const response = await handleFinanceThirdPartyOperationsApi(
    new Request("https://sdlive.show/api/admin/finance/third-party/obligations"),
    ENV,
    { verifyAdmin, fetchImpl: fakeFetch }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.count, 3);
  assert.equal(body.items.some((item) => item.project === "Blocked show"), false);

  const waiting = body.items.find((item) => item.project === "Waiting show");
  assert.equal(waiting.status, "waiting_client");
  assert.equal(waiting.amount, 200000);
  assert.equal(waiting.canMarkPaid, false);

  const ready = body.items.find((item) => item.project === "Ready show");
  assert.equal(ready.status, "ready_to_pay");
  assert.equal(ready.amount, 140000);
  assert.equal(ready.canMarkPaid, true);
  assert.match(ready.ref, /^tp_[0-9a-f]{16}$/);

  assert.deepEqual(body.totals.waitingClient, { count: 1, COP: 200000, USD: 0 });
  assert.deepEqual(body.totals.readyToPay, { count: 2, COP: 140000, USD: 180 });
});

test("mark-paid re-reads facts, writes only J/K, and removes the paid obligation", async () => {
  const { fakeFetch, writes } = createFakeFetch();
  const listResponse = await handleFinanceThirdPartyOperationsApi(
    new Request("https://sdlive.show/api/admin/finance/third-party/obligations"),
    ENV,
    { verifyAdmin, fetchImpl: fakeFetch }
  );
  const listed = await listResponse.json();
  const ready = listed.items.find((item) => item.project === "Ready show");

  const response = await handleFinanceThirdPartyOperationsApi(
    new Request("https://sdlive.show/api/admin/finance/third-party/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: ready.ref })
    }),
    ENV,
    {
      verifyAdmin,
      fetchImpl: fakeFetch,
      now: new Date("2026-09-06T22:30:00-05:00")
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.payment.amount, 140000);
  assert.equal(body.payment.date, "2026-09-06");
  assert.equal(body.items.some((item) => item.ref === ready.ref), false);

  assert.equal(writes.length, 1);
  assert.match(writes[0].url, /PAGO_TERCEROS!J3:K3/);
  assert.deepEqual(writes[0].body.values, [[180000, "2026-09-06"]]);
});

test("mark-paid rejects an obligation still waiting on the client", async () => {
  const { fakeFetch, writes } = createFakeFetch();
  const listResponse = await handleFinanceThirdPartyOperationsApi(
    new Request("https://sdlive.show/api/admin/finance/third-party/obligations"),
    ENV,
    { verifyAdmin, fetchImpl: fakeFetch }
  );
  const listed = await listResponse.json();
  const waiting = listed.items.find((item) => item.project === "Waiting show");

  const response = await handleFinanceThirdPartyOperationsApi(
    new Request("https://sdlive.show/api/admin/finance/third-party/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: waiting.ref })
    }),
    ENV,
    { verifyAdmin, fetchImpl: fakeFetch }
  );

  assert.equal(response.status, 409);
  assert.equal(writes.length, 0);
});
