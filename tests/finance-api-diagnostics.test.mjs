import test from "node:test";
import assert from "node:assert/strict";

import {
  financeHealthDiagnostic,
  handleFinanceApi
} from "../finance-api.js";

const BASE_ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  GOOGLE_FINANCE_SPREADSHEET_ID: "spreadsheet-id"
};

test("finance health diagnostic classifies missing configuration without exposing values", () => {
  assert.deepEqual(
    financeHealthDiagnostic(new Error("Missing finance configuration: GOOGLE_OAUTH_REFRESH_TOKEN")),
    {
      stage: "configuration",
      code: "missing_GOOGLE_OAUTH_REFRESH_TOKEN"
    }
  );
});

test("finance health diagnostic classifies OAuth and Sheets HTTP failures", () => {
  assert.deepEqual(
    financeHealthDiagnostic(new Error("Google OAuth token exchange failed with status 400")),
    {
      stage: "oauth_exchange",
      code: "oauth_http_400"
    }
  );

  assert.deepEqual(
    financeHealthDiagnostic(new Error("Google Sheets read failed with status 403")),
    {
      stage: "sheets_read",
      code: "sheets_http_403"
    }
  );
});

test("admin finance health returns only safe OAuth failure metadata", async () => {
  const response = await handleFinanceApi(
    new Request("https://sdlive.show/api/admin/finance/health"),
    BASE_ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl: async () => new Response("invalid_grant", { status: 400 })
    }
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    source: "google-sheets",
    access: "read-only",
    error: "Finance source unavailable",
    stage: "oauth_exchange",
    code: "oauth_http_400"
  });
});
