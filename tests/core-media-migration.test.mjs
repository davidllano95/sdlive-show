import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("core media migrator covers every current core CMS section with editable media", async () => {
  const migration = await source("admin/editor/core-media-migration.js");
  assert.doesNotThrow(() => new Function(migration));
  assert.match(migration, /about:/);
  assert.match(migration, /folder: "about"/);
  assert.match(migration, /work:/);
  assert.match(migration, /folder: "portfolio"/);
  assert.match(migration, /items\.\$\{index\}\.image\.src/);
});

test("core media migrator copies legacy assets to R2 and saves Draft only", async () => {
  const migration = await source("admin/editor/core-media-migration.js");
  assert.match(migration, /assets\/media\//);
  assert.match(migration, /\/api\/admin\/media\/upload/);
  assert.match(migration, /method: "PUT"/);
  assert.match(migration, /Production will not change until you Publish/);
  assert.doesNotMatch(migration, /\/publish/);
});

test("core media migrator is intentionally temporary and loaded after core editor", async () => {
  const migration = await source("admin/editor/core-media-migration.js");
  const shell = await source("admin/editor/admin-shell.js");
  assert.match(migration, /R2 migration/);
  assert.match(shell, /core-media-migration\.js\?v=20260821-1/);
  assert.ok(shell.indexOf("core-sections-editor.js") < shell.indexOf("core-media-migration.js"));
});
