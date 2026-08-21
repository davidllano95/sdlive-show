import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  TESTIMONIALS_DEFAULT_CONTENT,
  cloneTestimonialsDefault,
  validateTestimonialsDraft
} from "../testimonials-content.js";
import { handleTestimonialsApi } from "../testimonials-api.js";
import {
  normalizeTestimonialScale,
  readPublishedTestimonials,
  renderTestimonialsInnerHtml,
  resolveTestimonialsMediaSource
} from "../testimonials-edge.js";
import { normalizeFolder } from "../media-api.js";

function blobBytes(value) {
  return Array.from(new TextEncoder().encode(JSON.stringify(value)));
}

function d1SingleRow(row, onSql = () => {}) {
  return {
    prepare(sql) {
      onSql(sql);
      return {
        bind(...values) {
          return {
            async first() {
              assert.deepEqual(values, ["testimonials", "all", "root"]);
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

test("Testimonials static seed validates and clones independently", () => {
  assert.doesNotThrow(() => validateTestimonialsDraft(TESTIMONIALS_DEFAULT_CONTENT));
  const copy = cloneTestimonialsDefault();
  copy.items[0].name = "Changed";
  assert.equal(TESTIMONIALS_DEFAULT_CONTENT.items[0].name, "Manuel Matamoros");
});

test("Testimonials validation rejects duplicate ids, remote media and all-hidden content", () => {
  const duplicate = cloneTestimonialsDefault();
  duplicate.items.push(structuredClone(duplicate.items[0]));
  assert.throws(() => validateTestimonialsDraft(duplicate), /must be unique/);

  const remote = cloneTestimonialsDefault();
  remote.items[0].logo.src = "https://example.com/logo.png";
  assert.throws(() => validateTestimonialsDraft(remote), /first-party asset/);

  const hidden = cloneTestimonialsDefault();
  hidden.items[0].visible = false;
  assert.throws(() => validateTestimonialsDraft(hidden), /At least one testimonial/);
});

test("Testimonials media helpers preserve R2 logical references and safe scale", () => {
  assert.equal(
    resolveTestimonialsMediaSource("assets/media/cms/testimonials/logo.webp"),
    "https://media.sdlive.show/cms/testimonials/logo.webp"
  );
  assert.equal(
    resolveTestimonialsMediaSource("assets/clients/wlive.png"),
    "assets/clients/wlive.png"
  );
  assert.equal(normalizeTestimonialScale("1.25"), 1.25);
  assert.equal(normalizeTestimonialScale(99), 1.8);
  assert.equal(normalizeFolder("testimonials"), "testimonials");
});

test("Testimonials public renderer outputs localized visible cards and CMS media metadata", () => {
  const content = cloneTestimonialsDefault();
  content.items[0].logo.src = "assets/media/cms/testimonials/wlive.webp";
  content.items[0].logo.scale = 1.2;
  content.items.push({
    id: "hidden-example",
    name: "Hidden Example",
    role: { en: "Hidden", es: "Oculto" },
    quote: { en: "Should not render", es: "No debe renderizar" },
    visible: false,
    featured: false,
    logo: null
  });

  const html = renderTestimonialsInnerHtml(content, "es");
  assert.match(html, /Testimonios/);
  assert.match(html, /Opiniones de clientes y aliados de producción/);
  assert.match(html, /Manuel Matamoros/);
  assert.doesNotMatch(html, /Hidden Example/);
  assert.match(html, /testimonial-card--featured/);
  assert.match(html, /data-testimonial-id="manuel-matamoros"/);
  assert.match(html, /https:\/\/media\.sdlive\.show\/cms\/testimonials\/wlive\.webp/);
  assert.match(html, /data-cms-media-source="assets\/media\/cms\/testimonials\/wlive\.webp"/);
  assert.match(html, /style="scale:1\.2"/);
});

test("Published Testimonials reader uses published_json only", async () => {
  let observedSql = "";
  const content = cloneTestimonialsDefault();
  content.title.en = "Published Testimonials";

  const env = {
    CMS_DB: d1SingleRow(
      {
        published_blob: blobBytes(content),
        published_at: "2026-08-20 23:30:00"
      },
      (sql) => {
        observedSql = sql;
      }
    )
  };

  const result = await readPublishedTestimonials(env);
  assert.equal(result.content.title.en, "Published Testimonials");
  assert.equal(result.publishedAt, "2026-08-20 23:30:00");
  assert.match(observedSql, /published_json/);
  assert.doesNotMatch(observedSql, /draft_json/);
});

test("Published Testimonials reader fails closed for invalid CMS data", async () => {
  const invalid = cloneTestimonialsDefault();
  invalid.items = [];

  await assert.rejects(
    readPublishedTestimonials({
      CMS_DB: d1SingleRow({
        published_blob: blobBytes(invalid),
        published_at: "2026-08-20 23:30:00"
      })
    }),
    /items must contain/
  );
});

test("Testimonials admin API requires existing Access verifier", async () => {
  const response = await handleTestimonialsApi(
    new Request("https://sdlive.show/api/admin/content/testimonials"),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(response.status, 403);
});

test("Testimonials public API falls back to the static seed when no D1 row exists", async () => {
  const response = await handleTestimonialsApi(
    new Request("https://sdlive.show/api/content/testimonials"),
    { CMS_DB: d1SingleRow(null) }
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.source, "static-default");
  assert.equal(payload.content.items[0].name, "Manuel Matamoros");
});

test("Worker router binds Testimonials Published only on the public Home", async () => {
  const source = await readFile(new URL("../worker-router.js", import.meta.url), "utf8");

  assert.match(source, /handleTestimonialsApi/);
  assert.match(source, /readPublishedTestimonials/);
  assert.match(source, /renderTestimonialsInnerHtml/);
  assert.match(source, /api\/content\/testimonials/);
  assert.match(source, /\.testimonials--public#testimonials/);
  assert.match(source, /X-SDLive-Testimonials-Render/);
  assert.match(source, /isAdminPreviewRequest\(request\)/);
});

test("Testimonials editor owns Draft, Publish, R2 upload, visibility and exact preview selection", async () => {
  const editor = await readFile(
    new URL("../admin/editor/testimonials-editor.js", import.meta.url),
    "utf8"
  );
  const shell = await readFile(
    new URL("../admin/editor/admin-shell.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(editor));
  assert.match(editor, /api\/admin\/content\/testimonials/);
  assert.match(editor, /api\/admin\/content\/testimonials\/publish/);
  assert.match(editor, /form\.set\("folder", "testimonials"\)/);
  assert.match(editor, /assets\/media\//);
  assert.match(editor, /Visible on public Home/);
  assert.match(editor, /data-testimonial-id/);
  assert.match(editor, /stopImmediatePropagation/);
  assert.match(editor, /The public site has not changed yet/);
  assert.match(shell, /testimonials-editor\.js/);
});
