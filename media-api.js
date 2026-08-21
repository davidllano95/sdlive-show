const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_LIBRARY_LIMIT = 200;

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);

const ALLOWED_FOLDERS = new Set([
  "clients",
  "brands",
  "testimonials",
  "about",
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

function logicalPathFor(key) {
  return `assets/media/${String(key || "").replace(/^\/+/, "")}`;
}

function normalizeObjectKey(value) {
  const key = String(value || "").trim().replace(/^\/+/, "");
  if (!/^cms\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/i.test(key)) return null;
  const folder = key.split("/")[1]?.toLowerCase();
  if (!ALLOWED_FOLDERS.has(folder)) return null;
  return key;
}

function decodeD1Text(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(value)
    );
  }
  return "";
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
      logicalPath: logicalPathFor(key),
      url: publicUrlFor(env, key),
      contentType: file.type,
      size: file.size,
      originalName: file.name
    }
  }, 201);
}

function libraryItem(env, object) {
  const folder = object.key.split("/")[1] || "uploads";
  return {
    key: object.key,
    logicalPath: logicalPathFor(object.key),
    url: publicUrlFor(env, object.key),
    folder,
    size: Number(object.size || 0),
    uploaded: object.uploaded instanceof Date
      ? object.uploaded.toISOString()
      : object.uploaded || null,
    etag: object.etag || null,
    contentType: object.httpMetadata?.contentType || "",
    originalName: object.customMetadata?.originalName || "",
    uploadedBy: object.customMetadata?.uploadedBy || ""
  };
}

async function listMedia(request, env) {
  if (!env.MEDIA_BUCKET?.list) {
    return json({ ok: false, error: "Media bucket is not configured" }, 503);
  }

  const url = new URL(request.url);
  const requestedFolder = url.searchParams.get("folder");
  const folder = requestedFolder ? normalizeFolder(requestedFolder) : null;
  if (requestedFolder && !folder) {
    return json({ ok: false, error: "Unsupported media folder" }, 400);
  }

  const search = String(url.searchParams.get("search") || "")
    .trim()
    .toLowerCase()
    .slice(0, 100);
  const cursor = String(url.searchParams.get("cursor") || "").trim() || undefined;
  const limit = Math.min(
    MAX_LIBRARY_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit")) || 100)
  );
  const prefix = folder ? `cms/${folder}/` : "cms/";

  const listed = await env.MEDIA_BUCKET.list({
    prefix,
    cursor,
    limit,
    include: ["httpMetadata", "customMetadata"]
  });

  let items = (listed.objects || []).map((object) => libraryItem(env, object));
  if (search) {
    items = items.filter((item) =>
      `${item.key} ${item.originalName}`.toLowerCase().includes(search)
    );
  }

  items.sort((a, b) => String(b.uploaded || "").localeCompare(String(a.uploaded || "")));

  return json({
    ok: true,
    items,
    cursor: listed.truncated ? listed.cursor || null : null,
    truncated: Boolean(listed.truncated),
    folder: folder || "all",
    search
  });
}

async function mediaReferences(env, key) {
  if (!env.CMS_DB?.prepare) return [];
  const logicalPath = logicalPathFor(key);
  const absoluteUrl = publicUrlFor(env, key);
  const result = await env.CMS_DB.prepare(`
    SELECT section, market, route,
      CAST(draft_json AS BLOB) AS draft_blob,
      CAST(published_json AS BLOB) AS published_blob
    FROM cms_entries
  `).all();

  const references = [];
  for (const row of result.results || []) {
    const draft = decodeD1Text(row.draft_blob);
    const published = decodeD1Text(row.published_blob);
    for (const state of ["draft", "published"]) {
      const text = state === "draft" ? draft : published;
      if (!text.includes(logicalPath) && !text.includes(absoluteUrl)) continue;
      references.push({
        section: row.section,
        market: row.market,
        route: row.route,
        state
      });
    }
  }
  return references;
}

async function deleteMedia(request, env) {
  if (!env.MEDIA_BUCKET?.delete) {
    return json({ ok: false, error: "Media bucket is not configured" }, 503);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "Content-Type must be application/json" }, 415);
  }

  const body = await request.json().catch(() => null);
  const key = normalizeObjectKey(body?.key);
  if (!key) return json({ ok: false, error: "Invalid media key" }, 400);

  const references = await mediaReferences(env, key);
  if (references.length) {
    return json({
      ok: false,
      error: "Media is still referenced by CMS content",
      detail: "Remove or replace every Draft and Published reference before deleting the object.",
      references
    }, 409);
  }

  await env.MEDIA_BUCKET.delete(key);
  return json({ ok: true, deleted: key });
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
    path === "/api/admin/media/library" &&
    request.method === "GET"
  ) {
    try {
      return await listMedia(request, env);
    } catch (error) {
      console.error("Media library list failed", error);
      return json({
        ok: false,
        error: "Could not list media",
        detail: String(error?.message || error)
      }, 500);
    }
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

  if (
    path === "/api/admin/media/delete" &&
    request.method === "POST"
  ) {
    try {
      return await deleteMedia(request, env);
    } catch (error) {
      console.error("Media delete failed", error);
      return json({
        ok: false,
        error: "Could not delete media",
        detail: String(error?.message || error)
      }, 500);
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
  MAX_LIBRARY_LIMIT,
  MAX_UPLOAD_BYTES,
  decodeD1Text,
  libraryItem,
  logicalPathFor,
  mediaReferences,
  normalizeFolder,
  normalizeObjectKey,
  publicUrlFor
};
