import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("combined Google Calendar sync shares a bounded write budget", async () => {
  const source = await readFile(
    new URL("../site-schedule-google-projection.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /const MAX_COMBINED_SYNC_WRITES = 40;/);
  assert.match(source, /const registroWrites = registro\.created \+ registro\.updated;/);
  assert.match(source, /const remainingWrites = Math\.max\(0, MAX_COMBINED_SYNC_WRITES - registroWrites\);/);
  assert.match(source, /maxWrites:\s*remainingWrites/);
  assert.match(source, /const writeLimit = boundedWriteLimit\(maxWrites\);/);

  const loopGuards = source.match(/writes >= writeLimit/g) || [];
  assert.equal(loopGuards.length, 3);
});
