import {
  SITE_PRESENTATION_DEFAULT_CONTENT,
  SITE_PRESENTATION_KEY,
  cloneSitePresentationDefault,
  validateSitePresentationDraft
} from "./site-presentation-content.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function decodeBlobText(blob) {
  if (!Array.isArray(blob)) throw new Error("Expected D1 BLOB byte array");
  return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(blob));
}

async function readBody(request) {
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const text = await request.text();
  if (text.length > 100000) throw new Error("Request body is too large");
  return JSON.parse(text);
}

async function getRow(env) {
  return env.CMS_DB.prepare(`
    SELECT id, section, market, route,
      CAST(draft_json AS BLOB) AS draft_blob,
      CAST(published_json AS BLOB) AS published_blob,
      updated_at, published_at
    FROM cms_entries
    WHERE section = ? AND market = ? AND route = ?
    LIMIT 1
  `).bind(SITE_PRESENTATION_KEY.section, SITE_PRESENTATION_KEY.market, SITE_PRESENTATION_KEY.route).first();
}

function parseValidated(blob) {
  const content = JSON.parse(decodeBlobText(blob));
  validateSitePresentationDraft(content);
  return content;
}

function entry(row) {
  if (!row) {
    return {
      id: null,
      section: SITE_PRESENTATION_KEY.section,
      market: SITE_PRESENTATION_KEY.market,
      route: SITE_PRESENTATION_KEY.route,
      updatedAt: null,
      publishedAt: null,
      hasUnpublishedChanges: false,
      source: "static-default",
      draft: cloneSitePresentationDefault(),
      published: cloneSitePresentationDefault()
    };
  }
  const draftText = decodeBlobText(row.draft_blob);
  const publishedText = decodeBlobText(row.published_blob);
  return {
    id: row.id,
    section: row.section,
    market: row.market,
    route: row.route,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    hasUnpublishedChanges: draftText !== publishedText,
    source: "cms",
    draft: parseValidated(row.draft_blob),
    published: parseValidated(row.published_blob)
  };
}

async function saveDraft(env, serialized, email) {
  const current = await getRow(env);
  if (current) {
    await env.CMS_DB.batch([
      env.CMS_DB.prepare("UPDATE cms_entries SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(serialized, current.id),
      env.CMS_DB.prepare("INSERT INTO cms_revisions (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, 'save', ?)").bind(SITE_PRESENTATION_KEY.section, SITE_PRESENTATION_KEY.market, SITE_PRESENTATION_KEY.route, serialized, email)
    ]);
  } else {
    const publishedDefault = JSON.stringify(SITE_PRESENTATION_DEFAULT_CONTENT);
    await env.CMS_DB.batch([
      env.CMS_DB.prepare("INSERT INTO cms_entries (section, market, route, draft_json, published_json, updated_at, published_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(SITE_PRESENTATION_KEY.section, SITE_PRESENTATION_KEY.market, SITE_PRESENTATION_KEY.route, serialized, publishedDefault),
      env.CMS_DB.prepare("INSERT INTO cms_revisions (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, 'save', ?)").bind(SITE_PRESENTATION_KEY.section, SITE_PRESENTATION_KEY.market, SITE_PRESENTATION_KEY.route, serialized, email)
    ]);
  }
  return entry(await getRow(env));
}

async function publish(env, email) {
  const current = await getRow(env);
  if (!current) throw new Error("Save a Site presentation Draft before publishing");
  const draftText = decodeBlobText(current.draft_blob);
  validateSitePresentationDraft(JSON.parse(draftText));
  await env.CMS_DB.batch([
    env.CMS_DB.prepare("UPDATE cms_entries SET published_json = draft_json, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(current.id),
    env.CMS_DB.prepare("INSERT INTO cms_revisions (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, 'publish', ?)").bind(SITE_PRESENTATION_KEY.section, SITE_PRESENTATION_KEY.market, SITE_PRESENTATION_KEY.route, draftText, email)
  ]);
  return entry(await getRow(env));
}

async function revisions(env) {
  const result = await env.CMS_DB.prepare(`
    SELECT id, revision_type, actor_email, created_at
    FROM cms_revisions
    WHERE section = ? AND market = ? AND route = ?
    ORDER BY id DESC LIMIT 30
  `).bind(SITE_PRESENTATION_KEY.section, SITE_PRESENTATION_KEY.market, SITE_PRESENTATION_KEY.route).all();
  return result.results || [];
}

export async function readPublishedSitePresentation(env) {
  const row = await getRow(env);
  if (!row) return { content: cloneSitePresentationDefault(), publishedAt: null, source: "static-default" };
  return { content: parseValidated(row.published_blob), publishedAt: row.published_at || null, source: "cms" };
}

export async function handleSitePresentationApi(request, env, { verifyAdmin = null } = {}) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const publicPath = "/api/content/site-presentation";
  const adminPath = "/api/admin/content/site-presentation";

  if (path === publicPath && request.method === "GET") {
    try {
      const published = await readPublishedSitePresentation(env);
      return json({ ok: true, section: SITE_PRESENTATION_KEY.section, ...published });
    } catch (error) {
      console.error("[SD.Live] site presentation public read failed", error);
      return json({ ok: true, section: SITE_PRESENTATION_KEY.section, content: cloneSitePresentationDefault(), source: "static-default", publishedAt: null });
    }
  }

  if (!path.startsWith(adminPath)) return null;
  if (typeof verifyAdmin !== "function") return json({ ok: false, error: "Unauthorized" }, 403);
  const user = await verifyAdmin(request, env);
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 403);

  if (path === adminPath && request.method === "GET") {
    try { return json({ ok: true, entry: entry(await getRow(env)) }); }
    catch (error) { return json({ ok: false, error: "Could not read Site presentation", detail: String(error?.message || error) }, 500); }
  }
  if (path === adminPath && request.method === "PUT") {
    try {
      const body = await readBody(request);
      const serialized = validateSitePresentationDraft(body?.draft);
      return json({ ok: true, message: "Site presentation Draft saved; Published unchanged", entry: await saveDraft(env, serialized, user.email) });
    } catch (error) { return json({ ok: false, error: "Could not save Site presentation Draft", detail: String(error?.message || error) }, 400); }
  }
  if (path === `${adminPath}/publish` && request.method === "POST") {
    try { return json({ ok: true, message: "Site presentation published to D1", entry: await publish(env, user.email) }); }
    catch (error) { return json({ ok: false, error: "Could not publish Site presentation", detail: String(error?.message || error) }, 400); }
  }
  if (path === `${adminPath}/revisions` && request.method === "GET") {
    try { return json({ ok: true, revisions: await revisions(env) }); }
    catch { return json({ ok: false, error: "Could not read Site presentation revision history" }, 500); }
  }
  return json({ ok: false, error: "Site presentation API route not found" }, 404);
}
