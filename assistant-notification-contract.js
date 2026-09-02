const RESEND_ENDPOINT = "https://api.resend.com/emails";

function cleanString(value, maxLength = 4000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function cleanAddress(value, field) {
  const text = cleanString(value, 320);
  if (!text) throw new Error(`${field} is required`);
  return text;
}

function normalizedRecipients(value) {
  const list = Array.isArray(value) ? value : [value];
  const recipients = list
    .map((entry) => cleanString(entry, 320))
    .filter(Boolean)
    .slice(0, 10);

  if (!recipients.length) {
    throw new Error("Assistant notification recipient is required");
  }

  return recipients;
}

export function assistantNotificationConfigFromEnv(env) {
  return {
    resendApiKey: cleanString(env?.RESEND_API_KEY, 1000) || null,
    from: cleanString(env?.ASSISTANT_LEAD_NOTIFICATION_FROM, 320) || null,
    to: cleanString(env?.ASSISTANT_LEAD_NOTIFICATION_TO, 320) || null
  };
}

export function validateAssistantNotificationConfig(config) {
  const source = config && typeof config === "object" ? config : {};
  const missing = [];

  if (!cleanString(source.resendApiKey, 1000)) missing.push("RESEND_API_KEY");
  if (!cleanString(source.from, 320)) missing.push("ASSISTANT_LEAD_NOTIFICATION_FROM");
  if (!cleanString(source.to, 320)) missing.push("ASSISTANT_LEAD_NOTIFICATION_TO");

  return {
    ok: missing.length === 0,
    missing
  };
}

export function buildAssistantResendRequest({
  apiKey,
  from,
  to,
  subject,
  text,
  replyTo,
  leadId
}) {
  const numericLeadId = Number(leadId);
  if (!Number.isInteger(numericLeadId) || numericLeadId < 1) {
    throw new Error("Assistant notification requires a valid leadId");
  }

  const key = cleanString(apiKey, 1000);
  if (!key) throw new Error("RESEND_API_KEY is required");

  const sender = cleanAddress(from, "Assistant notification sender");
  const recipients = normalizedRecipients(to);
  const safeSubject = cleanString(subject, 500);
  const safeText = cleanString(text, 20000);
  const safeReplyTo = cleanString(replyTo, 320);

  if (!safeSubject) throw new Error("Assistant notification subject is required");
  if (!safeText) throw new Error("Assistant notification text is required");

  return {
    url: RESEND_ENDPOINT,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `assistant-lead-${numericLeadId}`
      },
      body: JSON.stringify({
        from: sender,
        to: recipients,
        subject: safeSubject,
        text: safeText,
        ...(safeReplyTo ? { reply_to: safeReplyTo } : {})
      })
    }
  };
}

export function buildAssistantNotificationFromEnv(env, payload) {
  const config = assistantNotificationConfigFromEnv(env);
  const validation = validateAssistantNotificationConfig(config);

  if (!validation.ok) {
    const error = new Error(
      `Assistant notification configuration is incomplete: ${validation.missing.join(", ")}`
    );
    error.code = "ASSISTANT_NOTIFICATION_NOT_CONFIGURED";
    error.missing = validation.missing;
    throw error;
  }

  return buildAssistantResendRequest({
    apiKey: config.resendApiKey,
    from: config.from,
    to: config.to,
    ...payload
  });
}
