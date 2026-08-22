import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPECTED_FINANCE_HEADERS,
  handleFinanceApi,
  validateFinanceHeaders
} from "../finance-api.js";

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
  GOOGLE_FINANCE_SPREADSHEET_ID: "spreadsheet-id"
};

test("finance schema validator requires the documented REGISTRO header order", () => {
  assert.deepEqual(validateFinanceHeaders([...EXPECTED_FINANCE_HEADERS]), {
    ok: true,
    columnCount: 27,
    mismatchAt: null
  });

  const drifted = [...EXPECTED_FINANCE_HEADERS];
  drifted[10] = "Status";

  assert.deepEqual(validateFinanceHeaders(drifted), {
    ok: false,
    columnCount: 27,
    mismatchAt: 10
  });
});

test("finance health is admin-only", async () => {
  let fetchCalled = false;
  const response = await handleFinanceApi(
    new Request("https://sdlive.show/api/admin/finance/health"),
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
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Unauthorized"
  });
});

test("finance health exchanges refresh token and reads only REGISTRO headers", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url) === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({
        access_token: "temporary-access-token",
        expires_in: 3600,
        token_type: "Bearer"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      range: "REGISTRO!A1:AA1",
      majorDimension: "ROWS",
      values: [[...EXPECTED_FINANCE_HEADERS]]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const response = await handleFinanceApi(
    new Request("https://sdlive.show/api/admin/finance/health"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    source: "google-sheets",
    access: "read-only",
    range: "REGISTRO!A1:AA1",
    schema: {
      ok: true,
      columnCount: 27,
      mismatchAt: null
    }
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(
    calls[0].options.headers["Content-Type"],
    "application/x-www-form-urlencoded"
  );

  const tokenBody = new URLSearchParams(calls[0].options.body);
  assert.equal(tokenBody.get("grant_type"), "refresh_token");
  assert.equal(tokenBody.get("refresh_token"), "refresh-token");

  assert.match(
    calls[1].url,
    /sheets\.googleapis\.com\/v4\/spreadsheets\/spreadsheet-id\/values\/REGISTRO/
  );
  assert.equal(
    calls[1].options.headers.Authorization,
    "Bearer temporary-access-token"
  );
});

test("finance health fails closed when REGISTRO schema drifts", async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;

    if (call === 1) {
      return new Response(JSON.stringify({ access_token: "temporary-access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const drifted = [...EXPECTED_FINANCE_HEADERS];
    drifted.pop();

    return new Response(JSON.stringify({
      range: "REGISTRO!A1:Z1",
      values: [drifted]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const response = await handleFinanceApi(
    new Request("https://sdlive.show/api/admin/finance/health"),
    ENV,
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      fetchImpl
    }
  );

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.access, "read-only");
  assert.equal(body.schema.ok, false);
  assert.equal(body.schema.columnCount, 26);
});
