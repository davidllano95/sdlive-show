import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../admin/editor/media-library.js", import.meta.url), "utf8");

function optimizer({ resultBytes = 400 * 1024, resultType = "image/webp" } = {}) {
  const start = source.indexOf("  async function optimizePortfolioImage(file) {");
  const end = source.indexOf("  async function copyText(value) {", start);
  assert.ok(start >= 0 && end > start, "Portfolio optimization function must exist");
  let created = 0, revoked = 0, canvas;
  const fakeURL = {
    createObjectURL() { created++; return "blob:test"; },
    revokeObjectURL() { revoked++; }
  };
  class FakeImage {
    naturalWidth = 1600;
    naturalHeight = 3000;
    set src(_) { queueMicrotask(() => this.onload()); }
  }
  const fakeDocument = {
    createElement(name) {
      assert.equal(name, "canvas");
      canvas = {
        width: 0,
        height: 0,
        getContext(type) {
          assert.equal(type, "2d");
          return { drawImage() {}, imageSmoothingEnabled: false, imageSmoothingQuality: "" };
        },
        toBlob(callback, type, quality) {
          assert.equal(type, "image/webp");
          assert.equal(quality, 0.88);
          callback(new Blob([new Uint8Array(resultBytes)], { type: resultType }));
        }
      };
      return canvas;
    }
  };
  const declaration = source.slice(start, end);
  const optimize = new Function("URL", "Image", "document", "File",
    declaration + "\nreturn optimizePortfolioImage;")(fakeURL, FakeImage, fakeDocument, File);
  return { optimize, counts: () => ({ created, revoked }), canvas: () => canvas };
}

test("media library script parses and optimization is opt-in for portfolio only", () => {
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /folder === "portfolio" && optimizeToggle\?\.checked/);
  assert.match(source, /const multipartBlob = uploadFile\.slice\(0, uploadFile\.size, uploadFile\.type\)/);
  assert.match(source, /form\.set\("file", multipartBlob, uploadFile\.name\)/);
  assert.match(source, /optimizeToggle\.checked = true/);
  assert.match(source, /The source file on your computer is never changed/);
});

test("4 MB PNG poster becomes smaller WebP with longest edge 2400 pixels", async () => {
  const { optimize, canvas, counts } = optimizer();
  const original = new File([new Uint8Array(4 * 1024 * 1024)], "Show Poster.png", { type: "image/png" });
  const result = await optimize(original);
  assert.notEqual(result, original);
  assert.equal(result.name, "Show Poster.webp");
  assert.equal(result.type, "image/webp");
  assert.equal(result.size, 400 * 1024);
  assert.equal(original.size, 4 * 1024 * 1024);
  assert.equal(original.type, "image/png");
  assert.equal(canvas().width, 1280);
  assert.equal(canvas().height, 2400);
  assert.deepEqual(counts(), { created: 1, revoked: 1 });
});

test("small images are passed through with no conversion", async () => {
  const { optimize, counts } = optimizer();
  const original = new File([new Uint8Array(100 * 1024)], "small.png", { type: "image/png" });
  assert.equal(await optimize(original), original);
  assert.deepEqual(counts(), { created: 0, revoked: 0 });
});

test("optimizer never uses a larger image or a non-WebP conversion", async () => {
  const original = new File([new Uint8Array(2 * 1024 * 1024)], "poster.png", { type: "image/png" });
  assert.equal(await optimizer({ resultBytes: 3 * 1024 * 1024 }).optimize(original), original);
  assert.equal(await optimizer({ resultType: "image/png" }).optimize(original), original);
});

test("no automatic retry of potentially successful POST upload on 408/network failure", () => {
  assert.match(source, /never automatically retry POST/);
  assert.match(source, /Check Refresh before retrying/);
});

test("multipart upload passes a Blob while preserving bytes, MIME and filename", async () => {
  const start = source.indexOf("      const form = new FormData();", source.indexOf("  async function upload(file) {"));
  const end = source.indexOf('      await fetchJson("/api/admin/media/upload"', start);
  assert.ok(start >= 0 && end > start, "Upload code must construct the actual FormData");
  const buildForm = new Function("uploadFile", "folder",
    source.slice(start, end) + "\nreturn form;");
  for (const type of ["image/png", "image/webp"]) {
    const extension = type === "image/png" ? ".png" : ".webp";
    const bytes = new Uint8Array(1024 * 1024 + 31);
    bytes[0] = 137; bytes[256] = 42; bytes[bytes.length - 1] = 99;
    const original = new File([bytes], "Poster" + extension, { type });
    const form = buildForm(original, "portfolio");
    assert.equal(form.get("folder"), "portfolio");
    const uploaded = form.get("file");
    assert.equal(uploaded.name, original.name);
    assert.equal(uploaded.type, original.type);
    assert.equal(uploaded.size, original.size);
    assert.deepEqual(new Uint8Array(await uploaded.arrayBuffer()), bytes);
    assert.notEqual(uploaded, original, "Uploaded part should be Blob-backed rather than the disk-backed File");
  }
});
