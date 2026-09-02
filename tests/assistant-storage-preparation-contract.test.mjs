import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_STORAGE_PREPARATION_CONFIRMATION,
  ASSISTANT_STORAGE_PREPARATION_PATH
} from "../assistant-admin-storage-preparation.js";

test("Assistant storage preparation keeps its one-time Admin contract stable", () => {
  assert.equal(ASSISTANT_STORAGE_PREPARATION_PATH, "/api/admin/assistant/storage-prepare");
  assert.equal(ASSISTANT_STORAGE_PREPARATION_CONFIRMATION, "PREPARE_ASSISTANT_STORAGE");
});
