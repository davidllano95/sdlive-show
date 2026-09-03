import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Enter sends the Assistant message while Shift+Enter keeps a newline", async () => {
  const js = await source("assistant-public-widget.js");
  assert.match(js, /input\.addEventListener\("keydown"/);
  assert.match(js, /event\.key !== "Enter" \|\| event\.shiftKey \|\| event\.isComposing/);
  assert.match(js, /event\.preventDefault\(\)/);
  assert.match(js, /if \(sendButton\.disabled\) return/);
  assert.match(js, /form\.requestSubmit\(sendButton\)/);
});
