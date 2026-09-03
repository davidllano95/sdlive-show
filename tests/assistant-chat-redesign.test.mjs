import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Assistant uses a three-zone messaging shell with consent inside the conversation scroll", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const css = await source("assistant-public-widget-chat.css");

  assert.match(edge, /Project guidance for creative and technical audio\./);
  assert.match(
    edge,
    /assistant-panel__messages[\s\S]*assistant-message--assistant[\s\S]*assistant-panel__consent[\s\S]*<\/div>[\s\S]*<\/div>[\s\S]*<form class="assistant-panel__composer"/
  );
  assert.match(edge, /assistant-panel__composer-main/);
  assert.match(edge, /assistant-panel__footer[\s\S]*hello@sdlive\.show[\s\S]*WhatsApp/);
  assert.match(css, /grid-template-rows:\s*max-content minmax\(0, 1fr\) max-content;/);
  assert.match(css, /\.assistant-panel__messages\s*\{[\s\S]*?height:\s*100%;[\s\S]*?justify-content:\s*flex-start;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.assistant-panel__consent\s*\{[\s\S]*?order:\s*999;/);
});

test("Assistant consumes the canonical SD.Live design tokens instead of legacy lime/blue colors", async () => {
  const css = await source("assistant-public-widget-chat.css");
  const siteCss = await source("styles.css");

  assert.match(siteCss, /--normal-accent:\s*#a089e5;/);
  assert.match(siteCss, /--color-accent-secondary:\s*#472eb4;/);
  assert.match(css, /--assistant-accent:\s*var\(--color-accent\)/);
  assert.match(css, /--assistant-accent-rgb:\s*var\(--color-accent-rgb\)/);
  assert.match(css, /--assistant-accent-secondary:\s*var\(--color-accent-secondary\)/);
  assert.match(css, /--assistant-accent-secondary-rgb:\s*var\(--color-accent-secondary-rgb\)/);
  assert.doesNotMatch(css, /#dfff69|#88a2ff|--assistant-lime|--assistant-violet/i);
});

test("Assistant explicitly resets global section padding and uses a taller messaging proportion", async () => {
  const css = await source("assistant-public-widget-chat.css");

  assert.match(css, /\.assistant-panel\s*\{[\s\S]*?width:\s*min\(500px, calc\(100vw - 24px\)\);/);
  assert.match(css, /\.assistant-panel\s*\{[\s\S]*?height:\s*calc\(100dvh - 24px\);/);
  assert.match(css, /\.assistant-panel\s*\{[\s\S]*?padding:\s*0;/);
});

test("primary Assistant actions follow the site's restrained accent-button treatment", async () => {
  const css = await source("assistant-public-widget-chat.css");

  assert.match(css, /\.assistant-consent__authorize\s*\{[\s\S]*?background:\s*rgba\(var\(--assistant-accent-rgb\), 0\.12\);[\s\S]*?color:\s*var\(--color-text\);/);
  assert.match(css, /\.assistant-panel__send\s*\{[\s\S]*?background:\s*rgba\(var\(--assistant-accent-rgb\), 0\.14\);[\s\S]*?color:\s*var\(--color-text\);/);
});

test("composer is anchored as the final panel row and keeps security unobtrusive", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const css = await source("assistant-public-widget-chat.css");
  const js = await source("assistant-public-widget.js");

  assert.match(edge, /<form class="assistant-panel__composer"[\s\S]*assistant-panel__composer-main[\s\S]*sdliveAssistantInput[\s\S]*sdliveAssistantSend/);
  assert.match(css, /\.assistant-panel__composer\s*\{[\s\S]*?border-top:/);
  assert.match(css, /\.assistant-turnstile:empty\s*\{\s*display:\s*none;/);
  assert.match(js, /appearance:\s*"interaction-only"/);
});

test("redesign asset loads last and is cache-busted after brand/layout correction", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const baseIndex = edge.indexOf("/assistant-public-widget.css?v=");
  const layoutIndex = edge.indexOf("/assistant-public-widget-layout.css?v=");
  const chatIndex = edge.indexOf("/assistant-public-widget-chat.css?v=");
  const jsIndex = edge.indexOf("/assistant-public-widget.js?v=");

  assert.ok(baseIndex >= 0);
  assert.ok(layoutIndex > baseIndex);
  assert.ok(chatIndex > layoutIndex);
  assert.ok(jsIndex > chatIndex);
  assert.match(edge, /ASSISTANT_WIDGET_VERSION = "20260903-2"/);
});
