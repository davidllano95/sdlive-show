export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      try {
        const result = await env.CMS_DB
          .prepare("SELECT 1 AS ok")
          .first();

        return Response.json({
          ok: result?.ok === 1,
          database: "sdlive-cms-production"
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: "D1 connection failed"
          },
          { status: 500 }
        );
      }
    }

    return Response.json(
      {
        ok: false,
        error: "API route not found"
      },
      { status: 404 }
    );
  }
};
