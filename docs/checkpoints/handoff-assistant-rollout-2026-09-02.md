# SD.Live Assistant rollout checkpoint — 2026-09-02

## Authority

This checkpoint records the verified rollout state after Assistant storage preparation, final backend integration and the first production runtime-readiness smoke on 2026-09-02 America/Bogota.

Source precedence:

1. current GitHub `main` + verified production behavior;
2. current schema/config;
3. latest checkpoint;
4. `PROJECT_STATUS.md`;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older docs.

`UNMERGED != PRODUCTION` and `CI PASS != PRODUCTION SMOKE PASS`.

## Verified main

Current runtime `main`:

`259b68b2d94b5fca7dcfe13bec79ace40792fff8`

Squash-merged PR #225: **Integrate gated Assistant backend on prepared storage**.

Verification:

- PR CI PASS;
- post-merge `main` Tests #620 PASS;
- production Admin readiness endpoint live;
- public Assistant still disabled.

## Availability

Availability Core v1 remains CLOSED/PASS. Do not reopen unless a regression appears.

## Lead Core

Lead workflow/status history remains CLOSED/PASS.

Canonical statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Lead sources relevant to Assistant:

- `contact`
- `rental`
- `assistant`

## Assistant storage gate — CLOSED/PASS

The initial production preflight exposed a blocked legacy `leads` CHECK/email schema, Privacy without `assistant`, and missing idempotency storage.

The rollout resolved these safely in stages:

1. exact physical Leads migration preserving IDs/data, legacy `project`, statuses, child rows and indexes;
2. production post-migration verification: no FK violations, no stale migration objects;
3. Privacy migration preserving existing consent rows and allowing `assistant`;
4. creation of canonical `assistant_effect_reservations`;
5. final normal production preflight: `readyForAssistantLeadCapture:true`.

Current storage contract:

- `leads.canInsertAssistantLead:true`
- `legacyEmailRequired:false`
- `supportsNonEmailContact:true`
- `privacyConsents.canRecordAssistantConsent:true`
- `assistantSourceAllowed:true`
- `idempotency.ready:true`

Relevant final PRs:

- #223 — exact confirmed Leads migration endpoint — merged and production PASS.
- #224 — final supported Privacy + idempotency preparation — merged and production PASS.

Old #216: CLOSED WITHOUT MERGE / superseded by #224.

## Assistant backend — PR #225

Final backend was reconstructed on the exact post-storage `main` instead of merging the old divergent #213 branch.

Included:

- approved EN/ES knowledge and system policy;
- strict structured model output;
- deterministic Availability/Rental boundaries;
- sealed stateless session;
- explicit consent;
- Turnstile boundary;
- dedicated rate limit;
- idempotent Lead capture;
- deterministic Resend handoff;
- OpenAI Responses API provider boundary;
- orchestrator-owned tools/effects;
- public `POST /api/assistant` behind kill switch;
- Admin-only `GET /api/admin/assistant/readiness`.

Public kill switch:

`ASSISTANT_PUBLIC_ENABLED`

It remains OFF unless exactly `true`.

Provider invariants:

- OpenAI Responses API;
- Structured Outputs / strict JSON schema;
- `store:false`;
- no `previous_response_id`;
- no provider-managed conversation state;
- no arbitrary built-in model tools.

Old #213: CLOSED WITHOUT MERGE / superseded by #225.

## CI issue encountered and resolution

Initial #225 CI had 718/720 tests passing. The only two failures came from `assistant-storage-preflight-mount.test.mjs`, which still asserted the earlier preflight-only phase must contain no public Assistant runtime and no `ASSISTANT_RATE_LIMITER`.

Those expectations were obsolete once #225 intentionally integrated the final gated backend. The runtime code was not weakened. The stale tests were updated to verify the current invariants instead:

- `/api/assistant` is present;
- kill switch is checked before handler execution;
- dedicated `ASSISTANT_RATE_LIMITER` is present at 30/min;
- `ASSISTANT_PUBLIC_ENABLED` is not committed in `wrangler`;
- model configuration is not hard-coded in `wrangler`;
- Admin storage preflight remains protected and before legacy public pipeline.

After this change:

- PR Tests #619 PASS;
- #225 squash merged;
- `main` Tests #620 PASS.

## Production runtime readiness — current gate

Authenticated production GET:

`/api/admin/assistant/readiness`

returned:

- `ok:true`
- `readOnly:true`
- `readyForRuntimeConfiguration:false`
- `readyForPublicEnablement:false`
- `publicExposure.enabled:false`
- `publicExposure.defaultsToDisabled:true`
- `rateLimit.ready:true`
- `d1Binding.ready:true`
- `notification.ready:true`
- Turnstile server secret configured: true

Exact missing bindings:

- `ASSISTANT_SESSION_KEY`
- `ASSISTANT_TURNSTILE_SITE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_MODEL`

`ASSISTANT_SESSION_KEY` must decode from Base64URL to exactly 32 bytes.

Do not enable the public feature while any runtime dependency is missing/invalid.

## PR #215 — public widget

Status:

- OPEN
- DRAFT
- UNMERGED
- NOT PRODUCTION
- built on older #213 lineage

Do not merge directly.

Required order:

1. configure the four missing runtime bindings with public flag OFF;
2. rerun authenticated runtime readiness;
3. require runtime dependencies all ready;
4. reverify/rebase #215 onto current `main`;
5. CI PASS;
6. merge widget while flag remains OFF;
7. explicitly enable public flag;
8. final E2E one manual action at a time.

## PR #218 — temporary validation

CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY. Do not reopen or merge.

## PR #191 — separate Availability owner transport

OPEN / separate workstream. Do not touch unless explicitly reprioritized.

## Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries:

- no impersonation;
- no invented/negotiated prices;
- no AI-owned Availability;
- no second Rental pricing source;
- no Finance writes;
- explicit product-owned consent only;
- no full transcript persistence;
- no public owner phone/secrets;
- no public schema migration;
- no provider-owned conversation source of truth.

## Exact continuation

**Current Active Gate: runtime configuration with public flag OFF.**

Configure:

1. `ASSISTANT_SESSION_KEY` — 32 random bytes encoded Base64URL;
2. `ASSISTANT_TURNSTILE_SITE_KEY` — browser/public key for the existing Turnstile widget paired with the already-configured server secret;
3. `OPENAI_API_KEY` — secret;
4. `OPENAI_ASSISTANT_MODEL` — valid Responses API model ID.

Keep `ASSISTANT_PUBLIC_ENABLED` absent/false.

Then perform exactly one authenticated production readiness GET and branch the rollout from that result. Do not touch #215 before runtime readiness is fully green.
