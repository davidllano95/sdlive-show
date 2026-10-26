import { decodeD1Text } from "./media-api.js";

const SECTION = "work-portfolio";
const MARKET = "all";
const ROUTE = "work";
const MAX_ITEMS = 200;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function text(value, max = 400, required = false) {
  const result = String(value ?? "").trim();
  if (result.length > max || (required && !result)) throw new Error("Invalid or oversized text field");
  return result;
}
function image(value) {
  const source = text(value, 320);
  if (!source) return "";
  if (!/^assets\/media\/cms\/portfolio\/[a-zA-Z0-9._-]+\.(?:jpg|png|webp)$/.test(source)) {
    throw new Error("Images must be selected from the portfolio Media Library");
  }
  return source;
}
function videoUrl(value) {
  const source = text(value, 600);
  if (!source) return "";
  let url;
  try { url = new URL(source); } catch { throw new Error("Invalid video URL"); }
  if (url.protocol !== "https:" || !/^(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)$/.test(url.hostname)) {
    throw new Error("Use an HTTPS YouTube or Vimeo link");
  }
  return url.toString();
}
export function validateWorkPortfolio(value, { publishing = false } = {}) {
  if (!value || !Array.isArray(value.items) || value.items.length > MAX_ITEMS) {
    throw new Error("Portfolio requires an items array (maximum 200)");
  }
  const slugs = new Set();
  const items = value.items.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Invalid portfolio item");
    const slug = text(item.slug, 90, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) throw new Error("Invalid or duplicate slug");
    slugs.add(slug);
    const area = item.area || "technical";
    if (!["technical", "artistic", "both"].includes(area)) throw new Error("Invalid area");
    const kind = item.kind || "project";
    if (!["project", "piece"].includes(kind)) throw new Error("Invalid content type");
    const fit = item.fit || "cover";
    if (!["cover", "contain"].includes(fit)) throw new Error("Invalid image fit");
    const gallery = (item.gallery || []);
    if (!Array.isArray(gallery) || gallery.length > 30) throw new Error("Maximum 30 gallery images per publication");
    const media = gallery.map((g) => ({
      src: image(g?.src),
      alt: text(g?.alt, 200),
      caption: text(g?.caption, 500)
    })).filter((g) => g.src);
    const entry = {
      slug,
      title: text(item.title, 160, true),
      company: text(item.company, 160, true),
      client: text(item.client, 160),
      credit: text(item.credit, 180, true),
      discipline: text(item.discipline, 160),
      extra: text(item.extra, 300),
      extraEs: text(item.extraEs, 300),
      kind,
      area,
      featured: item.featured === true,
      published: item.published === true,
      order: Number.isFinite(Number(item.order)) ? Math.max(0, Math.min(99999, Math.floor(Number(item.order)))) : index * 10,
      cover: image(item.cover),
      coverAlt: text(item.coverAlt, 200),
      fit,
      description: {
        en: text(item.description?.en, 3000),
        es: text(item.description?.es, 3000)
      },
      gallery: media,
      video: videoUrl(item.video),
      rightsConfirmed: item.rightsConfirmed === true
    };
    if (publishing && entry.published && (entry.cover || entry.gallery.length || entry.video) && !entry.rightsConfirmed) {
      throw new Error(`Confirm media publication rights for "${entry.title}"`);
    }
    return entry;
  });
  return { items };
}
function decodeRowPart(row, field) {
  return row && row[field] != null ? validateWorkPortfolio(JSON.parse(decodeD1Text(row[field]))) : null;
}
async function readRow(env) {
  if (!env?.CMS_DB?.prepare) throw new Error("CMS database unavailable");
  return env.CMS_DB.prepare(`SELECT id, CAST(draft_json AS BLOB) draft_blob, CAST(published_json AS BLOB) published_blob,
    updated_at, published_at FROM cms_entries WHERE section=? AND market=? AND route=? LIMIT 1`)
    .bind(SECTION, MARKET, ROUTE).first();
}
async function readBody(request) {
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) throw new Error("Expected application/json");
  const raw = await request.text();
  if (raw.length > 500000) throw new Error("Request body too large");
  return JSON.parse(raw);
}
function entry(row) {
  return {
    source: row ? "cms" : "seed",
    updatedAt: row?.updated_at || null,
    publishedAt: row?.published_at || null,
    draft: decodeRowPart(row, "draft_blob"),
    published: decodeRowPart(row, "published_blob")
  };
}
async function addRevision(env, type, serialized, email) {
  return env.CMS_DB.prepare(`INSERT INTO cms_revisions
    (section, market, route, content_json, revision_type, actor_email) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(SECTION, MARKET, ROUTE, serialized, type, email);
}

export async function handleWorkPortfolioApi(request, env, { verifyAdmin = null } = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  if (path !== "/api/work/portfolio" && !path.startsWith("/api/admin/work/portfolio")) return null;
  if (request.method === "GET" && path === "/api/work/portfolio") {
    try {
      const row = await readRow(env);
      const published = decodeRowPart(row, "published_blob");
      return json({ ok: true, source: row ? "cms" : "seed", publishedAt: row?.published_at || null,
        content: published ? { items: published.items.filter((item) => item.published).sort((a,b) => a.order-b.order) } : null });
    } catch (error) {
      console.error("Work public read failed", error);
      return json({ ok: false, error: "Portfolio temporarily unavailable" }, 503);
    }
  }
  const user = typeof verifyAdmin === "function" ? await verifyAdmin(request, env) : null;
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 403);
  const root = "/api/admin/work/portfolio";
  try {
    if (path === root && request.method === "GET") {
      return json({ ok: true, entry: entry(await readRow(env)) });
    }
    if (path === root && request.method === "PUT") {
      const body = await readBody(request);
      const normalized = validateWorkPortfolio(body?.draft);
      const serialized = JSON.stringify(normalized);
      const current = await readRow(env);
      if (current) {
        await env.CMS_DB.batch([
          env.CMS_DB.prepare(`UPDATE cms_entries SET draft_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(serialized,current.id),
          await addRevision(env, "save", serialized, user.email)
        ]);
      } else {
        await env.CMS_DB.batch([
          env.CMS_DB.prepare(`INSERT INTO cms_entries
            (section, market, route, draft_json, published_json, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
            .bind(SECTION, MARKET, ROUTE, serialized, JSON.stringify({items:[]})),
          await addRevision(env, "save", serialized, user.email)
        ]);
      }
      return json({ ok: true, entry: entry(await readRow(env)) });
    }
    if (path === root + "/publish" && request.method === "POST") {
      const current = await readRow(env);
      if (!current) return json({ ok: false, error: "Save the draft before publishing" }, 409);
      const draft = validateWorkPortfolio(decodeRowPart(current, "draft_blob"), { publishing: true });
      const serialized = JSON.stringify(draft);
      await env.CMS_DB.batch([
        env.CMS_DB.prepare(`UPDATE cms_entries SET published_json=?, published_at=CURRENT_TIMESTAMP,
          updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(serialized,current.id),
        await addRevision(env, "publish", serialized, user.email)
      ]);
      return json({ ok: true, entry: entry(await readRow(env)) });
    }
    if (path === root + "/revisions" && request.method === "GET") {
      const result = await env.CMS_DB.prepare(`SELECT id, revision_type, actor_email, created_at FROM cms_revisions
        WHERE section=? AND market=? AND route=? ORDER BY id DESC LIMIT 30`).bind(SECTION,MARKET,ROUTE).all();
      return json({ ok: true, revisions: result.results || [] });
    }
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 400);
  }
  return json({ ok: false, error: "Unknown Work API route" }, 404);
}
