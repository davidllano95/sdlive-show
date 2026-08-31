import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync(new URL("../showday-edge.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public-audit-closeout.css", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../public-audit-closeout.js", import.meta.url), "utf8");
const rateLimit = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("public closeout assets are injected through the shared public edge", () => {
  assert.match(edge, /PUBLIC_AUDIT_RUNTIME_VERSION = "20260831-2"/);
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

test("expanded active testimonial retains visible glow after geometry changes", () => {
  assert.match(
    css,
    /has-synced-testimonial-expansion \.testimonial-card:has\(> p\.is-expanded\)\s*\{[^}]*border-color:\s*rgba\(var\(--color-accent-rgb\), 0\.28\)[^}]*0 0 34px rgba\(var\(--color-accent-rgb\), 0\.14\)/s
  );
});

test("testimonial sheen speed is independent from testimonial height", () => {
  assert.match(
    css,
    /\.testimonials--public \.testimonial-card::after\s*\{[^}]*top:\s*0;[^}]*bottom:\s*0;[^}]*left:\s*-38%;[^}]*width:\s*30%;[^}]*transform:\s*none;/s
  );
  assert.match(
    css,
    /\.testimonial-card:hover::after,[\s\S]*\.testimonial-card:focus-within::after\s*\{[^}]*testimonial-card-sheen-stable 900ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/s
  );
  assert.match(
    css,
    /@keyframes testimonial-card-sheen-stable\s*\{[\s\S]*left:\s*-38%;[\s\S]*left:\s*108%;/s
  );
  const sheenRule = css.match(/\.testimonials--public \.testimonial-card::after\s*\{([^}]*)\}/s)?.[1] || "";
  assert.doesNotMatch(sheenRule, /skew|top:\s*-|bottom:\s*-/);
});

test("testimonial collapse preserves the reader viewport around the disclosure control", () => {
  assert.match(runtime, /function preserveViewportAfterCollapse\(anchorButton, anchorTop\)/);
  assert.match(runtime, /anchorButton\.getBoundingClientRect\(\)\.top/);
  assert.match(runtime, /window\.requestAnimationFrame/);
  assert.match(runtime, /window\.scrollBy\(0, delta\)/);
  assert.match(runtime, /collapseTestimonialGroup\(anchorButton = null\)/);
});

test("testimonial language changes preserve active expansion before global scroll restoration", () => {
  assert.match(runtime, /function refreshTestimonialsForLanguageChange\(\)/);
  assert.match(runtime, /const preservedQuoteId = activeTestimonialQuoteId/);
  assert.match(runtime, /testimonialQuoteNeedsDisclosure\(activeQuote\)/);
  assert.match(runtime, /expandTestimonialGroup\(activeQuote\)/);
  assert.match(runtime, /const langObserver = new MutationObserver\(\(\) => \{[\s\S]*refreshTestimonialsForLanguageChange\(\);[\s\S]*\}\);/);
  assert.doesNotMatch(runtime, /langObserver[\s\S]{0,220}requestAnimationFrame\(syncTestimonials\)/);
});

test("final public mobile supported-brand layouts match accepted grouping", () => {
  assert.match(
    css,
    /#misiSupportedBrands \.supported-reveal-logos--misi\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s
  );
  assert.match(
    css,
    /#misiSupportedBrands[\s\S]*\.supported-brand-tile--misi-pair\s*\{[^}]*grid-column:\s*auto/s
  );
  assert.match(
    css,
    /#wonderlustSupportedBrands \.supported-reveal-logos--wonderlust\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s
  );
  assert.match(
    css,
    /#wonderlustSupportedBrands[\s\S]*\.supported-brand-tile:last-child:nth-child\(3n \+ 1\)\s*\{[^}]*grid-column:\s*2/s
  );
});

test("touch Trusted By cards keep static luminosity without re-enabling hover motion", () => {
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\)/);
  assert.match(
    css,
    /\.trusted-wrap \.client-strip-card\s*\{[^}]*0 10px 30px rgba\(var\(--color-accent-rgb\), 0\.10\)/s
  );
  assert.match(
    css,
    /\.trusted-wrap \.client-strip-card\.is-reveal-active\s*\{[^}]*0 12px 34px rgba\(var\(--color-accent-rgb\), 0\.18\)/s
  );
});

test("PA is sized like one left-aligned card in a three-card desktop grid", () => {
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*width:\s*calc\(\(100% - 40px\) \/ 3\)/);
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*max-width:\s*400px/);
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*margin-left:\s*0/);
  assert.match(css, /@media \(min-width: 1025px\)[\s\S]*equipment-card--wide\[data-rental-item=\"pa\"\][\s\S]*margin-right:\s*auto/);
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
