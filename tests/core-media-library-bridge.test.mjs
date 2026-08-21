import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("About and Selected Work can reuse existing R2 media without duplicate upload", async () => {
  const bridge = await source("admin/editor/core-media-library-bridge.js");
  const shell = await source("admin/editor/admin-shell.js");

  assert.doesNotThrow(() => new Function(bridge));
  assert.match(bridge, /SDLiveMediaLibrary\.open/);
  assert.match(bridge, /folder: "about"/);
  assert.match(bridge, /folder: "portfolio"/);
  assert.match(bridge, /items\.\$\{index\}\.image\.src/);
  assert.match(bridge, /item\.logicalPath/);
  assert.doesNotMatch(bridge, /\/api\/admin\/media\/upload/);
  assert.match(bridge, /Save Draft first/);
  assert.match(shell, /core-media-library-bridge\.js\?v=20260821-1/);
});
