import test from "node:test";
import assert from "node:assert/strict";

import {
  TRUSTED_DEFAULT_CONTENT,
  cloneTrustedDefault,
  validateTrustedDraft
} from "../trusted-content.js";
import { handleTrustedApi } from "../trusted-api.js";

test("Trusted By default content validates and preserves WLive", () => {
  const serialized = validateTrustedDraft(
    cloneTrustedDefault()
  );

  assert.ok(serialized.length > 0);
  assert.ok(
    TRUSTED_DEFAULT_CONTENT.clients.some(
      (client) => client.id === "wlive"
    )
  );
});

test("Trusted By validator rejects duplicate client ids", () => {
  const draft = cloneTrustedDefault();
  draft.clients[1].id = draft.clients[0].id;

  assert.throws(
    () => validateTrustedDraft(draft),
    /must be unique/
  );
});

test("Trusted By validator rejects unsafe asset paths", () => {
  const draft = cloneTrustedDefault();
  draft.clients[0].logo.src = "javascript:alert(1)";

  assert.throws(
    () => validateTrustedDraft(draft),
    /internal assets\/ path/
  );
});

test("Trusted By public API returns static default when no CMS row exists", async () => {
  const env = {
    CMS_DB: {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return null;
              }
            };
          }
        };
      }
    }
  };

  const response = await handleTrustedApi(
    new Request("https://sdlive.show/api/content/trusted"),
    env
  );

  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.source, "static-default");
  assert.equal(data.content.title.en, "Trusted by");
  assert.ok(
    data.content.clients.some(
      (client) => client.id === "wlive"
    )
  );
});

test("Trusted By admin API requires the existing Access verifier", async () => {
  const env = {
    CMS_DB: {
      prepare() {
        throw new Error("D1 should not be reached before auth");
      }
    }
  };

  const response = await handleTrustedApi(
    new Request("https://sdlive.show/api/admin/content/trusted"),
    env
  );

  assert.equal(response.status, 403);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.equal(data.error, "Unauthorized");
});
