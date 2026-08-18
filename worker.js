import { jwtVerify, createRemoteJWKSet } from "jose";

const ADMIN_EMAIL = "sam@sdlive.show";
const HERO_KEY = {
  section: "hero",
  market: "all",
  route: "root"
};

async function verifyAccess(request, env) {
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) {
    throw new Error("Access configuration missing");
  }

  const token = request.headers.get("cf-access-jwt-assertion");

  if (!token) {
    throw new Error("Missing Cloudflare Access JWT");
  }

  const JWKS = createRemoteJWKSet(
    new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)
  );

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: env.TEAM_DOMAIN,
    audience: env.POLICY_AUD
  });

  const email = String(payload.email || "").toLowerCase();

  if (email !== ADMIN_EMAIL) {
    throw new Error("User is not authorized");
  }

  return {
    email,
    sub: payload.sub || null
  };
}

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

function parseBlobJson(blob) {
  return JSON.parse(decodeBlobText(blob));
}

function isPlainObject(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function requireLocalizedText(value, field, maxLength = 5000) {
  if (!isPlainObject(value)) {
    throw new Error(`${field} must contain en and es`);
  }

  for (const lang of ["en", "es"]) {
    if (typeof value[lang] !== "string") {
      throw new Error(`${field}.${lang} must be a string`);
    }

    if (value[lang].length > maxLength) {
      throw new Error(`${field}.${lang} is too long`);
    }
  }
}

function requireAnchor(value, field) {
  if (typeof value !== "string" || !/^#[A-Za-z][\w:-]*$/.test(value)) {
    throw new Error(`${field} must be an internal #anchor`);
  }
}

function validateHeroDraft(draft) {
  if (!isPlainObject(draft)) {
    throw new Error("draft must be an object");
  }

  if (!isPlainObject(draft.headline)) {
    throw new Error("headline is required");
  }

  requireLocalizedText(draft.headline.line1, "headline.line1", 160);
  requireLocalizedText(draft.headline.line2, "headline.line2", 160);
  requireLocalizedText(draft.headline.accent, "headline.accent", 160);
  requireLocalizedText(draft.lede, "lede", 3000);

  if (!isPlainObject(draft.actions?.primary) ||
      !isPlainObject(draft.actions?.secondary)) {
    throw new Error("primary and secondary actions are required");
  }

  requireLocalizedText(draft.actions.primary.label, "actions.primary.label", 120);
  requireLocalizedText(draft.actions.secondary.label, "actions.secondary.label", 120);
  requireAnchor(draft.actions.primary.href, "actions.primary.href");
  requireAnchor(draft.actions.secondary.href, "actions.secondary.href");

  if (!Array.isArray(draft.stats) || draft.stats.length !== 4) {
    throw new Error("stats must contain exactly 4 items");
  }

  draft.stats.forEach((stat, index) => {
    if (!isPlainObject(stat)) {
      throw new Error(`stats[${index}] must be an object`);
    }

    requireLocalizedText(stat.value, `stats[${index}].value`, 160);
    requireLocalizedText(stat.label, `stats[${index}].label`, 240);
  });

  const serialized = JSON.stringify(draft);

  if (serialized.length > 50000) {
    throw new Error("Hero draft is too large");
  }

  return serialized;
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

async function getHeroRow(env) {
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
      HERO_KEY.section,
      HERO_KEY.market,
      HERO_KEY.route
    )
    .first();
}

function heroEntryFromRow(row) {
  if (!row) return null;

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
    draft: JSON.parse(draftText),
    published: JSON.parse(publishedText)
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const path =
      url.pathname.length > 1
        ? url.pathname.replace(/\/+$/, "")
        : url.pathname;

    /*
     * PUBLIC
     */

    if (
      path === "/api/health" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.CMS_DB
          .prepare("SELECT 1 AS ok")
          .first();

        return json({
          ok: result?.ok === 1,
          database: "sdlive-cms-production"
        });
      } catch {
        return json(
          {
            ok: false,
            error: "D1 connection failed"
          },
          500
        );
      }
    }

    /*
     * Public published Hero endpoint.
     * The public website will consume this in the next step.
     */
    if (
      path === "/api/content/hero" &&
      request.method === "GET"
    ) {
      try {
        const row = await getHeroRow(env);

        if (!row) {
          return json(
            {
              ok: false,
              error: "Hero content not found"
            },
            404
          );
        }

        return json({
          ok: true,
          section: HERO_KEY.section,
          publishedAt: row.published_at,
          content: parseBlobJson(row.published_blob)
        });
      } catch {
        return json(
          {
            ok: false,
            error: "Could not read published Hero"
          },
          500
        );
      }
    }

    /*
     * ADMIN
     */

    if (path.startsWith("/api/admin/")) {
      let user;

      try {
        user = await verifyAccess(request, env);
      } catch {
        return json(
          {
            ok: false,
            error: "Unauthorized"
          },
          403
        );
      }

      if (
        path === "/api/admin/whoami" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          authenticated: true,
          email: user.email
        });
      }

      /*
       * Read Draft + Published.
       */
      if (
        path === "/api/admin/content/hero" &&
        request.method === "GET"
      ) {
        try {
          const row = await getHeroRow(env);
          const entry = heroEntryFromRow(row);

          if (!entry) {
            return json(
              {
                ok: false,
                error: "Hero content not found"
              },
              404
            );
          }

          return json({
            ok: true,
            entry
          });
        } catch (error) {
          return json(
            {
              ok: false,
              error: "Could not read Hero content",
              detail: String(error?.message || error)
            },
            500
          );
        }
      }

      /*
       * Save Draft.
       * Does NOT alter published_json.
       */
      if (
        path === "/api/admin/content/hero" &&
        request.method === "PUT"
      ) {
        try {
          const body = await readJsonBody(request);
          const serializedDraft = validateHeroDraft(body?.draft);

          const current = await getHeroRow(env);

          if (!current) {
            return json(
              {
                ok: false,
                error: "Hero content not found"
              },
              404
            );
          }

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
                HERO_KEY.section,
                HERO_KEY.market,
                HERO_KEY.route,
                serializedDraft,
                user.email
              )
          ]);

          const updated = heroEntryFromRow(
            await getHeroRow(env)
          );

          return json({
            ok: true,
            message: "Draft saved",
            entry: updated
          });
        } catch (error) {
          return json(
            {
              ok: false,
              error: "Could not save Hero draft",
              detail: String(error?.message || error)
            },
            400
          );
        }
      }

      /*
       * Publish current Draft.
       */
      if (
        path === "/api/admin/content/hero/publish" &&
        request.method === "POST"
      ) {
        try {
          const current = await getHeroRow(env);

          if (!current) {
            return json(
              {
                ok: false,
                error: "Hero content not found"
              },
              404
            );
          }

          const draftText = decodeBlobText(current.draft_blob);

          // Validate again immediately before publishing.
          validateHeroDraft(JSON.parse(draftText));

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
                HERO_KEY.section,
                HERO_KEY.market,
                HERO_KEY.route,
                draftText,
                user.email
              )
          ]);

          const updated = heroEntryFromRow(
            await getHeroRow(env)
          );

          return json({
            ok: true,
            message: "Hero published to D1",
            entry: updated
          });
        } catch (error) {
          return json(
            {
              ok: false,
              error: "Could not publish Hero",
              detail: String(error?.message || error)
            },
            400
          );
        }
      }

      /*
       * Revision history for the Hero.
       */
      if (
        path === "/api/admin/content/hero/revisions" &&
        request.method === "GET"
      ) {
        try {
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
              HERO_KEY.section,
              HERO_KEY.market,
              HERO_KEY.route
            )
            .all();

          return json({
            ok: true,
            revisions: result.results || []
          });
        } catch {
          return json(
            {
              ok: false,
              error: "Could not read revision history"
            },
            500
          );
        }
      }

      return json(
        {
          ok: false,
          error: "Admin API route not found"
        },
        404
      );
    }

    return json(
      {
        ok: false,
        error: "API route not found"
      },
      404
    );
  }
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/**
 * D1 devuelve BLOB como Array<number>.
 * Lo convertimos nosotros a UTF-8 y después parseamos JSON.
 */
function parseBlobJson(blob) {
  if (!Array.isArray(blob)) {
    throw new Error("Expected D1 BLOB byte array");
  }

  const bytes = new Uint8Array(blob);

  const text = new TextDecoder("utf-8", {
    fatal: true
  }).decode(bytes);

  return JSON.parse(text);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const path =
      url.pathname.length > 1
        ? url.pathname.replace(/\/+$/, "")
        : url.pathname;

    /*
     * =========================================================
     * PUBLIC API
     * =========================================================
     */

    if (
      path === "/api/health" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.CMS_DB
          .prepare("SELECT 1 AS ok")
          .first();

        return json({
          ok: result?.ok === 1,
          database: "sdlive-cms-production"
        });
      } catch {
        return json(
          {
            ok: false,
            error: "D1 connection failed"
          },
          500
        );
      }
    }

    /*
     * =========================================================
     * ADMIN API
     * =========================================================
     */

    if (path.startsWith("/api/admin/")) {
      let user;

      try {
        user = await verifyAccess(request, env);
      } catch {
        return json(
          {
            ok: false,
            error: "Unauthorized"
          },
          403
        );
      }

      /*
       * WHOAMI
       */

      if (
        path === "/api/admin/whoami" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          authenticated: true,
          email: user.email
        });
      }

      /*
       * GET HERO
       */

      if (
        path === "/api/admin/content/hero" &&
        request.method === "GET"
      ) {
        try {
          const row = await env.CMS_DB
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
              "hero",
              "all",
              "root"
            )
            .first();

          if (!row) {
            return json(
              {
                ok: false,
                error: "Hero content not found"
              },
              404
            );
          }

          const draft = parseBlobJson(row.draft_blob);
          const published = parseBlobJson(row.published_blob);

          return json({
            ok: true,

            entry: {
              id: row.id,
              section: row.section,
              market: row.market,
              route: row.route,

              updatedAt: row.updated_at,
              publishedAt: row.published_at,

              draft,
              published
            }
          });

        } catch (error) {
          return json(
            {
              ok: false,
              error: "Could not read Hero content",
              detail: String(error?.message || error)
            },
            500
          );
        }
      }

      return json(
        {
          ok: false,
          error: "Admin API route not found"
        },
        404
      );
    }

    return json(
      {
        ok: false,
        error: "API route not found"
      },
      404
    );
  }
};    sub: payload.sub || null
  };
}

/**
 * Respuestas JSON.
 * Forzamos UTF-8 explícitamente para evitar problemas
 * con caracteres como á, é, í, ó, ú y ñ.
 */
function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

/**
 * Convierte JSON almacenado como TEXT en D1.
 */
function parseStoredJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /**
     * Normaliza trailing slash:
     *
     * /api/admin/content/hero
     * /api/admin/content/hero/
     *
     * se consideran la misma ruta.
     */
    const path =
      url.pathname.length > 1
        ? url.pathname.replace(/\/+$/, "")
        : url.pathname;

    /*
     * =========================================================
     * PUBLIC API
     * =========================================================
     */

    /**
     * Comprueba conexión entre Worker y D1.
     */
    if (
      path === "/api/health" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.CMS_DB
          .prepare("SELECT 1 AS ok")
          .first();

        return json({
          ok: result?.ok === 1,
          database: "sdlive-cms-production"
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: "D1 connection failed"
          },
          500
        );
      }
    }

    /*
     * =========================================================
     * ADMIN API
     * =========================================================
     *
     * Todo /api/admin/* requiere:
     *
     * 1. Cloudflare Access
     * 2. JWT válido
     * 3. Audience correcto
     * 4. sam@sdlive.show
     */

    if (path.startsWith("/api/admin/")) {
      let user;

      try {
        user = await verifyAccess(request, env);
      } catch (error) {
        return json(
          {
            ok: false,
            error: "Unauthorized"
          },
          403
        );
      }

      /*
       * -------------------------------------------------------
       * WHOAMI
       * -------------------------------------------------------
       */

      if (
        path === "/api/admin/whoami" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          authenticated: true,
          email: user.email
        });
      }

      /*
       * -------------------------------------------------------
       * GET HERO
       * -------------------------------------------------------
       *
       * Lee Draft + Published desde D1.
       */

      if (
        path === "/api/admin/content/hero" &&
        request.method === "GET"
      ) {
        try {
          const row = await env.CMS_DB
            .prepare(`
              SELECT
                id,
                section,
                market,
                route,
                draft_json,
                published_json,
                updated_at,
                published_at
              FROM cms_entries
              WHERE section = ?
                AND market = ?
                AND route = ?
              LIMIT 1
            `)
            .bind(
              "hero",
              "all",
              "root"
            )
            .first();

          if (!row) {
            return json(
              {
                ok: false,
                error: "Hero content not found"
              },
              404
            );
          }

          const draft = parseStoredJson(row.draft_json);
          const published = parseStoredJson(row.published_json);

          if (!draft || !published) {
            return json(
              {
                ok: false,
                error: "Stored Hero JSON is invalid"
              },
              500
            );
          }

          return json({
            ok: true,

            entry: {
              id: row.id,
              section: row.section,
              market: row.market,
              route: row.route,

              updatedAt: row.updated_at,
              publishedAt: row.published_at,

              draft,
              published
            }
          });
        } catch (error) {
          return json(
            {
              ok: false,
              error: "Could not read Hero content"
            },
            500
          );
        }
      }

      /*
       * Ruta admin válida pero aún no implementada.
       */
      return json(
        {
          ok: false,
          error: "Admin API route not found"
        },
        404
      );
    }

    /*
     * =========================================================
     * UNKNOWN API ROUTE
     * =========================================================
     */

    return json(
      {
        ok: false,
        error: "API route not found"
      },
      404
    );
  }
};    email,
    sub: payload.sub || null
  };
}


/**
 * Respuestas JSON uniformes.
 */
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}


/**
 * Convierte los campos JSON guardados como TEXT en D1.
 */
function parseStoredJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * Normaliza el path para aceptar:
     *
     * /api/admin/content/hero
     * /api/admin/content/hero/
     *
     * como la misma ruta.
     */
    const path =
      url.pathname.length > 1
        ? url.pathname.replace(/\/+$/, "")
        : url.pathname;


    /*
     * ---------------------------------------------------------
     * PUBLIC API
     * ---------------------------------------------------------
     */

    /**
     * Health check público.
     * Solo verifica que el Worker pueda comunicarse con D1.
     */
    if (
      path === "/api/health" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.CMS_DB
          .prepare("SELECT 1 AS ok")
          .first();

        return json({
          ok: result?.ok === 1,
          database: "sdlive-cms-production"
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: "D1 connection failed"
          },
          500
        );
      }
    }


    /*
     * ---------------------------------------------------------
     * ADMIN API
     * ---------------------------------------------------------
     *
     * Todo lo que exista debajo de /api/admin/
     * debe pasar primero por Cloudflare Access y,
     * adicionalmente, por verifyAccess().
     */

    if (path.startsWith("/api/admin/")) {
      let user;

      try {
        user = await verifyAccess(request, env);
      } catch (error) {
        return json(
          {
            ok: false,
            error: "Unauthorized"
          },
          403
        );
      }


      /*
       * -------------------------------------------------------
       * WHO AM I
       * -------------------------------------------------------
       *
       * Endpoint de diagnóstico de autenticación.
       */

      if (
        path === "/api/admin/whoami" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          authenticated: true,
          email: user.email
        });
      }


      /*
       * -------------------------------------------------------
       * GET HERO
       * -------------------------------------------------------
       *
       * Lee Draft + Published del Hero desde D1.
       */

      if (
        path === "/api/admin/content/hero" &&
        request.method === "GET"
      ) {
        try {
          const row = await env.CMS_DB
            .prepare(`
              SELECT
                id,
                section,
                market,
                route,
                draft_json,
                published_json,
                updated_at,
                published_at
              FROM cms_entries
              WHERE section = ?
                AND market = ?
                AND route = ?
              LIMIT 1
            `)
            .bind(
              "hero",
              "all",
              "root"
            )
            .first();

          if (!row) {
            return json(
              {
                ok: false,
                error: "Hero content not found"
              },
              404
            );
          }

          const draft = parseStoredJson(row.draft_json);
          const published = parseStoredJson(row.published_json);

          if (!draft || !published) {
            return json(
              {
                ok: false,
                error: "Stored Hero JSON is invalid"
              },
              500
            );
          }

          return json({
            ok: true,
            entry: {
              id: row.id,
              section: row.section,
              market: row.market,
              route: row.route,

              updatedAt: row.updated_at,
              publishedAt: row.published_at,

              draft,
              published
            }
          });
        } catch (error) {
          return json(
            {
              ok: false,
              error: "Could not read Hero content"
            },
            500
          );
        }
      }


      /*
       * Ruta /api/admin/... válida pero no implementada.
       */
      return json(
        {
          ok: false,
          error: "Admin API route not found"
        },
        404
      );
    }


    /*
     * ---------------------------------------------------------
     * UNKNOWN API ROUTE
     * ---------------------------------------------------------
     */

    return json(
      {
        ok: false,
        error: "API route not found"
      },
      404
    );
  }
};
