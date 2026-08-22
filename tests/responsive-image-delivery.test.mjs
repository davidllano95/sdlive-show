import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { headerLogoSrcset } from "../worker-router.js";

test("public header logo uses bounded Cloudflare responsive variants", () => {
  assert.equal(
    headerLogoSrcset("assets/logos/sd-live-header-normal-symbol.png"),
    "/cdn-cgi/image/width=192,format=auto,fit=scale-down/assets/logos/sd-live-header-normal-symbol.png 192w, /cdn-cgi/image/width=384,format=auto,fit=scale-down/assets/logos/sd-live-header-normal-symbol.png 384w"
  );
});

test("header responsive helper refuses remote/data sources", () => {
  assert.equal(headerLogoSrcset("https://example.com/logo.png"), "");
  assert.equal(headerLogoSrcset("data:image/png;base64,abc"), "");
});

test("responsive header delivery is public-edge only and preserves static Admin source", async () => {
  const [routerSource, staticHome] = await Promise.all([
    readFile(new URL("../worker-router.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);

  assert.match(routerSource, /\.on\("\.brand-logo img"/);
  assert.match(routerSource, /\(max-width: 700px\) 148px, 178px/);
  assert.doesNotMatch(staticHome, /\/cdn-cgi\/image\//);
  assert.match(staticHome, /sd-live-header-normal-symbol\.png/);
  assert.match(staticHome, /sd-live-header-showday\.png/);
});
