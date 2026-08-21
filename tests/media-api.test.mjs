import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_UPLOAD_BYTES,
  handleMediaApi,
  normalizeFolder,
  publicUrlFor
} from "../media-api.js";

test("media folder allowlist rejects arbitrary paths", () => {
  assert.equal(normalizeFolder("clients"), "clients");
  assert.equal(normalizeFolder("brands"), "brands");
  assert.equal(normalizeFolder("../../etc"), null);
});

test("media public URLs stay on the configured custom domain", () => {
  assert.equal(
    publicUrlFor(
      { MEDIA_PUBLIC_BASE: "https://media.sdlive.show/" },
      "cms/clients/logo test.png"
    ),
    "https://media.sdlive.show/cms/clients/logo%20test.png"
  );
});

test("media admin API requires the existing admin verifier", async () => {
  const response = await handleMediaApi(
    new Request("https://sdlive.show/api/admin/media/status"),
    {},
    { verifyAdmin: async () => null }
  );

  assert.equal(response.status, 403);
});

test("media status exposes limits without touching R2", async () => {
  const response = await handleMediaApi(
    new Request("https://sdlive.show/api/admin/media/status"),
    {
      MEDIA_BUCKET: {},
      MEDIA_PUBLIC_BASE: "https://media.sdlive.show"
    },
    { verifyAdmin: async () => ({ email: "admin@sdlive.show" }) }
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.configured, true);
  assert.equal(payload.maxUploadBytes, MAX_UPLOAD_BYTES);
  assert.ok(payload.allowedTypes.includes("image/png"));
});

test("valid PNG upload writes once to R2 and returns an immutable public URL", async () => {
  const writes = [];
  const env = {
    MEDIA_PUBLIC_BASE: "https://media.sdlive.show",
    MEDIA_BUCKET: {
      async put(key, value, options) {
        writes.push({ key, value, options });
      }
    }
  };

  const form = new FormData();
  form.set("folder", "clients");
  form.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71])], "Test Logo.png", {
      type: "image/png"
    })
  );

  const response = await handleMediaApi(
    new Request("https://sdlive.show/api/admin/media/upload", {
      method: "POST",
      body: form
    }),
    env,
    { verifyAdmin: async () => ({ email: "admin@sdlive.show" }) }
  );

  assert.equal(response.status, 201);
  assert.equal(writes.length, 1);
  assert.match(writes[0].key, /^cms\/clients\/\d+-[0-9a-f-]+-Test-Logo\.png$/);
  assert.equal(writes[0].options.httpMetadata.contentType, "image/png");
  assert.equal(
    writes[0].options.httpMetadata.cacheControl,
    "public, max-age=31536000, immutable"
  );

  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.match(
    payload.media.url,
    /^https:\/\/media\.sdlive\.show\/cms\/clients\//
  );
});

test("unsupported media types are rejected before R2 write", async () => {
  let writes = 0;
  const form = new FormData();
  form.set("folder", "clients");
  form.set(
    "file",
    new File(["<svg></svg>"], "logo.svg", {
      type: "image/svg+xml"
    })
  );

  const response = await handleMediaApi(
    new Request("https://sdlive.show/api/admin/media/upload", {
      method: "POST",
      body: form
    }),
    {
      MEDIA_BUCKET: {
        async put() {
          writes += 1;
        }
      }
    },
    { verifyAdmin: async () => ({ email: "admin@sdlive.show" }) }
  );

  assert.equal(response.status, 415);
  assert.equal(writes, 0);
});
