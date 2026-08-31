import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Site Schedule Google sync reuses the canonical Calendar row normalizer", async () => {
  const source = await readFile(new URL("../site-schedule-google-projection.js", import.meta.url), "utf8");
  assert.match(source, /import \{ normalizeCalendarRows \} from \"\.\/calendar-api\.js\";/);
  assert.match(source, /normalizeCalendarRows\(\[row\], fieldIndex\)\.events\[0\]/);
  assert.match(source, /sourceEvents:\s*sourceEvents\.length/);
  assert.doesNotMatch(source, /const startDate = sheetDateToIso\(at\(row, \"Fecha trabajo\"\)\)/);
});
