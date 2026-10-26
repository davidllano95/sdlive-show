import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkPortfolio, handleWorkPortfolioApi } from "../work-portfolio-api.js";

const base = {
  slug: "the-wild-cards",
  title: "The Wild Cards",
  company: "Sonolux Creative",
  credit: "Associate Sound Designer",
  area: "technical",
  published: true,
  featured: true
};
const validImage = "assets/media/cms/portfolio/123-valid-poster.webp";

test("portfolio validation retains stable metadata and normalizes images", () => {
  const result = validateWorkPortfolio({ items: [{
    ...base, cover: validImage, rightsConfirmed: true,
    gallery: [{ src: validImage, alt: "Stage", caption: "Live scene" }]
  }] }, { publishing: true });
  assert.equal(result.items[0].cover, validImage);
  assert.equal(result.items[0].gallery[0].caption, "Live scene");
  assert.equal(result.items[0].kind, "project");
});

test("publishing with media requires publication permissions", () => {
  assert.throws(() => validateWorkPortfolio({ items: [{
    ...base, cover: validImage, rightsConfirmed: false
  }] }, { publishing: true }), /publication rights/i);
  assert.doesNotThrow(() => validateWorkPortfolio({ items: [{
    ...base, cover: validImage, rightsConfirmed: false
  }] }));
});

test("portfolio rejects duplicate slugs, invalid remote images and unsafe video URL", () => {
  assert.throws(() => validateWorkPortfolio({ items: [base, base] }), /duplicate slug/);
  assert.throws(() => validateWorkPortfolio({ items: [{
    ...base, cover: "https://example.com/external.png"
  }] }), /Media Library/);
  assert.throws(() => validateWorkPortfolio({ items: [{
    ...base, video: "javascript:alert(1)"
  }] }), /YouTube or Vimeo/);
});

test("Work admin API always requires existing Cloudflare Access identity", async () => {
  const response = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/admin/work/portfolio", { method: "GET" }), {}, {}
  );
  assert.equal(response.status, 403);
});

test("public portfolio excludes unpublished drafts and respects editorial order", async () => {
  const data = validateWorkPortfolio({ items: [
    { ...base, slug: "second", featured: false, order: 20 },
    { ...base, slug: "hidden", published: false, order: 0 },
    { ...base, slug: "first", order: 10 }
  ] });
  const blob = Array.from(new TextEncoder().encode(JSON.stringify(data)));
  const db = { prepare() {
    return { bind() { return this; }, async first() {
      return { published_blob: blob, draft_blob: blob, published_at: "2026-10-26" };
    } };
  } };
  const response = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/work/portfolio"), { CMS_DB: db }
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.content.items.map((x) => x.slug), ["first", "second"]);
});

test("public endpoint with no CMS record retains the existing seed fallback", async () => {
  const db = { prepare() { return { bind() { return this; }, async first() { return null; } }; } };
  const response = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/work/portfolio"), { CMS_DB: db }
  );
  const result = await response.json();
  assert.equal(result.source, "seed");
  assert.equal(result.content, null);
});

test("saving a first draft does not hide legacy public catalogue before Publish", async () => {
  const publishedEmpty = Array.from(new TextEncoder().encode(JSON.stringify({ items: [] })));
  const db = { prepare() {
    return { bind() { return this; }, async first() {
      return { published_blob: publishedEmpty, draft_blob: publishedEmpty, published_at: null };
    } };
  } };
  const response = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/work/portfolio"), { CMS_DB: db }
  );
  const result = await response.json();
  assert.equal(result.source, "seed");
  assert.equal(result.content, null);
});
