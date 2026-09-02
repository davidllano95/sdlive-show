import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_PUBLIC_REQUEST_POLICY,
  validateAssistantPublicRequest
} from "../assistant-public-request-security.js";

function request(turnstileToken) {
  return new Request("https://sdlive.show/api/assistant", {
    method: "POST",
    headers: {
      Origin: "https://sdlive.show",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Hello",
      turnstileToken
    })
  });
}

test("Assistant public boundary matches Turnstile 2048-character response-token limit", async () => {
  assert.equal(ASSISTANT_PUBLIC_REQUEST_POLICY.maxTurnstileTokenChars, 2048);

  const acceptedBoundary = await validateAssistantPublicRequest(request("t".repeat(2048)));
  assert.equal(acceptedBoundary.ok, true);

  const rejectedOverBoundary = await validateAssistantPublicRequest(request("t".repeat(2049)));
  assert.deepEqual(rejectedOverBoundary, {
    ok: false,
    status: 400,
    error: "turnstile_token_too_long"
  });
});
