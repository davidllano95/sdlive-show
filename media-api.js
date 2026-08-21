const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);

const ALLOWED_FOLDERS = new Set([
  "clients",
  "brands",
  "testimonials",
  "portfolio",
  "rental",
  "insights",
  "uploads"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function normalizeFolder(value) {
  const folder = String(value || "uploads")
    .trim()
    .toLowerCase();

  return ALLOWED_FOLDERS.has(folder) ? folder : null;
}

function publicBase(env) {
  return String(env.MEDIA_PUBLIC_BASE || "https://media.sdlive.show")
    .replace(/\/+$/, "");
}

function safeObjectName(file, extension) {
  const base = String(file?.name || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";

  return `${Date.now()}-${crypto.randomUUID()}-${base}.${extension}`;
}

function publicUrlFor(env, key) {
  return `${publicBase(env)}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

async function requireAdmin(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") return null;
  return verifyAdmin(request, env);
}

async function uploadMedia(request, env, user) {
  if (!env.MEDIA_BUCKET?.put) {
    return json(
      {
        ok: false,
        error: "Media bucket is not configured"
      },
      503
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json(
      {
        ok: false,
        error: "Upload must use multipart/form-data"
      },
      415
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const folder = normalizeFolder(form.get("folder"));

  if (!folder) {
    return json(
      {
        ok: false,
        error: "Unsupported media folder"
      },
      400
    );
  }

  if (!(file instanceof File)) {
    return json(
      {
        ok: false,
        error: "Image file is required"
      },
      400
    );
  }

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return json(
      {
        ok: false,
        error: "Unsupported image type",
        detail: "Use PNG, JPEG or WebP."
      },
      415
    );
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return json(
      {
        ok: false,
        error: "Image is too large",
        detail: "Maximum upload size is 5 MB."
      },
      413
    );
  }

  const key = `cms/${folder}/${safeObjectName(file, extension)}`;

  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      uploadedBy: String(user.email || "admin").slice(0, 200),
      originalName: String(file.name || "image").slice(0, 240)
    }
  });

  return json({
    ok: true,
    media: {
      key,
      url: publicUrlFor(env, key),
      contentType: file.type,
      size: file.size,
      originalName: file.name
    }
  }, 201);
}

export async function handleMediaApi(
  request,
  env,
  { verifyAdmin = null } = {}
) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;

  if (!path.startsWith("/api/admin/media")) {
    return null;
  }

  const user = await requireAdmin(request, env, verifyAdmin);
  if (!user?.email) {
    return json({ ok: false, error: "Unauthorized" }, 403);
  }

  if (
    path === "/api/admin/media/status" &&
    request.method === "GET"
  ) {
    return json({
      ok: true,
      configured: Boolean(env.MEDIA_BUCKET),
      publicBase: publicBase(env),
      maxUploadBytes: MAX_UPLOAD_BYTES,
      allowedTypes: [...ALLOWED_TYPES.keys()],
      allowedFolders: [...ALLOWED_FOLDERS]
    });
  }

  if (
    path === "/api/admin/media/upload" &&
    request.method === "POST"
  ) {
    try {
      return await uploadMedia(request, env, user);
    } catch (error) {
      console.error("Media upload failed", error);
      return json(
        {
          ok: false,
          error: "Could not upload media",
          detail: String(error?.message || error)
        },
        500
      );
    }
  }

  return json(
    {
      ok: false,
      error: "Media API route not found"
    },
    404
  );
}

export {
  ALLOWED_FOLDERS,
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  normalizeFolder,
  publicUrlFor
};
