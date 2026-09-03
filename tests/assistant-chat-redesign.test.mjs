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
  assert.match(css, /\.assistant-panel__messages\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.assistant-panel__consent\s*\{[\s\S]*?order:\s*999;/);
});

test("Assistant redesign uses SD.Live lime and violet brand accents and a larger desktop panel", async () => {
  const css = await source("assistant-public-widget-chat.css");

  assert.match(css, /--assistant-lime:\s*var\(--accent, #dfff69\)/);
  assert.match(css, /--assistant-violet:\s*var\(--accent2, #88a2ff\)/);
  assert.match(css, /width:\s*min\(560px, calc\(100vw - 24px\)\)/);
  assert.match(css, /height:\s*min\(920px, calc\(100dvh - 24px\)\)/);
  assert.match(css, /\.assistant-consent__authorize\s*\{[\s\S]*?background:\s*var\(--assistant-lime\)/);
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

test("redesign asset loads last and is cache-busted independently of old Safari layout fixes", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const baseIndex = edge.indexOf("/assistant-public-widget.css?v=");
  const layoutIndex = edge.indexOf("/assistant-public-widget-layout.css?v=");
  const chatIndex = edge.indexOf("/assistant-public-widget-chat.css?v=");
  const jsIndex = edge.indexOf("/assistant-public-widget.js?v=");

  assert.ok(baseIndex >= 0);
  assert.ok(layoutIndex > baseIndex);
  assert.ok(chatIndex > layoutIndex);
  assert.ok(jsIndex > chatIndex);
  assert.match(edge, /ASSISTANT_WIDGET_VERSION = "20260903-1"/);
});
