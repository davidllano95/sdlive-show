import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  normalizeTrustedPlacement,
  normalizeTrustedScale,
  readPublishedTrusted,
  renderTrustedInnerHtml,
  resolveTrustedMediaSource
} from "../trusted-edge.js";

const validTrusted = {
  title: {
    en: "Trusted by",
    es: "Con la confianza de"
  },
  clients: [
    {
      id: "wonderlust",
      name: "Wonderlust",
      role: {
        en: "Broadcast Audio and Sound Design",
        es: "Audio para broadcast y diseño de sonido"
      },
      cardClass: "client-strip-card--secondary",
      logo: {
        src: "assets/media/cms/clients/wonderlust.webp",
        alt: "Wonderlust",
        className: "",
        width: 800,
        height: 320,
        scale: "1.25"
      },
      reveal: {
        id: "wonderlustSupportedBrands",
        className: "supported-reveal--wide",
        label: {
          en: "Brands supported through Wonderlust",
          es: "Marcas atendidas a través de Wonderlust"
        },
        layoutClass: "supported-reveal-logos--wonderlust",
        items: [
          {
            type: "logo",
            src: "assets/media/cms/brands/anda.webp",
            alt: "ANDA",
            className: "",
            tileClass: "",
            width: 800,
            height: 240,
            scale: 0.8,
            placement: "center"
          }
        ]
      }
    },
    {
      id: "wlive",
      name: "WLive",
      role: { en: "Broadcast and Live Audio", es: "Broadcast y audio en vivo" },
      cardClass: "",
      logo: {
        src: "assets/clients/wlive.png",
        alt: "WLive",
        className: "client-logo--wlive",
        width: 800,
        height: 320
      },
      reveal: null
    }
  ]
};

function blobBytes(value) {
  return Array.from(new TextEncoder().encode(JSON.stringify(value)));
}

function d1WithRow(row) {
  return {
    prepare(sql) {
      assert.match(sql, /published_json/);
      assert.doesNotMatch(sql, /draft_json/);

      return {
        bind(...values) {
          assert.deepEqual(values, ["trusted", "all", "root"]);
          return {
            async first() {
              return row;
            }
          };
        }
      };
    }
  };
}

test("Trusted media resolver maps logical R2 references to the public media domain", () => {
  assert.equal(
    resolveTrustedMediaSource("assets/media/cms/clients/logo.webp"),
    "https://media.sdlive.show/cms/clients/logo.webp"
  );
  assert.equal(
    resolveTrustedMediaSource("assets/clients/logo.png"),
    "assets/clients/logo.png"
  );
});

test("Trusted visual controls are normalized to safe values", () => {
  assert.equal(normalizeTrustedScale("1.35"), 1.35);
  assert.equal(normalizeTrustedScale(99), 1.8);
  assert.equal(normalizeTrustedScale("bad"), 1);
  assert.equal(normalizeTrustedPlacement("center"), "center");
  assert.equal(normalizeTrustedPlacement("somewhere"), "auto");
});

test("Trusted public renderer outputs localized CMS content, R2 media, scale and placement", () => {
  const html = renderTrustedInnerHtml(validTrusted, "es");

  assert.match(html, /Con la confianza de/);
  assert.match(html, /data-en="Trusted by"/);
  assert.match(html, /https:\/\/media\.sdlive\.show\/cms\/clients\/wonderlust\.webp/);
  assert.match(html, /data-cms-media-source="assets\/media\/cms\/clients\/wonderlust\.webp"/);
  assert.match(html, /style="scale:1\.25"/);
  assert.match(html, /supported-reveal-logos--wonderlust/);
  assert.match(html, /supported-brand-tile/);
  assert.match(html, /data-cms-brand-placement="center"/);
  assert.match(html, /WLive/);
});

test("Published Trusted reader uses only published_json and validates before rendering", async () => {
  const env = {
    CMS_DB: d1WithRow({
      published_blob: blobBytes(validTrusted),
      published_at: "2026-08-20 22:45:00"
    })
  };

  const result = await readPublishedTrusted(env);
  assert.deepEqual(result.content, validTrusted);
  assert.equal(result.publishedAt, "2026-08-20 22:45:00");
});

test("Published Trusted reader fails closed for invalid content", async () => {
  const invalid = structuredClone(validTrusted);
  invalid.clients = [];

  const env = {
    CMS_DB: d1WithRow({
      published_blob: blobBytes(invalid),
      published_at: "2026-08-20 22:45:00"
    })
  };

  await assert.rejects(readPublishedTrusted(env), /clients must contain/);
});

test("Worker router binds Trusted Published only on the public Home and preserves Admin preview isolation", async () => {
  const source = await readFile(
    new URL("../worker-router.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /readPublishedTrusted/);
  assert.match(source, /renderTrustedInnerHtml/);
  assert.match(source, /isAdminPreviewRequest\(request\)/);
  assert.match(source, /\.on\("\.trusted-wrap"/);
  assert.match(source, /setInnerContent/);
  assert.match(source, /X-SDLive-Trusted-Render/);
  assert.match(source, /trusted-published-runtime\.js/);
  assert.match(source, /TRUSTED_RUNTIME_VERSION = "20260820-2"/);
});

test("Published Trusted runtime preserves responsive placement and live carousel stability", async () => {
  const source = await readFile(
    new URL("../trusted-published-runtime.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /data-cms-brand-placement/);
  assert.match(source, /countGridColumns/);
  assert.match(source, /gridSpan/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /gridColumn = `\$\{start\} \/ span \$\{span\}`/);

  // Language switching must freeze/restore the existing animation instead of
  // rebuilding duplicate marquee sets and losing their hover listeners.
  assert.match(source, /stablePrepareMarqueesForLanguageChange/);
  assert.match(source, /stableRestoreMarqueesAfterLanguageChange/);
  assert.match(source, /window\.prepareMarqueesForLanguageChange/);
  assert.match(source, /window\.restoreMarqueesAfterLanguageChange/);
  assert.match(source, /animation\.currentTime = currentTime/);
  assert.doesNotMatch(source, /track\.lastElementChild\.remove/);

  // Moving cards do not start a child sheen animation on hover, avoiding a
  // compositor hitch that can look like the marquee briefly jumps backward.
  assert.match(source, /client-strip-card:hover::after/);
  assert.match(source, /animation: none !important/);
});
