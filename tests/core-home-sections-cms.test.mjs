import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CORE_SECTION_DEFAULTS,
  cloneCoreSectionDefault,
  validateCoreSectionDraft
} from "../core-sections-content.js";
import { handleCoreSectionsApi, sectionFromPath } from "../core-sections-api.js";
import {
  readPublishedCoreSection,
  renderAboutInnerHtml,
  renderInternationalInnerHtml,
  renderServicesInnerHtml,
  renderWorkInnerHtml,
  resolveCoreMediaSource
} from "../core-sections-edge.js";
import { normalizeFolder } from "../media-api.js";

function blobBytes(value) {
  return Array.from(new TextEncoder().encode(JSON.stringify(value)));
}

function d1SingleRow(section, row, onSql = () => {}) {
  return {
    prepare(sql) {
      onSql(sql);
      return {
        bind(...values) {
          return {
            async first() {
              assert.deepEqual(values, [section, "all", "root"]);
              return row;
            },
            async all() {
              return { results: [] };
            }
          };
        }
      };
    }
  };
}

test("all four core Home defaults validate and clone independently", () => {
  for (const section of ["about", "services", "work", "international"]) {
    assert.doesNotThrow(() => validateCoreSectionDraft(section, CORE_SECTION_DEFAULTS[section]));
    const copy = cloneCoreSectionDefault(section);
    assert.notEqual(copy, CORE_SECTION_DEFAULTS[section]);
  }

  const about = cloneCoreSectionDefault("about");
  about.title.en = "Changed";
  assert.equal(CORE_SECTION_DEFAULTS.about.title.en, "One person. Two ways of listening.");
});

test("core section validation rejects remote media, unsafe rich markup and invalid commercial metadata", () => {
  const about = cloneCoreSectionDefault("about");
  about.image.src = "https://example.com/person.jpg";
  assert.throws(() => validateCoreSectionDraft("about", about), /first-party asset/);

  const rich = cloneCoreSectionDefault("about");
  rich.paragraphs[0].en = '<strong onclick="bad()">No</strong>';
  assert.throws(() => validateCoreSectionDraft("about", rich), /may only contain <strong>/);

  const services = cloneCoreSectionDefault("services");
  services.items[0].market = "mars";
  assert.throws(() => validateCoreSectionDraft("services", services), /market is invalid/);

  const badCategory = cloneCoreSectionDefault("services");
  badCategory.items[0].categories = ["doorway-keyword"];
  assert.throws(() => validateCoreSectionDraft("services", badCategory), /categories is invalid/);

  const work = cloneCoreSectionDefault("work");
  work.items[0].cta.href.en = "https://example.com/redirect";
  assert.throws(() => validateCoreSectionDraft("work", work), /internal SD.Live path or hash/);
});

test("core media keeps first-party static assets and resolves logical R2 references", () => {
  assert.equal(
    resolveCoreMediaSource("assets/media/cms/about/photo.webp"),
    "https://media.sdlive.show/cms/about/photo.webp"
  );
  assert.equal(
    resolveCoreMediaSource("assets/clients/wonderlust.png"),
    "assets/clients/wonderlust.png"
  );
  assert.equal(normalizeFolder("about"), "about");
  assert.equal(normalizeFolder("portfolio"), "portfolio");
});

test("About renderer preserves established layout, rich copy and R2 metadata", () => {
  const about = cloneCoreSectionDefault("about");
  about.image.src = "assets/media/cms/about/samuel.webp";
  about.image.scale = 1.15;
  const html = renderAboutInnerHtml(about, "en");

  assert.match(html, /container about-grid/);
  assert.match(html, /about-photo glass reveal/);
  assert.match(html, /about-copy reveal/);
  assert.match(html, /<strong>Sonolux Creative<\/strong>/);
  assert.match(html, /https:\/\/media\.sdlive\.show\/cms\/about\/samuel\.webp/);
  assert.match(html, /data-cms-media-source="assets\/media\/cms\/about\/samuel\.webp"/);
  assert.match(html, /style="scale:1\.15"/);
});

test("Services renderer preserves filters, market visibility, pricing and card aesthetic contracts", () => {
  const services = cloneCoreSectionDefault("services");
  const html = renderServicesInnerHtml(services, "es");

  assert.match(html, /filter-pills/);
  assert.match(html, /data-filter="corporate"/);
  assert.match(html, /services-grid/);
  assert.match(html, /service-card glass reveal/);
  assert.match(html, /data-service-id="live-production-audio"/);
  assert.match(html, /data-category="theatre corporate"/);
  assert.match(html, /local-market-only/);
  assert.match(html, /international-market-only service-project-quote/);
  assert.match(html, /\$350\.000 COP \/ día/);
  assert.match(html, /Cotización según el proyecto/);
  assert.match(html, /equipment-rental-support/);
  assert.match(html, /data-en-href="theatre-sound-design-audio-post"/);
  assert.match(html, /data-es-href="audio-eventos-streaming-teatro-bogota"/);
});

test("Work renderer keeps real current cards, image presentation and CTA language metadata", () => {
  const work = cloneCoreSectionDefault("work");
  work.items[0].image.src = "assets/media/cms/portfolio/sonolux.webp";
  const html = renderWorkInnerHtml(work, "en");

  assert.match(html, /work-grid/);
  assert.match(html, /work-card glass reveal/);
  assert.match(html, /work-image work-image--logo/);
  assert.match(html, /data-work-id="sonolux-international-workflows"/);
  assert.match(html, /data-work-id="wonderlust-broadcast-audio"/);
  assert.match(html, /data-work-id="rent-2productores"/);
  assert.doesNotMatch(html, /Future selected work/);
  assert.match(html, /https:\/\/media\.sdlive\.show\/cms\/portfolio\/sonolux\.webp/);
  assert.match(html, /data-en-href=/);
});

test("International renderer keeps the approved quote-panel aesthetic and contextual CTA", () => {
  const html = renderInternationalInnerHtml(cloneCoreSectionDefault("international"), "es");
  assert.match(html, /international-quote-panel glass reveal/);
  assert.match(html, /Producciones internacionales/);
  assert.match(html, /Diseño de sonido para teatro y producciones de cruceros/);
  assert.match(html, /class="btn btn-primary"/);
  assert.match(html, /href="#contact"/);
});

test("Published core reader reads published_json only and validates before rendering", async () => {
  let observedSql = "";
  const services = cloneCoreSectionDefault("services");
  services.title.en = "Published services";
  const result = await readPublishedCoreSection(
    { CMS_DB: d1SingleRow("services", {
      published_blob: blobBytes(services),
      published_at: "2026-08-21 01:00:00"
    }, (sql) => { observedSql = sql; }) },
    "services"
  );

  assert.equal(result.content.title.en, "Published services");
  assert.match(observedSql, /published_json/);
  assert.doesNotMatch(observedSql, /draft_json/);

  const invalid = cloneCoreSectionDefault("services");
  invalid.items = [];
  await assert.rejects(
    readPublishedCoreSection({
      CMS_DB: d1SingleRow("services", {
        published_blob: blobBytes(invalid),
        published_at: "2026-08-21 01:00:00"
      })
    }, "services"),
    /services\.items is invalid/
  );
});

test("core API recognizes only the four intended sections and requires Access for Admin", async () => {
  assert.equal(sectionFromPath("/api/content/about"), "about");
  assert.equal(sectionFromPath("/api/admin/content/services/publish"), "services");
  assert.equal(sectionFromPath("/api/admin/content/work/revisions"), "work");
  assert.equal(sectionFromPath("/api/content/international"), "international");
  assert.equal(sectionFromPath("/api/content/rental"), null);

  const response = await handleCoreSectionsApi(
    new Request("https://sdlive.show/api/admin/content/about"),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(response.status, 403);
});

test("core public API falls back to static defaults without creating D1 state", async () => {
  const response = await handleCoreSectionsApi(
    new Request("https://sdlive.show/api/content/international"),
    { CMS_DB: d1SingleRow("international", null) }
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.source, "static-default");
  assert.equal(payload.content.cta.href.en, "#contact");
});

test("Worker router binds all core Published sections while keeping Admin preview isolated", async () => {
  const source = await readFile(new URL("../worker-router.js", import.meta.url), "utf8");
  assert.match(source, /handleCoreSectionsApi/);
  assert.match(source, /readPublishedCoreSection/);
  assert.match(source, /renderAboutInnerHtml/);
  assert.match(source, /renderServicesInnerHtml/);
  assert.match(source, /renderWorkInnerHtml/);
  assert.match(source, /renderInternationalInnerHtml/);
  assert.match(source, /\.on\("#about"/);
  assert.match(source, /\.on\("#services"/);
  assert.match(source, /\.on\("#work"/);
  assert.match(source, /\.on\("#international"/);
  assert.match(source, /isAdminPreviewRequest\(request\)/);
  assert.match(source, /static-fallback/);
});

test("core Editor owns four sections, R2 media, Draft Publish and exact preview selection", async () => {
  const [bootstrap, editor, shell] = await Promise.all([
    readFile(new URL("../admin/editor/core-sections-bootstrap.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/editor/core-sections-editor.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/editor/admin-shell.js", import.meta.url), "utf8")
  ]);

  assert.doesNotThrow(() => new Function(bootstrap));
  assert.doesNotThrow(() => new Function(editor));
  assert.match(editor, /new Set\(\["about", "services", "work", "international"\]\)/);
  assert.match(editor, /api\/admin\/content\/\$\{activeSection\}/);
  assert.match(editor, /api\/admin\/content\/\$\{activeSection\}\/publish/);
  assert.match(editor, /api\/admin\/media\/upload/);
  assert.match(editor, /folder: "about"/);
  assert.match(editor, /folder: "portfolio"/);
  assert.match(editor, /\+ Add service/);
  assert.match(editor, /\+ Add work card/);
  assert.match(editor, /\+ Add paragraph/);
  assert.match(editor, /data-cms-editor-key/);
  assert.match(editor, /stopImmediatePropagation/);
  assert.match(bootstrap, /coreSectionsBound = "true"/);
  assert.match(shell, /core-sections-bootstrap\.js/);
  assert.match(shell, /core-sections-editor\.js/);
  assert.ok(shell.indexOf("core-sections-bootstrap.js") < shell.indexOf("core-sections-editor.js"));
});

test("core SSR renderers explicitly preserve established aesthetic class contracts", async () => {
  const edge = await readFile(new URL("../core-sections-edge.js", import.meta.url), "utf8");
  assert.match(edge, /about-photo glass reveal/);
  assert.match(edge, /about-copy reveal/);
  assert.match(edge, /service-card\$\{marketClass\} glass reveal/);
  assert.match(edge, /work-card glass reveal/);
  assert.match(edge, /international-quote-panel glass reveal/);
  assert.match(edge, /btn btn-ghost/);
  assert.match(edge, /btn btn-primary/);
});
