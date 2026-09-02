import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../assistant-public-widget.js", import.meta.url), "utf8");

test("Assistant rebuilds Turnstile after each consumed token", () => {
  assert.match(source, /window\.turnstile\.remove\(widgetId\)/);
  assert.match(source, /widgetId = null;\s+turnstileContainer\?\.replaceChildren\(\);/s);
  assert.match(source, /if \(root\?\.dataset\.open === "true"\) ensureSecurity\(\);/);
  assert.doesNotMatch(source, /window\.turnstile\.reset\(widgetId\)/);
});

test("Assistant clears stale Sending status after API completion", () => {
  assert.match(source, /function handleApiError\(response, data\) \{\s+setStatus\(""\);/s);
  assert.match(source, /function handleApiSuccess\(data\) \{\s+setStatus\(""\);/s);
});
