import baseWorker from "./worker-entry.js";
import { handleMediaApi } from "./media-api.js";
import { handleTrustedApi } from "./trusted-api.js";

function normalizedPath(request) {
  const url = new URL(request.url);

  return url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;
}

async function verifyAdminViaExistingApi(request, env) {
  const url = new URL(request.url);
  url.pathname = "/api/admin/whoami";
  url.search = "";

  const verificationRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });

  const response = await baseWorker.fetch(
    verificationRequest,
    env
  );

  if (!response.ok) return null;

  const data = await response.json().catch(() => null);

  if (!data?.authenticated || !data?.email) {
    return null;
  }

  return {
    email: String(data.email).toLowerCase()
  };
}

export default {
  async fetch(request, env) {
    const path = normalizedPath(request);

    if (path.startsWith("/api/admin/media")) {
      const response = await handleMediaApi(
        request,
        env,
        {
          verifyAdmin: verifyAdminViaExistingApi
        }
      );

      if (response) return response;
    }

    if (
      path === "/api/content/trusted" ||
      path.startsWith("/api/admin/content/trusted")
    ) {
      const response = await handleTrustedApi(
        request,
        env,
        {
          verifyAdmin: verifyAdminViaExistingApi
        }
      );

      if (response) return response;
    }

    return baseWorker.fetch(request, env);
  }
};
