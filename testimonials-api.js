import {
  TESTIMONIALS_DEFAULT_CONTENT,
  TESTIMONIALS_KEY,
  cloneTestimonialsDefault,
  validateTestimonialsDraft
} from "./testimonials-content.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function decodeBlobText(blob) {
  if (!Array.isArray(blob)) {
    throw new Error("Expected D1 BLOB byte array");
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(
    new Uint8Array(blob)
  );
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }

  const text = await request.text();
  if (text.length > 60000) {
    throw new Error("Request body is too large");
  }

  return JSON.parse(text);
}

async function getTestimonialsRow(env) {
  return env.CMS_DB
    .prepare(`
      SELECT
        id,
        section,
        market,
        route,
        CAST(draft_json AS BLOB) AS draft_blob,
        CAST(published_json AS BLOB) AS published_blob,
        updated_at,
        published_at
      FROM cms_entries
      WHERE section = ?
        AND market = ?
        AND route = ?
      LIMIT 1
    `)
    .bind(
      TESTIMONIALS_KEY.section,
      TESTIMONIALS_KEY.market,
      TESTIMONIALS_KEY.route
    )
    .first();
}

function testimonialsEntryFromRow(row) {
  if (!row) {
    const fallback = cloneTestimonialsDefault();
    return {
      id: null,
      section: TESTIMONIALS_KEY.section,
      market: TESTIMONIALS_KEY.market,
      route: TESTIMONIALS_KEY.route,
      updatedAt: null,
      publishedAt: null,
      hasUnpublishedChanges: false,
      source: "static-default",
      draft: fallback,
      published: cloneTestimonialsDefault()
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
    draft: JSON.parse(draftText),
    published: JSON.parse(publishedText)
  };
}

async function saveTestimonialsDraft(env, serializedDraft, userEmail) {
  const current = await getTestimonialsRow(env);

  if (current) {
    await env.CMS_DB.batch([
      env.CMS_DB
        .prepare(`
          UPDATE cms_entries
          SET draft_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(serializedDraft, current.id),
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_revisions (
            section, market, route, content_json,
            revision_type, actor_email
          )
          VALUES (?, ?, ?, ?, 'save', ?)
        `)
        .bind(
          TESTIMONIALS_KEY.section,
          TESTIMONIALS_KEY.market,
          TESTIMONIALS_KEY.route,
          serializedDraft,
          userEmail
        )
    ]);
  } else {
    const publishedDefault = JSON.stringify(TESTIMONIALS_DEFAULT_CONTENT);

    await env.CMS_DB.batch([
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_entries (
            section, market, route,
            draft_json, published_json,
            updated_at, published_at
          )
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          TESTIMONIALS_KEY.section,
          TESTIMONIALS_KEY.market,
          TESTIMONIALS_KEY.route,
          serializedDraft,
          publishedDefault
        ),
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_revisions (
            section, market, route, content_json,
            revision_type, actor_email
          )
          VALUES (?, ?, ?, ?, 'save', ?)
        `)
        .bind(
          TESTIMONIALS_KEY.section,
          TESTIMONIALS_KEY.market,
          TESTIMONIALS_KEY.route,
          serializedDraft,
          userEmail
        )
    ]);
  }

  return testimonialsEntryFromRow(await getTestimonialsRow(env));
}

async function publishTestimonials(env, userEmail) {
  const current = await getTestimonialsRow(env);
  if (!current) {
    throw new Error("Save a Testimonials draft before publishing");
  }

  const draftText = decodeBlobText(current.draft_blob);
  validateTestimonialsDraft(JSON.parse(draftText));

  await env.CMS_DB.batch([
    env.CMS_DB
      .prepare(`
        UPDATE cms_entries
        SET
          published_json = draft_json,
          published_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(current.id),
    env.CMS_DB
      .prepare(`
        INSERT INTO cms_revisions (
          section, market, route, content_json,
          revision_type, actor_email
        )
        VALUES (?, ?, ?, ?, 'publish', ?)
      `)
      .bind(
        TESTIMONIALS_KEY.section,
        TESTIMONIALS_KEY.market,
        TESTIMONIALS_KEY.route,
        draftText,
        userEmail
      )
  ]);

  return testimonialsEntryFromRow(await getTestimonialsRow(env));
}

async function readTestimonialsRevisions(env) {
  const result = await env.CMS_DB
    .prepare(`
      SELECT id, revision_type, actor_email, created_at
      FROM cms_revisions
      WHERE section = ? AND market = ? AND route = ?
      ORDER BY id DESC
      LIMIT 30
    `)
    .bind(
      TESTIMONIALS_KEY.section,
      TESTIMONIALS_KEY.market,
      TESTIMONIALS_KEY.route
    )
    .all();

  return result.results || [];
}

function publishedPayload(row) {
  if (!row) {
    return {
      ok: true,
      section: TESTIMONIALS_KEY.section,
      source: "static-default",
      publishedAt: null,
      content: cloneTestimonialsDefault()
    };
  }

  return {
    ok: true,
    section: TESTIMONIALS_KEY.section,
    source: "cms",
    publishedAt: row.published_at,
    content: JSON.parse(decodeBlobText(row.published_blob))
  };
}

export async function handleTestimonialsApi(
  request,
  env,
  { verifyAdmin = null } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;

  if (
    path === "/api/content/testimonials" &&
    request.method === "GET"
  ) {
    try {
      return json(publishedPayload(await getTestimonialsRow(env)));
    } catch (error) {
      console.error("Testimonials public read failed", error);
      return json({
        ok: true,
        section: TESTIMONIALS_KEY.section,
        source: "static-default",
        publishedAt: null,
        content: cloneTestimonialsDefault()
      });
    }
  }

  if (!path.startsWith("/api/admin/content/testimonials")) {
    return null;
  }

  if (typeof verifyAdmin !== "function") {
    return json({ ok: false, error: "Unauthorized" }, 403);
  }

  const user = await verifyAdmin(request, env);
  if (!user?.email) {
    return json({ ok: false, error: "Unauthorized" }, 403);
  }

  if (
    path === "/api/admin/content/testimonials" &&
    request.method === "GET"
  ) {
    try {
      return json({
        ok: true,
        entry: testimonialsEntryFromRow(await getTestimonialsRow(env))
      });
    } catch (error) {
      return json({
        ok: false,
        error: "Could not read Testimonials content",
        detail: String(error?.message || error)
      }, 500);
    }
  }

  if (
    path === "/api/admin/content/testimonials" &&
    request.method === "PUT"
  ) {
    try {
      const body = await readJsonBody(request);
      const serializedDraft = validateTestimonialsDraft(body?.draft);
      const entry = await saveTestimonialsDraft(
        env,
        serializedDraft,
        user.email
      );

      return json({
        ok: true,
        message: "Testimonials draft saved",
        entry
      });
    } catch (error) {
      return json({
        ok: false,
        error: "Could not save Testimonials draft",
        detail: String(error?.message || error)
      }, 400);
    }
  }

  if (
    path === "/api/admin/content/testimonials/publish" &&
    request.method === "POST"
  ) {
    try {
      const entry = await publishTestimonials(env, user.email);
      return json({
        ok: true,
        message: "Testimonials published to D1",
        entry
      });
    } catch (error) {
      return json({
        ok: false,
        error: "Could not publish Testimonials",
        detail: String(error?.message || error)
      }, 400);
    }
  }

  if (
    path === "/api/admin/content/testimonials/revisions" &&
    request.method === "GET"
  ) {
    try {
      return json({
        ok: true,
        revisions: await readTestimonialsRevisions(env)
      });
    } catch {
      return json({
        ok: false,
        error: "Could not read Testimonials revision history"
      }, 500);
    }
  }

  return json({
    ok: false,
    error: "Testimonials API route not found"
  }, 404);
}
