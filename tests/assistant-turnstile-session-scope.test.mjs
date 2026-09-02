import test from "node:test";
import assert from "node:assert/strict";

import { validateAssistantPublicRequest } from "../assistant-public-request-security.js";
import { ASSISTANT_PRIVACY_POLICY_VERSION } from "../assistant-consent-contract.js";

const SESSION_TOKEN = `ast1.${"A".repeat(16)}.${"B".repeat(64)}`;

function request(body) {
  return new Request("https://sdlive.show/api/assistant", {
    method: "POST",
    headers: {
      Origin: "https://sdlive.show",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

test("new Assistant session still requires Turnstile", async () => {
  const result = await validateAssistantPublicRequest(request({ message: "Hello" }));
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "turnstile_required"
  });
});

test("sealed-session message no longer requires a repeat Turnstile token at the browser boundary", async () => {
  const result = await validateAssistantPublicRequest(request({
    sessionToken: SESSION_TOKEN,
    message: "Second turn"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.operation, "message");
  assert.equal(result.value.sessionToken, SESSION_TOKEN);
  assert.equal(result.value.turnstileToken, null);
  assert.equal(result.security.turnstileRequiredForNewSession, false);
  assert.equal(result.security.sessionTokenRequiresServerAuthentication, true);
});

test("explicit consent can use the authenticated sealed session without another Turnstile challenge", async () => {
  const result = await validateAssistantPublicRequest(request({
    sessionToken: SESSION_TOKEN,
    consentAction: "authorize",
    privacyPolicyVersion: ASSISTANT_PRIVACY_POLICY_VERSION
  }));

  assert.equal(result.ok, true);
  assert.equal(result.operation, "consent");
  assert.equal(result.value.turnstileToken, null);
  assert.equal(result.security.consentIsExplicitProductAction, true);
});
