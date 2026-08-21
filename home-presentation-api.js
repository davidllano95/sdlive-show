import {
  PRESENTATION_SECTION_DEFAULTS,
  PRESENTATION_SECTION_KEYS,
  clonePresentationDefault,
  validatePresentationSection
} from "./home-presentation-content.js";

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

function sectionFromPath(path) {
  return path.match(/^\/api\/(?:admin\/)?content\/(rental|contact)(?:\/.*)?$/)?.[1] || null;
}

async function readBody(request) {
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const text = await request.text();
  if (text.length > 220000) throw new Error("Request body is too large");
  return JSON.parse(text);
}

async function getRow(env, section) {
  const key = PRESENTATION_SECTION_KEYS[section];
  return env.CMS_DB.prepare(`
    SELECT id, section, market, route,
      CAST(draft_json AS BLOB) AS draft_blob,
      CAST(published_json AS BLOB) AS published_blob,
      updated_at, published_at
    FROM cms_entries
    WHERE section = ? AND market = ? AND route = ?
    LIMIT 1
  `).bind(key.section, key.market, key.route).first();
}

function parseValidated(section, blob) {
  const content = JSON.parse(decodeBlobText(blob));
  validatePresentationSection(section, content);
  return content;
}

function entry(section, row) {
  const key = PRESENTATION_SECTION_KEYS[section];
  if (!row) {
    const fallback = clonePresentationDefault(section);
    return {
      id: null,
      section,
      market: key.market,
      route: key.route,
      updatedAt: null,
      publishedAt: null,
      hasUnpublishedChanges: false,
      source: "static-default",
      draft: fallback,
      published: clonePresentationDefault(section)
    };
  }
  const draftText = decodeBlobText(row.draft_blob);
  const publishedText = decodeBlobText(row.published_blob);
  return {
    id: row.id,
    section,
    market: row.market,
    route: row.route,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    hasUnpublishedChanges: draftText !== publishedText,
    source: "cms",
    draft: parseValidated(section, row.draft_blob),
    published: parseValidated(section, row.published_blob)
  };
}

async function saveDraft(env, section, serialized, email) {
  const key = PRESENTATION_SECTION_KEYS[section];
  const current = await getRow(env, section);
  if (current) {
    await env.CMS_DB.batch([
      env.CMS_DB.prepare("UPDATE cms_entries SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(serialized, current.id),
      env.CMS_DB.prepare(`INSERT INTO cms_revisions (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, 'save', ?)`).bind(key.section, key.market, key.route, serialized, email)
    ]);
  } else {
    const publishedDefault = JSON.stringify(PRESENTATION_SECTION_DEFAULTS[section]);
    await env.CMS_DB.batch([
      env.CMS_DB.prepare(`INSERT INTO cms_entries (section, market, route, draft_json, published_json, updated_at, published_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(key.section, key.market, key.route, serialized, publishedDefault),
      env.CMS_DB.prepare(`INSERT INTO cms_revisions (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, 'save', ?)`).bind(key.section, key.market, key.route, serialized, email)
    ]);
  }
  return entry(section, await getRow(env, section));
}

async function publish(env, section, email) {
  const key = PRESENTATION_SECTION_KEYS[section];
  const current = await getRow(env, section);
  if (!current) throw new Error(`Save a ${section} Draft before publishing`);
  const draftText = decodeBlobText(current.draft_blob);
  validatePresentationSection(section, JSON.parse(draftText));
  await env.CMS_DB.batch([
    env.CMS_DB.prepare("UPDATE cms_entries SET published_json = draft_json, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(current.id),
    env.CMS_DB.prepare(`INSERT INTO cms_revisions (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, 'publish', ?)`).bind(key.section, key.market, key.route, draftText, email)
  ]);
  return entry(section, await getRow(env, section));
}

async function revisions(env, section) {
  const key = PRESENTATION_SECTION_KEYS[section];
  const result = await env.CMS_DB.prepare(`
    SELECT id, revision_type, actor_email, created_at
    FROM cms_revisions
    WHERE section = ? AND market = ? AND route = ?
    ORDER BY id DESC LIMIT 30
  `).bind(key.section, key.market, key.route).all();
  return result.results || [];
}

function publicPayload(section, row) {
  return {
    ok: true,
    section,
    source: row ? "cms" : "static-default",
    publishedAt: row?.published_at || null,
    content: row ? parseValidated(section, row.published_blob) : clonePresentationDefault(section)
  };
}

export async function handlePresentationSectionsApi(request, env, { verifyAdmin = null } = {}) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const section = sectionFromPath(path);
  if (!section) return null;
  const publicPath = `/api/content/${section}`;
  const adminPath = `/api/admin/content/${section}`;

  if (path === publicPath && request.method === "GET") {
    try { return json(publicPayload(section, await getRow(env, section))); }
    catch (error) {
      console.error(`[SD.Live] ${section} public read failed`, error);
      return json(publicPayload(section, null));
    }
  }

  if (!path.startsWith(adminPath)) return null;
  if (typeof verifyAdmin !== "function") return json({ ok: false, error: "Unauthorized" }, 403);
  const user = await verifyAdmin(request, env);
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 403);

  if (path === adminPath && request.method === "GET") {
    try { return json({ ok: true, entry: entry(section, await getRow(env, section)) }); }
    catch (error) { return json({ ok: false, error: `Could not read ${section} content`, detail: String(error?.message || error) }, 500); }
  }
  if (path === adminPath && request.method === "PUT") {
    try {
      const body = await readBody(request);
      const serialized = validatePresentationSection(section, body?.draft);
      return json({ ok: true, message: `${section} Draft saved; Published unchanged`, entry: await saveDraft(env, section, serialized, user.email) });
    } catch (error) { return json({ ok: false, error: `Could not save ${section} Draft`, detail: String(error?.message || error) }, 400); }
  }
  if (path === `${adminPath}/publish` && request.method === "POST") {
    try { return json({ ok: true, message: `${section} published to D1`, entry: await publish(env, section, user.email) }); }
    catch (error) { return json({ ok: false, error: `Could not publish ${section}`, detail: String(error?.message || error) }, 400); }
  }
  if (path === `${adminPath}/revisions` && request.method === "GET") {
    try { return json({ ok: true, revisions: await revisions(env, section) }); }
    catch { return json({ ok: false, error: `Could not read ${section} revision history` }, 500); }
  }
  return json({ ok: false, error: `${section} API route not found` }, 404);
}

export { sectionFromPath };
