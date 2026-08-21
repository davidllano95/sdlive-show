import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Trusted media migration copies legacy client and brand assets to R2 without auto-saving", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-media-migration.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /Migrate legacy media/);
  assert.match(source, /assets\/clients\//);
  assert.match(source, /assets\/brands\//);
  assert.match(source, /\/api\/admin\/media\/upload/);
  assert.match(source, /logicalMediaPath/);
  assert.match(source, /Save Draft/);
  assert.match(source, /current unsaved Draft references/);
  assert.match(source, /dispatchEvent\(new Event\("input"/);
  assert.doesNotMatch(source, /\/api\/admin\/content\/trusted[^\n]*method:\s*"PUT"/);
});

test("Trusted migration button stays actionable and verifies legacy references from the saved Draft", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-media-migration.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /\/api\/admin\/content\/trusted/);
  assert.match(source, /legacyReferencesFromDraft/);
  assert.match(source, /effectiveLegacyReferences/);
  assert.match(source, /Check legacy media/);
  assert.match(source, /button\.disabled = busy/);
  assert.doesNotMatch(source, /button\.disabled = busy \|\| count === 0/);
  assert.match(source, /setText\(element, value\)/);
});
