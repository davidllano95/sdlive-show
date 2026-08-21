import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  libraryItem,
  logicalPathFor,
  mediaReferences,
  normalizeObjectKey
} from "../media-api.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("media library exposes stable logical R2 references", () => {
  assert.equal(
    logicalPathFor("cms/about/photo.webp"),
    "assets/media/cms/about/photo.webp"
  );
  assert.equal(normalizeObjectKey("cms/about/photo.webp"), "cms/about/photo.webp");
  assert.equal(normalizeObjectKey("../secret"), null);
  assert.equal(normalizeObjectKey("cms/not-allowed/photo.webp"), null);
});

test("media library item contains reusable logical and public paths", () => {
  const item = libraryItem(
    { MEDIA_PUBLIC_BASE: "https://media.sdlive.show" },
    {
      key: "cms/portfolio/project.webp",
      size: 1024,
      uploaded: new Date("2026-08-21T20:00:00Z"),
      etag: "etag",
      httpMetadata: { contentType: "image/webp" },
      customMetadata: { originalName: "project.webp", uploadedBy: "admin@example.com" }
    }
  );

  assert.equal(item.folder, "portfolio");
  assert.equal(item.logicalPath, "assets/media/cms/portfolio/project.webp");
  assert.equal(item.url, "https://media.sdlive.show/cms/portfolio/project.webp");
  assert.equal(item.originalName, "project.webp");
});

test("safe delete reference scan checks Draft and Published CMS JSON", async () => {
  const logical = "assets/media/cms/about/photo.webp";
  const env = {
    MEDIA_PUBLIC_BASE: "https://media.sdlive.show",
    CMS_DB: {
      prepare() {
        return {
          async all() {
            return {
              results: [
                {
                  section: "about",
                  market: "all",
                  route: "root",
                  draft_blob: Array.from(new TextEncoder().encode(JSON.stringify({ image: { src: logical } }))),
                  published_blob: Array.from(new TextEncoder().encode(JSON.stringify({ image: { src: "assets/images/old.webp" } })))
                }
              ]
            };
          }
        };
      }
    }
  };

  const refs = await mediaReferences(env, "cms/about/photo.webp");
  assert.deepEqual(refs, [
    { section: "about", market: "all", route: "root", state: "draft" }
  ]);
});

test("Editor media library can list, upload, reuse and safe-delete", async () => {
  const media = await source("admin/editor/media-library.js");
  const shell = await source("admin/editor/admin-shell.js");
  assert.doesNotThrow(() => new Function(media));
  assert.match(media, /SDLiveMediaLibrary/);
  assert.match(media, /\/api\/admin\/media\/library/);
  assert.match(media, /\/api\/admin\/media\/upload/);
  assert.match(media, /\/api\/admin\/media\/delete/);
  assert.match(media, /Copy ref/);
  assert.match(media, /typeof currentOptions\.onSelect === "function"/);
  assert.match(shell, /media-library\.js\?v=20260821-1/);
});
