# SD.Live Assistant rollout checkpoint — 2026-09-02

## Authority

This checkpoint records the verified rollout state after Assistant storage preparation, final backend integration, the first production runtime-readiness smoke, owner runtime binding configuration, and discovery of the Cloudflare Turnstile Siteverify warning on 2026-09-02 America/Bogota.

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

Current `main` before this docs-only follow-up:

`5b709f5cb3a7923d25ac1f8062ae3458b02fc806`

This is PR #226, the docs reconciliation after backend deployment. Runtime code remains the backend delivered by squash-merged PR #225.

Verification:

- #225 PR CI PASS;
- post-merge `main` Tests #620 PASS;
- #226 docs CI and post-merge main CI PASS;
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

The rollout resolved the legacy storage constraints safely:

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

Initial #225 CI had 718/720 tests passing. The only two failures came from stale preflight-stage expectations that required no public Assistant runtime and no `ASSISTANT_RATE_LIMITER`.

Those expectations were obsolete once #225 intentionally integrated the final gated backend. Runtime code was not weakened. Tests were updated to verify the current invariants instead.

After this change:

- PR Tests #619 PASS;
- #225 squash merged;
- `main` Tests #620 PASS.

## Production runtime readiness — current gate

The first authenticated production GET to:

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

It reported four missing bindings:

- `ASSISTANT_SESSION_KEY`
- `ASSISTANT_TURNSTILE_SITE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_MODEL`

`ASSISTANT_SESSION_KEY` must decode from Base64URL to exactly 32 bytes.

### Owner configuration after the first probe

On 2026-09-02 the owner entered all four previously missing bindings in the production Cloudflare Worker configuration while keeping `ASSISTANT_PUBLIC_ENABLED` absent/off.

This is **not yet a runtime PASS**. The next authenticated readiness GET must verify that the deployed Worker sees valid values and returns no missing/invalid bindings.

Expected PASS before touching #215:

- `readyForRuntimeConfiguration:true`;
- all `dependencies.*.ready:true`;
- `missingBindings:[]`;
- `invalidBindings:[]`;
- `publicExposure.enabled:false`.

`readyForPublicEnablement` is expected to remain false while the public kill switch is OFF.

## Cloudflare Turnstile Siteverify warning

While retrieving the site key from the existing **SD.Live Forms** Turnstile widget, Cloudflare displayed:

`Siteverify isn't being called for SD.Live Forms`

This is now a mandatory security follow-up before final Assistant public enablement.

Do not infer the cause yet. Required investigation:

1. inspect the actual Contact/Rental form submission implementation;
2. confirm whether Turnstile response tokens are sent to the server;
3. confirm whether the server verifies those tokens against Cloudflare Siteverify;
4. determine whether Cloudflare's warning is a detection false positive or a real validation gap;
5. if a real gap exists, fix and regression-test Contact/Rental;
6. preserve the Assistant's separate Turnstile boundary;
7. do not set `ASSISTANT_PUBLIC_ENABLED=true` until this warning is dispositioned.

The warning does not by itself establish that the Assistant's new runtime readiness is invalid; the readiness probe separately reports its Turnstile server-secret/site-key configuration.

## PR #215 — public widget

Status:

- OPEN
- DRAFT
- UNMERGED
- NOT PRODUCTION
- built on older #213 lineage

Do not merge directly.

Required order:

1. rerun authenticated runtime readiness after the four bindings were entered;
2. require runtime dependencies all ready with public flag OFF;
3. investigate/disposition the SD.Live Forms Siteverify warning before final public enablement;
4. reverify/rebase #215 onto current `main`;
5. CI PASS;
6. merge widget while flag remains OFF;
7. explicitly enable public flag only after security gates are satisfied;
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

**Current Active Gate: runtime readiness verification with public flag OFF.**

Perform exactly one authenticated production readiness GET. If it passes the expected runtime criteria above, continue with the Siteverify investigation and #215 integration path. Do not enable the public Assistant yet.
