import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import { handleFinanceDashboardApi } from "../finance-dashboard-api.js";

const INDEX = Object.fromEntries(
  EXPECTED_FINANCE_HEADERS.map((header, index) => [header, index])
);

function row(values) {
  const result = Array(EXPECTED_FINANCE_HEADERS.length).fill("");
  for (const [field, value] of Object.entries(values)) result[INDEX[field]] = value;
  return result;
}

function fakeDb() {
  let settings = null;
  return {
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async run() {
          if (sql.includes("INSERT INTO finance_settings")) {
            settings = {
              tax_reserve_enabled: this.args[0],
              tax_reserve_cop_percent: this.args[1],
              tax_reserve_usd_percent: this.args[2],
              tax_reserve_apply_from: this.args[3],
              updated_at: "2026-08-22 23:00:00",
              updated_by: this.args[4]
            };
          }
          return { success: true };
        },
        async first() {
          if (sql.includes("FROM finance_settings")) return settings;
          return null;
        }
      };
      return statement;
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

const PAID_ROW = row({
  "Fecha trabajo": "2026-01-05",
  "Año": 2026,
  "Month Number": 1,
  "Cliente": "Client A",
  "Moneda": "COP",
  "Valor bruto": 1000000,
  "Impuestos / Fees": 100000,
  "Valor Neto": 900000,
  "Estado": "Pagado",
  "Fecha cuenta enviada": "2026-01-06",
  "Fecha pago": "2026-01-16",
  "Año Pago": 2026,
  "Month Number (pago)": 1,
  "Valor Recibido": 900000,
  "ID": "private-row-id",
  "Notas": "private note",
  "NUM CONTACTO": "+57-private"
});

function financeFetch(url) {
  if (String(url) === "https://oauth2.googleapis.com/token") {
    return Promise.resolve(new Response(JSON.stringify({ access_token: "access-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
  }
  return Promise.resolve(new Response(JSON.stringify({
    range: "REGISTRO!A1:AA3000",
    majorDimension: "ROWS",
    values: [[...EXPECTED_FINANCE_HEADERS], PAID_ROW]
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }));
}

test("finance dashboard endpoint returns summary plus analytics without raw private fields", async () => {
  const response = await handleFinanceDashboardApi(
    new Request("https://sdlive.show/api/admin/finance/dashboard"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl: financeFetch,
      now: new Date("2026-08-22T17:00:00-05:00")
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.access, "read-only");
  assert.equal(body.summary.received.amountByCurrency.COP, 900000);
  assert.equal(body.analytics.byYear["2026"].received.COP.total, 900000);
  assert.equal(body.analytics.byYear["2026"].received.COP.averageMonthCount, 8);

  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("private-row-id"), false);
  assert.equal(serialized.includes("private note"), false);
  assert.equal(serialized.includes("+57-private"), false);
});

test("tax reserve settings are admin-only and persist user-selected rates", async () => {
  const unauthorized = await handleFinanceDashboardApi(
    new Request("https://sdlive.show/api/admin/finance/settings"),
    ENV,
    { verifyAdmin: async () => null }
  );
  assert.equal(unauthorized.status, 403);

  const response = await handleFinanceDashboardApi(
    new Request("https://sdlive.show/api/admin/finance/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxReserve: {
          enabled: true,
          rates: { COP: 25, USD: 18.5 },
          applyFrom: "2026-09-01"
        }
      })
    }),
    ENV,
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.settings.taxReserve.enabled, true);
  assert.equal(body.settings.taxReserve.rates.COP, 25);
  assert.equal(body.settings.taxReserve.rates.USD, 18.5);
  assert.equal(body.settings.taxReserve.applyFrom, "2026-09-01");
  assert.equal(body.settings.updatedBy, "sam@sdlive.show");
});
