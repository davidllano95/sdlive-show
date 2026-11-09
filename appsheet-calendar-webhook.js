// Authenticated AppSheet-to-SD.Live Google Calendar reconciliation entry point.
// The webhook never trusts AppSheet row payloads; REGISTRO in Google Sheets is canonical.
const SECRET_NAME = "APPSHEET_CALENDAR_WEBHOOK_SECRET";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function constantTimeEquals(left, right) {
  if (left.length > 1024 || right.length > 1024) return false;
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export async function runCalendarReconciliation(sync, { maxPasses = 5 } = {}) {
  const summary = { passes: 0, created: 0, updated: 0, deleted: 0, unchanged: 0 };
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const result = await sync();
    if (!result?.available) throw new Error("Google Calendar reconciliation unavailable");
    summary.passes += 1;
    for (const key of ["created", "updated", "deleted", "unchanged"]) {
      summary[key] += Number(result[key] || 0);
    }
    if (result.failed) throw new Error("Google Calendar reconciliation reported failed writes");
    if (!result.capped) return summary;
  }
  throw new Error("Google Calendar reconciliation exceeded the per-run write budget");
}

export async function handleAppSheetCalendarWebhook(request, env, sync) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const secret = typeof env?.[SECRET_NAME] === "string" ? env[SECRET_NAME] : "";
  if (secret.length < 32) {
    console.error("[SD.Live] AppSheet webhook secret is missing or too short");
    return json({ ok: false, error: "Integration not configured" }, 503);
  }

  const bearer = request.headers.get("Authorization") || "";
  if (!constantTimeEquals(bearer, `Bearer ${secret}`)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const summary = await runCalendarReconciliation(sync);
    return json({ ok: true, source: "AppSheet REGISTRO", ...summary });
  } catch (error) {
    console.error("[SD.Live] AppSheet Calendar reconciliation failed", error);
    return json({ ok: false, error: "Google Calendar synchronization failed; retry later" }, 503);
  }
}
