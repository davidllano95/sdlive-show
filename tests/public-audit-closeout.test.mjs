import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../showday-edge.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public-audit-closeout.css", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../public-audit-closeout.js", import.meta.url), "utf8");
const rateLimit = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("public closeout assets are injected through the shared public edge", () => {
  assert.match(edge, /public-audit-closeout\.css\?v=\$\{PUBLIC_AUDIT_RUNTIME_VERSION\}/);
  assert.match(edge, /public-audit-closeout\.js\?v=\$\{PUBLIC_AUDIT_RUNTIME_VERSION\}/);
  assert.match(edge, /\.on\("body\.seo-page"/);
  assert.match(edge, /class=\"whatsapp-float\"/);
  assert.match(edge, /href=\"https:\/\/wa\.me\/573192473948\"/);
});

test("known accessibility findings are corrected without changing global muted text", () => {
  assert.match(edge, /#contactTurnstile, #rentalTurnstile/);
  assert.match(edge, /removeAttribute\("aria-label"\)/);
  assert.match(runtime, /banner\.setAttribute\("role", "region"\)/);
  assert.match(runtime, /aria-labelledby/);
  assert.match(runtime, /aria-describedby/);
  assert.match(runtime, /\.site-footer \.footer-col h4/);
  assert.match(runtime, /document\.createElement\("p"\)/);
  assert.match(css, /--color-muted-readable:/);
  assert.match(css, /\.trusted-label/);
  assert.doesNotMatch(css, /--color-muted:\s*/);
});

test("English Wonderlust CTA is redirected to an English destination", () => {
  assert.match(edge, /Explore live and broadcast audio/);
  assert.match(edge, /setAttribute\("data-en-href", "\/en\/"\)/);
  assert.match(edge, /setAttribute\("href", "\/en\/"\)/);
});

test("testimonial long copy uses accessible progressive disclosure and can shrink again", () => {
  assert.match(css, /-webkit-line-clamp:\s*7/);
  assert.match(runtime, /Read more/);
  assert.match(runtime, /Leer más/);
  assert.match(runtime, /aria-controls/);
  assert.match(runtime, /aria-expanded/);
  assert.match(runtime, /scrollHeight > quote\.clientHeight/);
  assert.match(css, /\.testimonials--public \.testimonial-card\s*\{[^}]*min-height:\s*0;/s);
  assert.match(css, /\.testimonials--public \.testimonial-card\s*\{[^}]*height:\s*auto;/s);
});

test("testimonial expansion synchronizes quote reveal without forcing short cards to stretch", () => {
  assert.match(runtime, /function expandTestimonialGroup\(activeQuote\)/);
  assert.match(runtime, /const targetHeight = activeQuote\.scrollHeight/);
  assert.match(runtime, /const visibleHeight = Math\.min\(fullHeight, targetHeight\)/);
  assert.match(runtime, /fullHeight > targetHeight \+ TESTIMONIAL_OVERFLOW_TOLERANCE/);
  assert.match(runtime, /button\.hidden = !isActive && !hasMoreBeyondTarget/);
  assert.match(runtime, /activeTestimonialQuoteId === quote\.id[\s\S]*collapseTestimonialGroup\(button\)/);
  assert.match(runtime, /setTestimonialExpandedLayout\(true\)/);
  assert.match(runtime, /setTestimonialExpandedLayout\(false\)/);
  assert.match(css, /has-synced-testimonial-expansion \.testimonial-grid\s*\{[^}]*align-items:\s*start;/s);
  assert.match(css, /has-synced-testimonial-expansion \.testimonial-card\s*\{[^}]*align-self:\s*start;/s);
});

test("testimonial collapse preserves the reader viewport around the disclosure control", () => {
  assert.match(runtime, /function preserveViewportAfterCollapse\(anchorButton, anchorTop\)/);
  assert.match(runtime, /anchorButton\.getBoundingClientRect\(\)\.top/);
  assert.match(runtime, /window\.requestAnimationFrame/);
  assert.match(runtime, /window\.scrollBy\(0, delta\)/);
  assert.match(runtime, /collapseTestimonialGroup\(anchorButton = null\)/);
});

test("final public mobile supported-brand layouts use simple stable grids", () => {
  assert.match(css, /#misiSupportedBrands \.supported-reveal-logos--misi\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /#wonderlustSupportedBrands \.supported-reveal-logos--wonderlust\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(css, /#wonderlustSupportedBrands[\s\S]*\.supported-brand-tile:last-child:not\(\.supported-brand-tile--featured\)[\s\S]*grid-column:\s*auto/);
});

test("PA is sized like one card in a three-card desktop grid", () => {
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*width:\s*calc\(\(100% - 40px\) \/ 3\)/);
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*max-width:\s*400px/);
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*height:\s*280px\s*!important/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*height:\s*280px\s*!important/);
});

test("rental request is guarded in both browser UX and public backend edge", () => {
  assert.match(runtime, /Select at least one equipment item or service/);
  assert.match(runtime, /Selecciona al menos un equipo o servicio/);
  assert.match(rateLimit, /rentalRequestHasSelection/);
  assert.match(rateLimit, /Select at least one equipment item or service/);
  assert.match(rateLimit, /status|400/);
});

test("WhatsApp keeps safe-area spacing", () => {
  assert.match(css, /right:\s*max\(24px, env\(safe-area-inset-right\)\)/);
  assert.match(css, /bottom:\s*max\(24px, env\(safe-area-inset-bottom\)\)/);
});
