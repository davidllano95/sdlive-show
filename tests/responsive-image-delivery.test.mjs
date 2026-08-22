import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  headerLogoSrcset,
  remoteCmsImageSrcset,
  trustedClientLogoSizes
} from "../worker-router.js";

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

test("R2 CMS media uses only the approved media.sdlive.show origin", () => {
  const source = "https://media.sdlive.show/cms/clients/example.png";
  assert.equal(
    remoteCmsImageSrcset(source, [192, 384, 768]),
    "/cdn-cgi/image/width=192,format=auto,fit=scale-down/https://media.sdlive.show/cms/clients/example.png 192w, /cdn-cgi/image/width=384,format=auto,fit=scale-down/https://media.sdlive.show/cms/clients/example.png 384w, /cdn-cgi/image/width=768,format=auto,fit=scale-down/https://media.sdlive.show/cms/clients/example.png 768w"
  );
  assert.equal(remoteCmsImageSrcset("https://example.com/image.png", [192]), "");
  assert.equal(remoteCmsImageSrcset("http://media.sdlive.show/image.png", [192]), "");
  assert.equal(remoteCmsImageSrcset("/cms/clients/image.png", [192]), "");
});

test("Trusted client sizes preserve the larger Sonolux presentation", () => {
  assert.equal(trustedClientLogoSizes("client-logo"), "184px");
  assert.equal(
    trustedClientLogoSizes("client-logo client-logo--sonolux"),
    "230px"
  );
});

test("responsive media delivery is public-edge only and preserves static Admin source", async () => {
  const [routerSource, staticHome] = await Promise.all([
    readFile(new URL("../worker-router.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);

  assert.match(routerSource, /\.on\("\.brand-logo img"/);
  assert.match(routerSource, /\(max-width: 700px\) 148px, 178px/);
  assert.match(
    routerSource,
    /\.trusted-wrap img\.client-logo\[data-cms-media-source\]/
  );
  assert.match(
    routerSource,
    /#about \.about-photo img\[data-cms-media-source\]/
  );
  assert.match(routerSource, /applyResponsiveMediaDelivery\(rewriter\.transform\(response\)\)/);
  assert.doesNotMatch(staticHome, /\/cdn-cgi\/image\//);
  assert.match(staticHome, /sd-live-header-normal-symbol\.png/);
  assert.match(staticHome, /sd-live-header-showday\.png/);
});
