import { jwtVerify, createRemoteJWKSet } from "jose";

const ADMIN_EMAIL = "sam@sdlive.show";

/**
 * Valida el JWT emitido por Cloudflare Access.
 * Comprueba firma, issuer, audience y email autorizado.
 */
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
