import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("public SSR Home skips the redundant Hero hydration module chain", async () => {
  const [navigation, workerEntry, heroBinding] = await Promise.all([
    source("home-navigation.js"),
    source("worker-entry.js"),
    source("hero-content.js")
  ]);

  const guardIndex = navigation.indexOf(
    'hero?.dataset.serverRendered === "true"'
  );
  const importIndex = navigation.indexOf(
    'import("/hero-content.js?v=20260820-4")'
  );

  assert.ok(guardIndex >= 0, "SSR guard must exist");
  assert.ok(importIndex >= 0, "fallback Hero binding must remain available");
  assert.ok(
    guardIndex < importIndex,
    "SSR guard must run before the fallback module import"
  );

  assert.match(
    workerEntry,
    /element\.setAttribute\("data-server-rendered",\s*"true"\)/
  );
  assert.match(
    heroBinding,
    /hero\.dataset\.serverRendered\s*===\s*"true"/
  );
  assert.match(
    heroBinding,
    /cms-hydration\.js\?v=20260820-3/
  );
});

test("static and Admin Home retain the Hero fallback path", async () => {
  const [staticHome, navigation] = await Promise.all([
    source("index.html"),
    source("home-navigation.js")
  ]);

  const heroTag = staticHome.match(/<section[^>]+id="hero"[^>]*>/)?.[0] || "";

  assert.match(heroTag, /data-cms-state="loading"/);
  assert.doesNotMatch(heroTag, /data-server-rendered/);
  assert.match(navigation, /loadHeroContentBinding\(\);/);
  assert.match(navigation, /import\("\/hero-content\.js\?v=20260820-4"\)/);
});
