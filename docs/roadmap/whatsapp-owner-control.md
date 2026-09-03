# WhatsApp verified-owner control for Availability

Status: **reconstructed on current `main`; runtime must remain disabled until storage + Meta/Cloudflare configuration are complete and production smoke passes.**

## Goal

Allow the configured SD.Live owner WhatsApp number to control the existing Availability Core with short text commands, without creating a second Availability source of truth or exposing private owner data.

Examples already supported by the transport-neutral parser:

- `away 2h`
- `limited 30m`
- `away until 23:00`
- `back`
- `status`
- Spanish equivalents such as `ausente 2h`, `limitado 30m`, `ausente hasta 23:00`, `volver`, `estado`

## Architecture

`Meta WhatsApp Cloud API -> /api/webhooks/whatsapp -> Meta HMAC verification -> kill switch -> exact phone_number_id -> exact owner sender -> D1 message-id idempotency -> availability-owner-control -> canonical handleAvailabilityApi -> Availability Core -> deterministic Meta reply`

The deploy entry is a narrow wrapper:

`whatsapp-owner-worker.js -> admin-stabilization-worker.js`

Every route outside the WhatsApp webhook/readiness/storage-preparation endpoints falls through unchanged to the established stable worker.

## Hard boundaries

- No AI is involved.
- Availability Core remains the only Availability source of truth.
- The owner transport does not implement a second Availability write path.
- `WHATSAPP_OWNER_CONTROL_ENABLED` is a hard runtime kill switch; anything other than literal `true` keeps command execution off.
- Meta GET callback verification can work while command execution remains disabled.
- POST signature verification uses the raw request body and `X-Hub-Signature-256` HMAC SHA-256 before any payload can execute.
- Exact configured `WHATSAPP_PHONE_NUMBER_ID` is required.
- Exact normalized `WHATSAPP_OWNER_NUMBER` is required.
- Owner actor identity must be explicitly configured in `WHATSAPP_OWNER_ACTOR_EMAIL`; there is no implicit/fallback owner identity.
- Public webhook traffic performs no D1 schema migration. The WhatsApp idempotency table is created only through the Access-protected Admin preparation endpoint.
- The owner Availability adapter shields the historical Availability Core schema guards from public transport traffic; only normal canonical reads/writes reach D1.
- Meta/provider response bodies are never echoed into public errors/logs.
- No phone number, token, app secret, verify token or other secret belongs in GitHub or `wrangler.jsonc`.

## D1 idempotency

Table: `whatsapp_owner_messages`

Preparation endpoint:

`POST /api/admin/whatsapp-owner/storage-prepare`

Required body:

```json
{"confirmation":"PREPARE_WHATSAPP_OWNER_STORAGE"}
```

This endpoint is protected through the existing Admin authentication path. The runtime webhook never calls the preparation function.

Semantics:

1. first delivery claims the Meta message ID;
2. command executes at most once;
3. result text is persisted as `processed` before the outbound reply;
4. successful reply is marked `sent`;
5. if Meta reply delivery fails, a webhook retry resends the stored reply without reapplying the Availability command;
6. a concurrent duplicate while the first delivery is still in-flight fails retryably instead of executing twice.

## Admin readiness

`GET /api/admin/whatsapp-owner/readiness`

The response exposes only readiness booleans and missing binding **names**, never values.

Required runtime configuration:

- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_OWNER_NUMBER`
- `WHATSAPP_OWNER_ACTOR_EMAIL`
- `WHATSAPP_GRAPH_API_VERSION`

Activation flag:

- `WHATSAPP_OWNER_CONTROL_ENABLED=true`

Keep the flag unset/false until readiness reports storage ready and no missing runtime configuration.

## Safe rollout order

1. Merge/deploy code with `WHATSAPP_OWNER_CONTROL_ENABLED` unset/false.
2. Run authenticated storage preparation once.
3. Confirm authenticated readiness shows storage ready.
4. Complete Meta WhatsApp Cloud API onboarding and identify the exact phone-number ID/account used for SD.Live.
5. Add all secrets/configuration to Cloudflare; keep the kill switch off.
6. Configure Meta callback URL `https://sdlive.show/api/webhooks/whatsapp` and verify with the configured verify token.
7. Subscribe the relevant WhatsApp message webhook field(s) in Meta.
8. Re-check Admin readiness; require `readyForActivation:true` and no missing bindings.
9. Set `WHATSAPP_OWNER_CONTROL_ENABLED=true`.
10. Production smoke from the exact configured owner number: send `status`, then one temporary bounded command, confirm public Availability matches, then `back`/`volver` to return to AUTO.
11. Only after the production smoke passes, mark the milestone CLOSED/PASS.

## Rollback

Immediate rollback is setting `WHATSAPP_OWNER_CONTROL_ENABLED` to false/unset. Signed POST events are then acknowledged without executing commands. Existing Availability state remains governed by Availability Core and can still be controlled through Admin.

## Supersession

The old PR #191 branch is historical source material only. It must not be merged directly because it performed runtime `CREATE TABLE IF NOT EXISTS` from public webhook traffic. This reconstruction supersedes that branch while preserving its intended security and idempotency semantics.
