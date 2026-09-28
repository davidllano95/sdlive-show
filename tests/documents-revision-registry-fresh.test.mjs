import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("revision UX refreshes registry before resolving a finalized row", () => {
  const ux = read("admin/documents/revision-ux.js");
  assert.match(ux, /captureRegistrySelection[\s\S]*readRegistry\(\{\s*fresh:\s*true\s*\}\)/);
});

test("revision UX asset version is bumped after registry identity fix", () => {
  const router = read("admin/documents/state-router-fix.js");
  assert.match(router, /revision-ux\.js\?v=20260928-2/);
});
