import {
  TRUSTED_DEFAULT_CONTENT,
  TRUSTED_KEY,
  cloneTrustedDefault,
  validateTrustedDraft
} from "./trusted-content.js";

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

async function getTrustedRow(env) {
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
      TRUSTED_KEY.section,
      TRUSTED_KEY.market,
      TRUSTED_KEY.route
    )
    .first();
}

function trustedEntryFromRow(row) {
  if (!row) {
    const fallback = cloneTrustedDefault();

    return {
      id: null,
      section: TRUSTED_KEY.section,
      market: TRUSTED_KEY.market,
      route: TRUSTED_KEY.route,
      updatedAt: null,
      publishedAt: null,
      hasUnpublishedChanges: false,
      source: "static-default",
      draft: fallback,
      published: cloneTrustedDefault()
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

async function saveTrustedDraft(env, serializedDraft, userEmail) {
  const current = await getTrustedRow(env);

  if (current) {
    await env.CMS_DB.batch([
      env.CMS_DB
        .prepare(`
          UPDATE cms_entries
          SET
            draft_json = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(serializedDraft, current.id),
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_revisions (
            section,
            market,
            route,
            content_json,
            revision_type,
            actor_email
          )
          VALUES (?, ?, ?, ?, 'save', ?)
        `)
        .bind(
          TRUSTED_KEY.section,
          TRUSTED_KEY.market,
          TRUSTED_KEY.route,
          serializedDraft,
          userEmail
        )
    ]);
  } else {
    const publishedDefault = JSON.stringify(TRUSTED_DEFAULT_CONTENT);

    await env.CMS_DB.batch([
      env.CMS_DB
        .prepare(`
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
        `)
        .bind(
          TRUSTED_KEY.section,
          TRUSTED_KEY.market,
          TRUSTED_KEY.route,
          serializedDraft,
          publishedDefault
        ),
      env.CMS_DB
        .prepare(`
          INSERT INTO cms_revisions (
            section,
            market,
            route,
            content_json,
            revision_type,
            actor_email
          )
          VALUES (?, ?, ?, ?, 'save', ?)
        `)
        .bind(
          TRUSTED_KEY.section,
          TRUSTED_KEY.market,
          TRUSTED_KEY.route,
          serializedDraft,
          userEmail
        )
    ]);
  }

  return trustedEntryFromRow(await getTrustedRow(env));
}

async function publishTrusted(env, userEmail) {
  const current = await getTrustedRow(env);

  if (!current) {
    throw new Error("Save a Trusted By draft before publishing");
  }

  const draftText = decodeBlobText(current.draft_blob);
  validateTrustedDraft(JSON.parse(draftText));

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
          section,
          market,
          route,
          content_json,
          revision_type,
          actor_email
        )
        VALUES (?, ?, ?, ?, 'publish', ?)
      `)
      .bind(
        TRUSTED_KEY.section,
        TRUSTED_KEY.market,
        TRUSTED_KEY.route,
        draftText,
        userEmail
      )
  ]);

  return trustedEntryFromRow(await getTrustedRow(env));
}

async function readTrustedRevisions(env) {
  const result = await env.CMS_DB
    .prepare(`
      SELECT
        id,
        revision_type,
        actor_email,
        created_at
      FROM cms_revisions
      WHERE section = ?
        AND market = ?
        AND route = ?
      ORDER BY id DESC
      LIMIT 30
    `)
    .bind(
      TRUSTED_KEY.section,
      TRUSTED_KEY.market,
      TRUSTED_KEY.route
    )
    .all();

  return result.results || [];
}

function publishedPayload(row) {
  if (!row) {
    return {
      ok: true,
      section: TRUSTED_KEY.section,
      source: "static-default",
      publishedAt: null,
      content: cloneTrustedDefault()
    };
  }

  return {
    ok: true,
    section: TRUSTED_KEY.section,
    source: "cms",
    publishedAt: row.published_at,
    content: JSON.parse(decodeBlobText(row.published_blob))
  };
}

export async function handleTrustedApi(
  request,
  env,
  { verifyAdmin = null } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;

  if (
    path === "/api/content/trusted" &&
    request.method === "GET"
  ) {
    try {
      return json(publishedPayload(await getTrustedRow(env)));
    } catch (error) {
      console.error("Trusted By public read failed", error);
      return json(
        {
          ok: true,
          section: TRUSTED_KEY.section,
          source: "static-default",
          publishedAt: null,
          content: cloneTrustedDefault()
        }
      );
    }
  }

  if (!path.startsWith("/api/admin/content/trusted")) {
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
    path === "/api/admin/content/trusted" &&
    request.method === "GET"
  ) {
    try {
      return json({
        ok: true,
        entry: trustedEntryFromRow(await getTrustedRow(env))
      });
    } catch (error) {
      return json(
        {
          ok: false,
          error: "Could not read Trusted By content",
          detail: String(error?.message || error)
        },
        500
      );
    }
  }

  if (
    path === "/api/admin/content/trusted" &&
    request.method === "PUT"
  ) {
    try {
      const body = await readJsonBody(request);
      const serializedDraft = validateTrustedDraft(body?.draft);
      const entry = await saveTrustedDraft(
        env,
        serializedDraft,
        user.email
      );

      return json({
        ok: true,
        message: "Trusted By draft saved",
        entry
      });
    } catch (error) {
      return json(
        {
          ok: false,
          error: "Could not save Trusted By draft",
          detail: String(error?.message || error)
        },
        400
      );
    }
  }

  if (
    path === "/api/admin/content/trusted/publish" &&
    request.method === "POST"
  ) {
    try {
      const entry = await publishTrusted(env, user.email);

      return json({
        ok: true,
        message: "Trusted By published to D1",
        entry
      });
    } catch (error) {
      return json(
        {
          ok: false,
          error: "Could not publish Trusted By",
          detail: String(error?.message || error)
        },
        400
      );
    }
  }

  if (
    path === "/api/admin/content/trusted/revisions" &&
    request.method === "GET"
  ) {
    try {
      return json({
        ok: true,
        revisions: await readTrustedRevisions(env)
      });
    } catch {
      return json(
        {
          ok: false,
          error: "Could not read Trusted By revision history"
        },
        500
      );
    }
  }

  return json(
    {
      ok: false,
      error: "Trusted By API route not found"
    },
    404
  );
}
