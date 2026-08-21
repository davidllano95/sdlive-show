import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PRESENTATION_SECTION_DEFAULTS,
  clonePresentationDefault,
  validatePresentationSection
} from "../home-presentation-content.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Rental and Contact defaults validate", () => {
  assert.doesNotThrow(() => validatePresentationSection("rental", clonePresentationDefault("rental")));
  assert.doesNotThrow(() => validatePresentationSection("contact", clonePresentationDefault("contact")));
  assert.equal(Object.keys(PRESENTATION_SECTION_DEFAULTS.rental.items).length, 11);
});

test("Rental CMS keeps fixed transactional item keys", () => {
  const draft = clonePresentationDefault("rental");
  delete draft.items.wing;
  assert.throws(() => validatePresentationSection("rental", draft), /fixed production keys/);
});

test("Rental media accepts only first-party sources", () => {
  const draft = clonePresentationDefault("rental");
  draft.items.wing.image.src = "https://example.com/wing.webp";
  assert.throws(() => validatePresentationSection("rental", draft), /first-party asset/);
});

test("Rental CMS does not own prices availability or quote math", async () => {
  const editor = await read("admin/editor/presentation-sections-editor.js");
  const content = await read("home-presentation-content.js");
  const siteRuntime = await read("script.js");
  assert.match(editor, /Pricing, stock\/availability, preset equipment composition and quote calculations are intentionally not editable here/);
  assert.doesNotMatch(content, /dayOne\s*:/);
  assert.match(siteRuntime, /const RENTAL_PRICING =/);
  assert.match(siteRuntime, /lv1ClassicSolo/);
});

test("Rental and Contact use targeted edge patching, preserving transactional DOM", async () => {
  const edge = await read("home-presentation-edge.js");
  const router = await read("worker-router.js");
  assert.match(edge, /data-rental-item/);
  assert.match(edge, /#contactForm/);
  assert.doesNotMatch(edge, /setInnerContent\([^\n]*rental/);
  assert.match(router, /applyRentalHandlers/);
  assert.match(router, /applyContactHandlers/);
  assert.match(router, /readPublishedPresentationSection/);
  assert.match(router, /handlePresentationSectionsApi/);
  assert.match(router, /rental\|contact/);
});

test("Draft save and Publish remain separate operations", async () => {
  const presentationApi = await read("home-presentation-api.js");
  const coreApi = await read("core-sections-api.js");
  assert.match(presentationApi, /UPDATE cms_entries SET draft_json = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \?/);
  assert.match(presentationApi, /UPDATE cms_entries SET published_json = draft_json/);
  assert.doesNotMatch(presentationApi, /SET draft_json = \?,\s*published_json/);
  assert.match(coreApi, /UPDATE cms_entries SET draft_json = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \?/);
  assert.doesNotMatch(coreApi, /SET draft_json = \?,\s*published_json/);
});

test("Rental and Testimonials migrators verify Published references stay unchanged", async () => {
  const rental = await read("admin/editor/rental-media-migration.js");
  const testimonials = await read("admin/editor/testimonials-media-migration.js");
  for (const source of [rental, testimonials]) {
    assert.match(source, /Draft isolation check failed/);
    assert.match(source, /Published unchanged/);
    assert.match(source, /method: "PUT"/);
    assert.doesNotMatch(source, /\/publish"/);
  }
  assert.match(rental, /form\.set\("folder", "rental"\)/);
  assert.match(testimonials, /form\.set\("folder", "testimonials"\)/);
});

test("Editor loads presentation CMS and all current media migration helpers", async () => {
  const shell = await read("admin/editor/admin-shell.js");
  assert.match(shell, /presentation-sections-editor\.js/);
  assert.match(shell, /rental-media-migration\.js/);
  assert.match(shell, /testimonials-media-migration\.js/);
  assert.match(shell, /core-media-migration\.js/);
  assert.match(shell, /trusted-media-migration\.js/);
});

test("new presentation and migration browser scripts parse", async () => {
  for (const path of [
    "admin/editor/presentation-sections-editor.js",
    "admin/editor/rental-media-migration.js",
    "admin/editor/testimonials-media-migration.js"
  ]) {
    const source = await read(path);
    assert.doesNotThrow(() => new Function(source), `${path} should parse as browser JavaScript`);
  }
});

test("Rental media editor reuses the shared R2 Media Library", async () => {
  const editor = await read("admin/editor/presentation-sections-editor.js");
  assert.match(editor, /Choose from library/);
  assert.match(editor, /SDLiveMediaLibrary/);
  assert.match(editor, /folder, onSelect/);
});

test("Sound for Picture staging remains inert and is not silently promoted to CMS", async () => {
  const html = await read("index.html");
  const router = await read("worker-router.js");
  assert.match(html, /data-placeholder-section="picture-project"/);
  assert.match(html, /content-staging[^>]*hidden/);
  assert.doesNotMatch(router, /api\/content\/picture/);
});
