import test from "node:test";
import assert from "node:assert/strict";

import { isAdminPreviewRequest } from "../worker-entry.js";

test("normal Admin iframe preview remains isolated from Published SSR", () => {
  const request = new Request("https://sdlive.show/", {
    headers: {
      "Sec-Fetch-Dest": "iframe",
      Referer: "https://sdlive.show/admin/editor/"
    }
  });

  assert.equal(isAdminPreviewRequest(request), true);
});

test("automatic failsafe verification iframe is routed through the real public Home", () => {
  const request = new Request("https://sdlive.show/?failsafe_verify=1787342761000", {
    headers: {
      "Sec-Fetch-Dest": "iframe",
      Referer: "https://sdlive.show/admin/editor/"
    }
  });

  assert.equal(isAdminPreviewRequest(request), false);
});

test("failsafe bypass is narrow and does not affect unrelated Admin iframe query strings", () => {
  const request = new Request("https://sdlive.show/?preview=1", {
    headers: {
      "Sec-Fetch-Dest": "iframe",
      Referer: "https://sdlive.show/admin/editor/"
    }
  });

  assert.equal(isAdminPreviewRequest(request), true);
});
