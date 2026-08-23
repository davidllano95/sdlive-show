import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const router = readFileSync(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");
const edge = readFileSync(new URL("../showday-edge.js", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../showday-runtime.js", import.meta.url), "utf8");
const runtimeCss = readFileSync(new URL("../showday-runtime.css", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const page = readFileSync(new URL("../admin/calendar/site-schedule/index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../admin/calendar/site-schedule/site-schedule.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../admin/calendar/site-schedule/site-schedule.css", import.meta.url), "utf8");

test("Site Schedule is a separate Admin layer and does not write AppSheet fields", () => {
  assert.ok(page.includes("Website-only operations layer"));
  assert.ok(page.includes("REGISTRO and AppSheet remain unchanged"));
  assert.ok(page.includes("Show Day"));
  assert.ok(page.includes("Location"));
  assert.ok(script.includes('/api/admin/calendar/events?view=source'));
  assert.ok(script.includes("/api/admin/site-schedule/events/"));
  assert.ok(script.includes('method: "PUT"'));
  assert.ok(script.includes('method: "DELETE"'));
});

test("Calendar API is decorated with Site Schedule display blocks while source view stays available", () => {
  assert.ok(router.includes("decorateCalendarResponse"));
  assert.ok(router.includes('url.searchParams.get("view") !== "source"'));
  assert.ok(router.includes('path === "/api/admin/calendar/events"'));
});

test("Show Day is automatic, public-safe and removes the manual toggle at the edge", () => {
  assert.ok(router.includes('path === "/api/site/showday-status"'));
  assert.ok(edge.includes('on("#showdayToggle"'));
  assert.ok(edge.includes("element.remove()"));
  assert.ok(runtime.includes('const STATUS_ENDPOINT = "/api/site/showday-status"'));
  assert.ok(runtime.includes('root.classList.toggle("showday-active", active)'));
  assert.ok(runtime.includes("workLocation.textContent"));
  assert.ok(runtime.includes("sdlive-showday-status"));
  assert.equal(runtime.includes("sessionStorage"), false);
});

test("Secondary public pages receive the same Home header structure", () => {
  assert.ok(edge.includes('on(".seo-header"'));
  assert.ok(edge.includes('class="site-header" id="siteHeader"'));
  assert.ok(edge.includes('class="brand-location" id="workLocation"'));
  assert.ok(edge.includes('class="on-air-badge"'));
  assert.ok(edge.includes('class="main-nav"'));
  assert.ok(edge.includes('class="lang-toggle"'));
  assert.ok(edge.includes('class="btn btn-primary header-project-cta header-project-cta--desktop"'));
  assert.ok(edge.includes('href="/#about"'));
  assert.ok(edge.includes('href="/#work"'));
  assert.ok(edge.includes('href="/#services"'));
  assert.ok(edge.includes('href="/#international"'));
  assert.ok(edge.includes('href="/#rental"'));
  assert.ok(edge.includes('href="/theatre-sound-design-audio-post"'));
  assert.ok(edge.includes('href="/#contact"'));
  assert.ok(runtime.includes("initSharedHeaderControls"));
  assert.ok(runtime.includes('sharedHeader.classList.toggle("nav-open", open)'));
  assert.ok(runtime.includes('window.location.assign("/en/")'));
  assert.ok(runtime.includes('window.location.assign("/es-co/")'));
});

test("Show Day runtime reaches the main page and six public landing routes", () => {
  for (const route of [
    '"/"',
    '"/en/*"',
    '"/es-co/*"',
    '"/theatre-sound-design-audio-post*"',
    '"/audio-eventos-streaming-teatro-bogota*"',
    '"/alquiler-sonido-wing-midas-dl32-bogota*"'
  ]) {
    assert.ok(wrangler.includes(route), `missing worker-first route ${route}`);
  }
});

test("New Site Schedule UI reuses Admin brand tokens instead of inventing a palette", () => {
  assert.ok(styles.includes("var(--accent)"));
  assert.ok(styles.includes("rgba(var(--accent-rgb)"));
  assert.ok(styles.includes("var(--danger)"));
  assert.equal(styles.includes("#ff8a70"), false);
  assert.equal(styles.includes("255, 107, 74"), false);
  assert.ok(runtimeCss.includes("var(--showday-accent)"));
  assert.ok(runtimeCss.includes("var(--showday-accent-rgb)"));
});
