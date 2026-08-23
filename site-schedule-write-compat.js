import {
  handleSiteScheduleApi,
  normalizeSiteScheduleOverride,
  readSiteSchedule
} from "./site-schedule-api.js";

const SITE_SCHEDULE_KEY = Object.freeze({
  section: "site_schedule",
  market: "global",
  route: "/admin/calendar"
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const text = await request.text();
  if (text.length > 80000) throw new Error("Request body is too large");
  return JSON.parse(text);
}

async function getScheduleRow(env) {
  return env.CMS_DB.prepare(`
    SELECT id
    FROM cms_entries
    WHERE section = ? AND market = ? AND route = ?
    LIMIT 1
  `).bind(
    SITE_SCHEDULE_KEY.section,
    SITE_SCHEDULE_KEY.market,
    SITE_SCHEDULE_KEY.route
  ).first();
}

async function persistSchedule(env, schedule, userEmail) {
  const serialized = JSON.stringify(schedule);
  const current = await getScheduleRow(env);

  const revision = env.CMS_DB.prepare(`
    INSERT INTO cms_revisions (
      section,
      market,
      route,
      content_json,
      revision_type,
      actor_email
    )
    VALUES (?, ?, ?, ?, 'publish', ?)
  `).bind(
    SITE_SCHEDULE_KEY.section,
    SITE_SCHEDULE_KEY.market,
    SITE_SCHEDULE_KEY.route,
    serialized,
    userEmail
  );

  if (current?.id) {
    await env.CMS_DB.batch([
      env.CMS_DB.prepare(`
        UPDATE cms_entries
        SET
          draft_json = ?,
          published_json = ?,
          updated_at = CURRENT_TIMESTAMP,
          published_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(serialized, serialized, current.id),
      revision
    ]);
  } else {
    await env.CMS_DB.batch([
      env.CMS_DB.prepare(`
        INSERT INTO cms_entries (
          section,
          market,
          route,
          draft_json,
          published_json,
          updated_at,
          published_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        SITE_SCHEDULE_KEY.section,
        SITE_SCHEDULE_KEY.market,
        SITE_SCHEDULE_KEY.route,
        serialized,
        serialized
      ),
      revision
    ]);
  }

  return readSiteSchedule(env);
}

async function handleWrite(request, env, verifyAdmin, eventKey) {
  if (typeof verifyAdmin !== "function") {
    return json({ ok: false, error: "Site Schedule auth unavailable" }, 503);
  }

  const user = await verifyAdmin(request, env);
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 403);

  const current = await readSiteSchedule(env);
  const next = clone(current.schedule || { version: 1, overrides: {} });
  next.version = 1;
  next.overrides = next.overrides && typeof next.overrides === "object"
    ? next.overrides
    : {};

  if (request.method === "DELETE") {
    delete next.overrides[eventKey];
    const saved = await persistSchedule(env, next, user.email);
    return json({
      ok: true,
      deleted: true,
      eventKey,
      updatedAt: saved.updatedAt,
      schedule: clone(saved.schedule)
    });
  }

  if (request.method !== "PUT") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: error.message || "Invalid JSON body" }, 400);
  }

  const normalized = normalizeSiteScheduleOverride(body);
  if (!normalized.ok) {
    return json({
      ok: false,
      error: "Invalid Site Schedule override",
      fields: normalized.errors
    }, 400);
  }

  next.overrides[eventKey] = normalized.value;
  const saved = await persistSchedule(env, next, user.email);

  return json({
    ok: true,
    saved: true,
    eventKey,
    updatedAt: saved.updatedAt,
    override: clone(saved.schedule.overrides[eventKey])
  });
}

export async function handleSiteScheduleApiCompat(
  request,
  env,
  { verifyAdmin } = {}
) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const match = path.match(/^\/api\/admin\/site-schedule\/events\/(evt_[0-9a-f]{16})$/);

  if (match && (request.method === "PUT" || request.method === "DELETE")) {
    try {
      return await handleWrite(request, env, verifyAdmin, match[1]);
    } catch (error) {
      console.error("Site Schedule D1 write failed", error);
      return json({
        ok: false,
        error: "Could not update Site Schedule",
        code: "site_schedule_d1_write_failed"
      }, 503);
    }
  }

  return handleSiteScheduleApi(request, env, { verifyAdmin });
}
