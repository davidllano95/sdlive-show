import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { assistantPublicEnabled } from "../public-form-rate-limit.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Assistant public exposure defaults to disabled", () => {
  assert.equal(assistantPublicEnabled({}), false);
  assert.equal(assistantPublicEnabled({ ASSISTANT_PUBLIC_ENABLED: "false" }), false);
  assert.equal(assistantPublicEnabled({ ASSISTANT_PUBLIC_ENABLED: "TRUE" }), true);
});

test("disabled Assistant is rejected before the public handler can execute", async () => {
  const worker = await source("public-form-rate-limit.js");
  const route = worker.slice(
    worker.indexOf('if (path === "/api/assistant")'),
    worker.indexOf('if (path === "/api/availability")')
  );

  assert.match(route, /if \(!assistantPublicEnabled\(env\)\)/);
  assert.match(route, /error:\s*"assistant_unavailable"/);
  assert.match(route, /},\s*404\)/);
  assert.ok(
    route.indexOf("assistantPublicEnabled(env)") < route.indexOf("handleAssistantApi(request, env)")
  );
});

test("launch switch is server-side and not committed as an enabled Wrangler var", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  assert.equal(wrangler.vars?.ASSISTANT_PUBLIC_ENABLED, undefined);
});
