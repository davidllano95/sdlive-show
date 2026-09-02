import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("Assistant storage preparation route is mounted only in Admin stabilization runtime", async () => {
  const [adminWorker, publicWorker] = await Promise.all([
    text("admin-stabilization-worker.js"),
    text("public-form-rate-limit.js")
  ]);

  assert.match(adminWorker, /handleAssistantStoragePreparationApi/);
  assert.match(adminWorker, /\/api\/admin\/assistant\/storage-prepare/);
  assert.doesNotMatch(publicWorker, /handleAssistantStoragePreparationApi/);
  assert.doesNotMatch(publicWorker, /\/api\/admin\/assistant\/storage-prepare/);
});
