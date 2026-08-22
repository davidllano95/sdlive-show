const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const FINANCE_HEADER_RANGE = "REGISTRO!A1:AA1";

export const EXPECTED_FINANCE_HEADERS = Object.freeze([
  "Fecha trabajo",
  "Mes",
  "Año",
  "Cliente",
  "Proyecto / Show",
  "Rol",
  "Moneda",
  "Valor bruto",
  "Impuestos / Fees",
  "Valor Neto",
  "Estado",
  "Fecha cuenta enviada",
  "Fecha evaluación",
  "Fecha firma",
  "Fecha pago",
  "Método de pago",
  "Días sin pagar",
  "Notas",
  "Month Number",
  "Año Pago",
  "Month Number (pago)",
  "Mes de pago",
  "Rango Aging",
  "ID",
  "Valor Recibido",
  "MES PAGO KEY",
  "NUM CONTACTO"
]);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function requiredEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`Missing finance configuration: ${name}`);
  return value;
}

export function validateFinanceHeaders(headers) {
  if (!Array.isArray(headers)) {
    return {
      ok: false,
      columnCount: 0,
      mismatchAt: 0
    };
  }

  const mismatchAt = EXPECTED_FINANCE_HEADERS.findIndex(
    (expected, index) => headers[index] !== expected
  );

  if (
    mismatchAt !== -1 ||
    headers.length !== EXPECTED_FINANCE_HEADERS.length
  ) {
    return {
      ok: false,
      columnCount: headers.length,
      mismatchAt: mismatchAt === -1
        ? Math.min(headers.length, EXPECTED_FINANCE_HEADERS.length)
        : mismatchAt
    };
  }

  return {
    ok: true,
    columnCount: headers.length,
    mismatchAt: null
  };
}

export async function fetchGoogleAccessToken(env, fetchImpl = fetch) {
  const clientId = requiredEnv(env, "GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requiredEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = requiredEnv(env, "GOOGLE_OAUTH_REFRESH_TOKEN");

  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const accessToken = String(data?.access_token || "").trim();

  if (!accessToken) {
    throw new Error("Google OAuth token exchange returned no access token");
  }

  return accessToken;
}

export async function readFinanceHeader(env, fetchImpl = fetch) {
  const spreadsheetId = requiredEnv(env, "GOOGLE_FINANCE_SPREADSHEET_ID");
  const accessToken = await fetchGoogleAccessToken(env, fetchImpl);
  const range = encodeURIComponent(FINANCE_HEADER_RANGE);
  const spreadsheet = encodeURIComponent(spreadsheetId);
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheet}/values/${range}?majorDimension=ROWS`;

  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Sheets read failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const headers = data?.values?.[0];

  if (!Array.isArray(headers)) {
    throw new Error("Google Sheets returned no REGISTRO header row");
  }

  return {
    range: data?.range || FINANCE_HEADER_RANGE,
    headers
  };
}

export async function handleFinanceApi(
  request,
  env,
  { verifyAdmin, fetchImpl = fetch } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;

  if (!path.startsWith("/api/admin/finance")) return null;

  if (typeof verifyAdmin !== "function") {
    return jsonResponse({ ok: false, error: "Admin verification unavailable" }, 503);
  }

  const user = await verifyAdmin(request, env);
  if (!user) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 403);
  }

  if (path !== "/api/admin/finance/health") {
    return jsonResponse({ ok: false, error: "Finance API route not found" }, 404);
  }

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const result = await readFinanceHeader(env, fetchImpl);
    const schema = validateFinanceHeaders(result.headers);

    if (!schema.ok) {
      return jsonResponse({
        ok: false,
        source: "google-sheets",
        access: "read-only",
        schema
      }, 503);
    }

    return jsonResponse({
      ok: true,
      source: "google-sheets",
      access: "read-only",
      range: result.range,
      schema
    });
  } catch (error) {
    console.error(
      "[SD.Live] Finance health check failed",
      String(error?.message || error)
    );

    return jsonResponse({
      ok: false,
      source: "google-sheets",
      access: "read-only",
      error: "Finance source unavailable"
    }, 503);
  }
}
