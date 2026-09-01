# WhatsApp Owner Control — Availability

**Status:** implementation branch prepared; NOT production-live until PR merge + Meta onboarding + smoke.  
**Scope:** verified-owner commands only. This is not the public SD.Live Assistant and does not use AI.

## Goal

Allow the owner to change or inspect Availability from WhatsApp with deterministic commands such as:

- `away 2h`
- `limited 30m`
- `away until 23:00`
- `ausente hasta 23:00`
- `back` / `volver`
- `status` / `estado`

The existing `availability-owner-command.js` parser remains transport-neutral. WhatsApp only authenticates, transports and confirms the command.

## Runtime flow

```text
Owner WhatsApp
  → Meta WhatsApp Cloud API
  → POST /api/webhooks/whatsapp
  → stable admin-stabilization-worker.js entry
  → verify X-Hub-Signature-256 with Meta app secret
  → verify exact configured phone_number_id
  → verify sender == configured owner number
  → idempotency record by WhatsApp message id
  → existing Availability owner parser
  → existing /api/admin/availability contract internally
  → Availability Core D1
  → confirmation reply through Meta Cloud API
```

`wrangler.jsonc` deliberately keeps `admin-stabilization-worker.js` as the deploy entry. The webhook is mounted narrowly inside that already-proven top-level Worker instead of introducing another deploy wrapper.

No second Availability source of truth is introduced.

## Security invariants

- The webhook URL is internet-reachable because Meta must call it, but commands are not public.
- POST bodies are rejected unless the Meta HMAC signature is valid.
- Signed message events are accepted only for the exact configured `phone_number_id`.
- Signed messages are ignored unless the sender exactly matches the configured owner number after digits-only normalization.
- The owner number is server-side configuration only and must never be written into public HTML, JavaScript, schema or public Availability output.
- Meta access token, app secret and webhook verification token are secrets and must not be committed to GitHub.
- The WhatsApp message id is persisted for idempotency so a retry after an outbound reply failure does not apply the Availability command twice.
- A duplicate delivery that arrives while the first request is still processing fails safely and asks Meta to retry rather than executing the same command concurrently.
- Public Contact, Rental and WhatsApp CTA behavior remain independent of this owner-control transport.
- Existing Admin stabilization and Finance transport guardrails remain intact; the deploy entry is unchanged.

## Current Meta baseline — verified 2026-09-01

- Current Graph API release: `v26.0` (released 2026-07-29).
- Initial production value for `WHATSAPP_GRAPH_API_VERSION`: `v26.0`.
- Keep the version configurable; do not hard-code it into request logic.
- Core WhatsApp Cloud API permissions documented by Meta:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
- `business_management` is only needed for portfolio-level operations beyond the normal WhatsApp Cloud API flow.
- If the selected number must continue being used in the WhatsApp Business App, use Meta's supported coexistence/onboarding path rather than treating the number as a normal dedicated Cloud API registration. Verify eligibility in Meta at onboarding time because coexistence requirements can change.

Before future onboarding work, re-check Meta's current Graph API version and coexistence requirements rather than assuming this 2026-09-01 snapshot is still current.

## Required Cloudflare configuration

Configure these only when the PR is ready to activate:

Secrets:

```text
WHATSAPP_APP_SECRET
WHATSAPP_ACCESS_TOKEN
WHATSAPP_WEBHOOK_VERIFY_TOKEN
WHATSAPP_OWNER_NUMBER
```

Server-side vars/secrets:

```text
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_GRAPH_API_VERSION
WHATSAPP_OWNER_ACTOR_EMAIL
```

For the current 2026-09-01 baseline:

```text
WHATSAPP_GRAPH_API_VERSION=v26.0
```

`WHATSAPP_GRAPH_API_VERSION` must always be an explicitly selected currently-supported Meta Graph API version in `vN.N` form.

`WHATSAPP_OWNER_NUMBER` should contain the full international number; runtime comparison normalizes it to digits only.

## Meta onboarding steps — manual, one at a time

These steps require the owner in Meta Business / WhatsApp Manager and are intentionally not automated from GitHub:

1. Confirm or create the Meta Business Portfolio and WhatsApp Business Account to be used by SD.Live.
2. Decide whether the selected number is:
   - a dedicated Cloud API number; or
   - an existing WhatsApp Business App number that must stay usable in the app through coexistence.
3. Complete the applicable Meta onboarding flow and obtain the WhatsApp `phone_number_id`.
4. Create/configure a server-side access token with the minimum WhatsApp permissions needed to send replies (`whatsapp_business_messaging` and, where required by the setup flow, `whatsapp_business_management`).
5. Set the Cloudflare secrets/vars listed above.
6. Register webhook callback:

   ```text
   https://sdlive.show/api/webhooks/whatsapp
   ```

7. Use the same `WHATSAPP_WEBHOOK_VERIFY_TOKEN` value in Meta webhook verification.
8. Subscribe the WhatsApp Business Account to message webhook events.
9. Perform one production smoke from the configured owner number.

## Production smoke

After merge, deployment and Meta configuration:

1. Send `status` from the authorized owner WhatsApp.
2. Confirm a deterministic Availability status reply arrives.
3. Send a bounded command such as `away 15m`.
4. Confirm the reply reports AWAY with the expected expiry.
5. Confirm `/admin/` reflects the same Temporary Status.
6. Send `back` and confirm Temporary Status returns to Auto.

Use one manual action at a time during the actual smoke.

## Not part of this slice

- public AI Assistant conversations;
- customer WhatsApp automation;
- CRM integration;
- pricing negotiation;
- Rental availability decisions;
- Finance writes;
- owner phone exposure on public surfaces.
