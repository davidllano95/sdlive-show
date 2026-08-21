import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  cloneTrustedDefault,
  validateTrustedDraft
} from "../trusted-content.js";

test("Trusted media controls parse and use the authenticated R2 upload API", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-media-controls.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /\/api\/admin\/media\/upload/);
  assert.match(source, /assets\/media\//);
  assert.match(source, /image\/png/);
  assert.match(source, /image\/jpeg/);
  assert.match(source, /image\/webp/);
  assert.match(source, /MAX_LOGO_BYTES/);
});

test("Trusted media controls persist visual scale through the existing draft model", () => {
  const draft = cloneTrustedDefault();
  draft.clients[0].logo.src =
    "assets/media/cms/clients/example-logo.webp";
  draft.clients[0].logo.scale = 1.25;

  const serialized = validateTrustedDraft(draft);
  const saved = JSON.parse(serialized);

  assert.equal(
    saved.clients[0].logo.src,
    "assets/media/cms/clients/example-logo.webp"
  );
  assert.equal(saved.clients[0].logo.scale, 1.25);
});

test("Trusted media scale is applied without generating derivative files", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-media-controls.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /\.style\.scale/);
  assert.match(source, /\.scale/);
  assert.doesNotMatch(source, /resize\/upload|derivative|canvas\.toBlob/);
});
