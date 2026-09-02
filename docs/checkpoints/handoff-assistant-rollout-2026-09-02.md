# SD.Live Assistant rollout checkpoint — 2026-09-02

## Authority

This checkpoint records the verified rollout state after Assistant storage preparation, final backend integration, production runtime configuration PASS, public-widget integration, real production Siteverify proof and repository PR cleanup on 2026-09-02 America/Bogota.

Source precedence:

1. current GitHub `main` + verified production behavior;
2. current schema/config;
3. latest checkpoint;
4. `PROJECT_STATUS.md`;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older docs.

`UNMERGED != PRODUCTION` and `CI PASS != PRODUCTION SMOKE PASS`.

## Runtime baseline before this docs-only reconciliation

`d1db8019deadc5d84fba9604de7a36f64658aba7` — PR #229.

Production state at this checkpoint:

- Assistant storage PASS;
- backend #225 merged/deployed;
- runtime bindings/readiness PASS;
- widget #228 merged/deployed;
- public kill switch still OFF;
- flag-OFF widget smoke PASS;
- existing Contact Turnstile Siteverify production proof PASS.

## Availability / Lead Core / storage

Availability Core v1 remains CLOSED/PASS. Do not reopen without regression.

Lead Core remains CLOSED/PASS with statuses `new`, `contacted`, `quoted`, `confirmed`, `lost` and relevant sources `contact`, `rental`, `assistant`.

Assistant storage remains CLOSED/PASS:

- Assistant Lead insert supported;
- email nullable;
- Privacy accepts `assistant`;
- idempotency storage ready;
- `readyForAssistantLeadCapture:true`;
- no final FK violations/stale migration objects.

Relevant final storage PRs: #223 and #224. Old #216 is closed/superseded.

## Assistant backend — PR #225

PR #225 is MERGED / CI PASS / DEPLOYED.

Squash merge:

`259b68b2d94b5fca7dcfe13bec79ace40792fff8`

It provides approved EN/ES knowledge/system policy, strict structured output, deterministic Availability/Rental boundaries, sealed stateless session, explicit consent, Turnstile, dedicated rate limiting, idempotent Lead capture, deterministic Resend handoff, OpenAI Responses API with `store:false`, public `POST /api/assistant` behind a kill switch and Admin-only runtime readiness.

Old #213 is closed/superseded.

## Production runtime readiness — PASS

Authenticated production readiness after configuration returned:

- `ok:true`;
- `readyForRuntimeConfiguration:true`;
- `readyForPublicEnablement:false`;
- `publicExposure.enabled:false`;
- `missingBindings:[]`;
- `invalidBindings:[]`;
- `openai.ready:true`;
- `session.ready:true`;
- `turnstile.ready:true`;
- `browserSiteKeyConfigured:true`;
- `serverSecretConfigured:true`;
- `rateLimit.ready:true`;
- `d1Binding.ready:true`;
- `notification.ready:true`.

This is the expected safe pre-enable state. `readyForPublicEnablement:false` is due to the public switch remaining OFF.

## Assistant widget — PR #228

Old draft #215 was not retargeted or merged because it depended on obsolete #213 lineage. Only its intended widget scope was reconstructed on current `main` and integrated through #228.

Included:

- Contact-section launcher; no second persistent floating CTA;
- desktop modal / mobile bottom sheet;
- EN/ES;
- no local/session storage or transcript persistence;
- sealed session token only;
- Turnstile explicit render/reset per operation;
- current #225 browser/API contract;
- server-owned explicit privacy consent actions;
- deterministic human fallback without owner-phone exposure;
- rendering only if `ASSISTANT_PUBLIC_ENABLED=true` and site key is valid.

PR #228 CI PASS and production flag-OFF smoke PASS.

Old #215 is CLOSED WITHOUT MERGE / superseded by #228.

## SD.Live Forms Turnstile warning — DISPOSITIONED PASS

Cloudflare displayed for the existing **SD.Live Forms** widget:

`Siteverify isn't being called for SD.Live Forms`

### Code evidence

Confirmed browser path:

- Contact action = `contact`;
- Rental action = `rental`;
- both obtain a token through `window.turnstile.getResponse(...)`;
- both submit it as `turnstileToken`.

Confirmed server path:

- `worker.js` calls `https://challenges.cloudflare.com/turnstile/v0/siteverify`;
- `TURNSTILE_SECRET_KEY` remains server-side;
- response hostname must equal `sdlive.show`;
- action must match `contact` / `rental`;
- failed Turnstile verification returns before Lead persistence.

### Real production proof

A fresh Contact widget token was submitted to live `/api/contact` with a valid synthetic QA name/email/message but **without privacy consent**. The endpoint returned:

`{"ok":false,"error":"Privacy consent is required"}`

The Contact handler performs Turnstile verification before the privacy-consent gate. Reaching the privacy error therefore proves the live token passed server-side Siteverify and the request progressed to the next validation stage.

The omission of consent intentionally prevented Lead creation. This was a non-destructive runtime probe.

### Disposition

The warning is now treated as **stale/incomplete Cloudflare dashboard detection/association**, not evidence of a missing SD.Live Siteverify implementation. Reopen this gate only if future production behavior contradicts the verified path.

## Open PR cleanup

A repository-wide open-PR audit found one real held workstream (#191) plus stale Assistant preparation PRs #192–#212.

The preparatory drafts #192–#212 are now CLOSED WITHOUT MERGE because final integration #225 superseded their branch-level staging. They must not be reopened individually.

Already closed/superseded:

- #213 → #225;
- #215 → #228;
- #216 → #224;
- #218 → temporary validation only.

After cleanup, exactly one operational PR remains open:

- **#191 — authenticated WhatsApp owner control for Availability**.

Its description was refreshed to remove the stale #190 blocker. It is explicitly **NEXT AFTER Assistant closeout**, not concurrent. Its old branch must be reverified/reconstructed on the then-current `main` before merge, and Meta/Cloudflare onboarding/configuration remains required for activation.

## Current active gate — final Assistant enablement

All pre-enable technical/security gates are PASS.

`ASSISTANT_PUBLIC_ENABLED` remains absent/false.

Exact order:

1. owner explicitly sets production `ASSISTANT_PUBLIC_ENABLED=true`;
2. run one controlled representative Assistant E2E, one manual action at a time;
3. verify normal reply, deterministic Availability/Rental boundaries, explicit product-owned consent and exactly one Assistant Lead/handoff;
4. verify Admin/consent/notification/idempotency and existing Contact/Rental continuity;
5. document/close Assistant rollout;
6. resume #191.

Do not commit a default-ON public switch to GitHub. Production configuration remains the reversible activation control.

## Hard boundaries

- no impersonation;
- no invented/negotiated prices;
- no AI-owned Availability;
- no invented Rental availability;
- no second Rental pricing source;
- no Finance reads/writes by Assistant;
- explicit product-owned consent only;
- no full transcript persistence;
- no public owner phone/secrets;
- no public schema migration;
- no provider-owned conversation source of truth.

## Exact continuation

**Turnstile is PASS. Keep scope on the Assistant. The next manual action is explicit production `ASSISTANT_PUBLIC_ENABLED=true`; then run the representative E2E one action at a time. After Assistant closeout, resume #191 WhatsApp owner control.**
