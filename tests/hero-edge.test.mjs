import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  brandHtml,
  cookieLanguage,
  isAdminPreviewRequest,
  isValidHeroContent,
  normalizeLanguage,
  preferredRequestLanguage,
  readPublishedHero
} from "../worker-entry.js";

const validHero = {
  headline: {
    line1: { en: "Creative Audio.", es: "Audio creativo." },
    line2: { en: "Technical systems.", es: "Sistemas técnicos." },
    accent: { en: "Built for the show.", es: "Hecho para el show." }
  },
  lede: {
    en: "SD.Live combines creative sound and technical systems.",
    es: "SD.Live combina sonido creativo y sistemas técnicos."
  },
  actions: {
    primary: {
      label: { en: "Start a project", es: "Iniciar un proyecto" },
      href: "#contact"
    },
    secondary: {
      label: { en: "See the work", es: "Ver trabajos" },
      href: "#work"
    }
  },
  stats: Array.from({ length: 4 }, (_, index) => ({
    value: { en: `${index + 1}`, es: `${index + 1}` },
    label: { en: `Stat ${index + 1}`, es: `Dato ${index + 1}` }
  }))
};

function blobBytes(value) {
  return Array.from(
    new TextEncoder().encode(JSON.stringify(value))
  );
}

function d1WithRow(row) {
  return {
    prepare() {
      return {
        bind(...values) {
          assert.deepEqual(values, ["hero", "all", "root"]);
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

test("Hero schema accepts the published shape", () => {
  assert.equal(isValidHeroContent(validHero), true);
});

test("Hero schema rejects invalid actions and stat counts", () => {
  const badHref = structuredClone(validHero);
  badHref.actions.primary.href = "https://example.com";
  assert.equal(isValidHeroContent(badHref), false);

  const badStats = structuredClone(validHero);
  badStats.stats.pop();
  assert.equal(isValidHeroContent(badStats), false);
});

test("language normalization only accepts en/es", () => {
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("es"), "es");
  assert.equal(normalizeLanguage("es-CO"), null);
  assert.equal(normalizeLanguage("fr"), null);
});

test("saved language cookie wins over Accept-Language", () => {
  const request = new Request("https://sdlive.show/", {
    headers: {
      Cookie: "foo=1; sdlive-language-preference=es; bar=2",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  assert.equal(cookieLanguage(request), "es");
  assert.equal(preferredRequestLanguage(request), "es");
});

test("Accept-Language is used when there is no saved cookie", () => {
  const spanish = new Request("https://sdlive.show/", {
    headers: { "Accept-Language": "es-CO,es;q=0.9,en;q=0.8" }
  });
  const english = new Request("https://sdlive.show/", {
    headers: { "Accept-Language": "en-US,en;q=0.9" }
  });
  const unknown = new Request("https://sdlive.show/", {
    headers: { "Accept-Language": "fr-FR,fr;q=0.9" }
  });

  assert.equal(preferredRequestLanguage(spanish), "es");
  assert.equal(preferredRequestLanguage(english), "en");
  assert.equal(preferredRequestLanguage(unknown), "en");
});

test("brand HTML escapes arbitrary markup and renders the visual SD.Live wordmark", () => {
  const html = brandHtml("<b>SD.Live</b>");

  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /brand-wordmark-text/);
  assert.match(html, /brand-wordmark-text__dot/);
  assert.doesNotMatch(html, /<b>/);
});

test("published Hero reader returns valid D1 content", async () => {
  const env = {
    CMS_DB: d1WithRow({
      published_blob: blobBytes(validHero),
      published_at: "2026-08-20 18:00:00"
    })
  };

  const result = await readPublishedHero(env);

  assert.deepEqual(result.content, validHero);
  assert.equal(result.publishedAt, "2026-08-20 18:00:00");
});

test("published Hero reader fails closed for invalid CMS content", async () => {
  const invalidHero = structuredClone(validHero);
  invalidHero.stats = [];

  const env = {
    CMS_DB: d1WithRow({
      published_blob: blobBytes(invalidHero),
      published_at: "2026-08-20 18:00:00"
    })
  };

  await assert.rejects(
    readPublishedHero(env),
    /Published Hero is invalid/
  );
});

test("Admin iframe preview is isolated from public Published rendering", () => {
  const adminPreview = new Request("https://sdlive.show/", {
    headers: {
      "Sec-Fetch-Dest": "iframe",
      Referer: "https://sdlive.show/admin/editor/"
    }
  });
  const publicIframe = new Request("https://sdlive.show/", {
    headers: {
      "Sec-Fetch-Dest": "iframe",
      Referer: "https://example.com/embed"
    }
  });

  assert.equal(isAdminPreviewRequest(adminPreview), true);
  assert.equal(isAdminPreviewRequest(publicIframe), false);
});

test("public Home strips staging while static Admin preview keeps the staging source", async () => {
  const [workerSource, staticHome] = await Promise.all([
    readFile(new URL("../worker-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);

  assert.match(staticHome, /id="contentStaging"/);
  assert.match(staticHome, /Future picture project/);
  assert.match(
    workerSource,
    /\.on\("#contentStaging",\s*\{[\s\S]*?element\.remove\(\);[\s\S]*?\}\)/
  );
});

test("publish failsafe iframe uses the public Home path, not the Admin preview bypass", () => {
  const failsafeRequest = new Request(
    "https://sdlive.show/?failsafe_verify=1",
    {
      headers: {
        "Sec-Fetch-Dest": "iframe",
        Referer: "https://sdlive.show/admin/editor/"
      }
    }
  );

  assert.equal(isAdminPreviewRequest(failsafeRequest), false);
});

test("client Hero binding preserves the server-rendered fast path", async () => {
  const source = await readFile(
    new URL("../hero-content.js", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /hero\.dataset\.serverRendered\s*===\s*"true"/
  );
  assert.match(
    source,
    /Do not hide it again or make a second CMS/
  );
});

test("language bootstrap persists language for the next edge request", async () => {
  const source = await readFile(
    new URL("../language-bootstrap.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /SameSite=Lax/);
  assert.match(source, /writeCookie\(preferred\)/);
  assert.match(source, /writeCookie\(next\)/);
  assert.match(source, /languageMismatch/);
});
