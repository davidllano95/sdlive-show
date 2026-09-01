import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantNotificationConfigFromEnv,
  buildAssistantNotificationFromEnv,
  buildAssistantResendRequest,
  validateAssistantNotificationConfig
} from "../assistant-notification-contract.js";

test("reads Assistant notification configuration without hard-coded addresses", () => {
  const config = assistantNotificationConfigFromEnv({
    RESEND_API_KEY: "re_test",
    ASSISTANT_LEAD_NOTIFICATION_FROM: "SD.Live Assistant <assistant@sdlive.show>",
    ASSISTANT_LEAD_NOTIFICATION_TO: "leads@sdlive.show"
  });

  assert.deepEqual(config, {
    resendApiKey: "re_test",
    from: "SD.Live Assistant <assistant@sdlive.show>",
    to: "leads@sdlive.show"
  });
});

test("reports every missing transport setting", () => {
  assert.deepEqual(validateAssistantNotificationConfig({}), {
    ok: false,
    missing: [
      "RESEND_API_KEY",
      "ASSISTANT_LEAD_NOTIFICATION_FROM",
      "ASSISTANT_LEAD_NOTIFICATION_TO"
    ]
  });
});

test("builds the same Resend transport shape used by existing Contact and Rental", () => {
  const request = buildAssistantResendRequest({
    apiKey: "re_test",
    from: "SD.Live <hello@sdlive.show>",
    to: "hello@sdlive.show",
    subject: "[SD.Live Lead] Live — Cliente QA",
    text: "New lead",
    replyTo: "client@example.com",
    leadId: 42
  });

  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer re_test");
  assert.equal(request.init.headers["Content-Type"], "application/json");
  assert.equal(request.init.headers["Idempotency-Key"], "assistant-lead-42");

  const body = JSON.parse(request.init.body);
  assert.deepEqual(body, {
    from: "SD.Live <hello@sdlive.show>",
    to: ["hello@sdlive.show"],
    subject: "[SD.Live Lead] Live — Cliente QA",
    text: "New lead",
    reply_to: "client@example.com"
  });
});

test("reply-to is optional for non-email leads", () => {
  const request = buildAssistantResendRequest({
    apiKey: "re_test",
    from: "SD.Live <hello@sdlive.show>",
    to: ["hello@sdlive.show"],
    subject: "Lead",
    text: "WhatsApp lead",
    leadId: 7
  });

  const body = JSON.parse(request.init.body);
  assert.equal(Object.hasOwn(body, "reply_to"), false);
});

test("does not perform network I/O and returns request data only", () => {
  const request = buildAssistantNotificationFromEnv({
    RESEND_API_KEY: "re_test",
    ASSISTANT_LEAD_NOTIFICATION_FROM: "SD.Live <hello@sdlive.show>",
    ASSISTANT_LEAD_NOTIFICATION_TO: "hello@sdlive.show"
  }, {
    subject: "Lead",
    text: "Payload",
    leadId: 9
  });

  assert.equal(typeof request, "object");
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(typeof request.init.body, "string");
});

test("fails closed when transport configuration is not explicit", () => {
  assert.throws(
    () => buildAssistantNotificationFromEnv({ RESEND_API_KEY: "re_test" }, {
      subject: "Lead",
      text: "Payload",
      leadId: 9
    }),
    (error) => {
      assert.equal(error.code, "ASSISTANT_NOTIFICATION_NOT_CONFIGURED");
      assert.deepEqual(error.missing, [
        "ASSISTANT_LEAD_NOTIFICATION_FROM",
        "ASSISTANT_LEAD_NOTIFICATION_TO"
      ]);
      return true;
    }
  );
});

test("requires a stable positive lead id for Resend idempotency", () => {
  assert.throws(
    () => buildAssistantResendRequest({
      apiKey: "re_test",
      from: "SD.Live <hello@sdlive.show>",
      to: "hello@sdlive.show",
      subject: "Lead",
      text: "Payload",
      leadId: 0
    }),
    /valid leadId/
  );
});
