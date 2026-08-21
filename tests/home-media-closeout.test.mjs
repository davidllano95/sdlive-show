import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const retiredMigrators = [
  "admin/editor/trusted-media-migration.js",
  "admin/editor/testimonials-media-migration.js",
  "admin/editor/core-media-migration.js",
  "admin/editor/rental-media-migration.js"
];

test("retired Home media migrators are no longer loaded by the Editor shell", async () => {
  const shell = await readFile(
    new URL("../admin/editor/admin-shell.js", import.meta.url),
    "utf8"
  );

  for (const file of retiredMigrators) {
    assert.equal(
      shell.includes(file.split("/").pop()),
      false,
      `${file} should not be loaded after Home R2 closeout`
    );
  }

  assert.match(shell, /media-library\.js/);
  assert.match(shell, /core-media-library-bridge\.js/);
  assert.match(shell, /trusted-media-controls\.js/);
});

test("retired Home media migrator source files are removed", async () => {
  for (const file of retiredMigrators) {
    await assert.rejects(
      access(new URL(`../${file}`, import.meta.url)),
      (error) => error?.code === "ENOENT",
      `${file} should be absent after the closeout cleanup`
    );
  }
});
