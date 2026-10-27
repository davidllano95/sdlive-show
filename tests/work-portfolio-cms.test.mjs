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


test("Work draft save and publish respect D1 cms_entries route CHECK", async () => {
  let row = null;
  const seenRoutes = [];
  const encode = (value) => Array.from(new TextEncoder().encode(JSON.stringify(value)));
  const checkRoute = (value) => {
    seenRoutes.push(value);
    if (!["root", "en", "es"].includes(value)) {
      throw new Error("D1_ERROR: CHECK constraint failed: route IN ('root', 'en', 'es')");
    }
  };
  const db = {
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...values) { this.args = values; return this; },
        async first() {
          if (sql.includes("FROM cms_entries")) {
            checkRoute(this.args[2]);
            return row;
          }
          return null;
        }
      };
    },
    async batch(statements) {
      for (const statement of statements) {
        const sql = statement.sql;
        const args = statement.args;
        if (sql.includes("INSERT INTO cms_entries")) {
          checkRoute(args[2]);
          row = {
            id: 1,
            draft_blob: encode(JSON.parse(args[3])),
            published_blob: encode(JSON.parse(args[4])),
            updated_at: "2026-10-26",
            published_at: null
          };
        } else if (sql.includes("INSERT INTO cms_revisions")) {
          checkRoute(args[2]);
        } else if (sql.includes("UPDATE cms_entries SET published_json=")) {
          assert.ok(row);
          row.published_blob = encode(JSON.parse(args[0]));
          row.published_at = "2026-10-26";
        } else {
          throw new Error("Unexpected D1 write in Work regression test");
        }
      }
      return [];
    }
  };
  const env = { CMS_DB: db };
  const verifyAdmin = async () => ({ email: "admin@example.test" });
  const saveResponse = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/admin/work/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: { items: [base] } })
    }),
    env,
    { verifyAdmin }
  );
  assert.equal(saveResponse.status, 200, await saveResponse.text());

  const unpublished = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/work/portfolio"), env
  );
  assert.equal((await unpublished.json()).source, "seed");

  const publishResponse = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/admin/work/portfolio/publish", { method: "POST" }),
    env,
    { verifyAdmin }
  );
  assert.equal(publishResponse.status, 200, await publishResponse.text());

  const publicResponse = await handleWorkPortfolioApi(
    new Request("https://sdlive.show/api/work/portfolio"), env
  );
  const published = await publicResponse.json();
  assert.deepEqual(published.content.items.map((item) => item.slug), ["the-wild-cards"]);
  assert.ok(seenRoutes.length >= 5);
  assert.ok(seenRoutes.every((route) => route === "root"));
});
