import { jwtVerify, createRemoteJWKSet } from "jose";

const ADMIN_EMAIL = "sam@sdlive.show";

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
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

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

    // Public diagnostic endpoint.
    if (url.pathname === "/api/health") {
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

    // Everything under /api/admin/* requires Access.
    if (url.pathname.startsWith("/api/admin/")) {
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

      // Authentication test.
      if (
        url.pathname === "/api/admin/whoami" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          authenticated: true,
          email: user.email
        });
      }

      // Read Hero content from D1.
      if (
        url.pathname === "/api/admin/content/hero" &&
        request.method === "GET"
      ) {
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
          .bind("hero", "all", "root")
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
};        return json(
          {
            ok: false,
            error: "D1 connection failed"
          },
          500
        );
      }
    }

    // Everything under /api/admin/* requires a valid
    // Cloudflare Access JWT AND the expected admin email.
    if (url.pathname.startsWith("/api/admin/")) {
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

      // First protected test endpoint.
      if (
        url.pathname === "/api/admin/whoami" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          authenticated: true,
          email: user.email
        });
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
