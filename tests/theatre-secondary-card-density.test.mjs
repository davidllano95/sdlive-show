import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("theatre secondary cards use natural content height without bottom-pinned lists", async () => {
  const css = await readFile(path.join(ROOT, "theatre-landing.css"), "utf8");
  const html = await readFile(path.join(ROOT, "theatre-sound-design-audio-post.html"), "utf8");

  assert.doesNotMatch(css, /\.theatre-service-card--secondary\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1;/s);
  assert.doesNotMatch(css, /\.theatre-service-card--secondary\s+ul\s*\{[^}]*margin-top:\s*auto;/s);
  assert.match(css, /\.theatre-service-card\s+ul\s*\{[^}]*margin-top:\s*22px;/s);
  assert.match(html, /theatre-landing\.css\?v=20260825-1/);
});
