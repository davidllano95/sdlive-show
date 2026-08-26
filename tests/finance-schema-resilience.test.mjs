import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_FINANCE_HEADERS } from "../finance-api.js";
import { handleFinanceDashboardApi } from "../finance-dashboard-api.js";

function fakeDb() {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {
          return { success: true };
        },
        async first() {
          return null;
        }
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

function rowFor(headers, values) {
  const result = Array(headers.length).fill("");
  const normalized = (value) => String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const index = new Map(headers.map((header, position) => [normalized(header), position]));
  for (const [field, value] of Object.entries(values)) {
    result[index.get(normalized(field))] = value;
  }
  return result;
}

test("Finance dashboard resolves canonical fields by header name instead of fixed column position", async () => {
  const headers = EXPECTED_FINANCE_HEADERS.filter((header) => header !== "Fecha fin");
  headers.splice(1, 0, "  FECHA FIN  ");

  // This test verifies header-name resilience, not clock boundaries. Keep the
  // end date deliberately far in the future so the assertion cannot become
  // date-sensitive as the real calendar advances.
  const ongoing = rowFor(headers, {
    "Fecha trabajo": "2026-08-20",
    "Fecha fin": "2099-12-31",
    Cliente: "Multi-day client",
    "Proyecto / Show": "Ongoing run",
    Moneda: "COP",
    "Valor bruto": 1000000,
    "Valor Neto": 900000,
    Estado: "Pendiente Envio",
    ID: "private-id"
  });

  const fetchImpl = async (url) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      range: "REGISTRO!A1:AB3000",
      majorDimension: "ROWS",
      values: [headers, ongoing]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const response = await handleFinanceDashboardApi(
    new Request("https://sdlive.show/api/admin/finance/dashboard"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl,
      now: new Date("2026-08-25T17:00:00-05:00")
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.schema.ok, true);
  assert.equal(body.schema.columnCount, 28);
  assert.equal(body.summary.toInvoice.count, 0);
  assert.equal(body.summary.receivables.workflowBlockedCount, 1);
  assert.equal(body.summary.workQueues.blocked[0].client, "Multi-day client");
  assert.equal(body.summary.workQueues.blocked[0].endDate, "2099-12-31");
  assert.deepEqual(body.summary.workQueues.blocked[0].reasonCodes, ["work_date_future"]);
});