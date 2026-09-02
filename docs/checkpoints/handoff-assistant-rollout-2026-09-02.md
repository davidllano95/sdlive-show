# SD.Live Assistant rollout checkpoint — 2026-09-02

## Authority

This checkpoint records the verified rollout state after Assistant storage preparation, final backend integration, production runtime configuration PASS, clean public-widget integration and the remaining Cloudflare Turnstile Siteverify gate on 2026-09-02 America/Bogota.

Source precedence:

1. current GitHub `main` + verified production behavior;
2. current schema/config;
3. latest checkpoint;
4. `PROJECT_STATUS.md`;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older docs.

`UNMERGED != PRODUCTION` and `CI PASS != PRODUCTION SMOKE PASS`.

## Verified runtime main

Before this docs-only reconciliation:

`6ef4c1990a8e4903b38f6fefb334d307634119f8`

This is squash-merged PR #228: **Integrate gated Assistant public widget on current main**.

Verification:

- #228 PR CI PASS;
- post-merge `main` Tests #626 PASS;
- production Assistant runtime configuration PASS;
- public kill switch remains OFF;
- post-#228 production flag-OFF smoke PASS: public launcher/widget is absent as intended.

## Availability / Lead Core / storage

Availability Core v1 remains CLOSED/PASS. Do not reopen without regression.

Lead Core remains CLOSED/PASS with canonical statuses `new`, `contacted`, `quoted`, `confirmed`, `lost` and relevant sources `contact`, `rental`, `assistant`.

Assistant storage gate remains CLOSED/PASS:

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

It provides:

- approved EN/ES knowledge/system policy;
- strict structured model output;
- deterministic Availability/Rental boundaries;
- sealed stateless session;
- explicit consent;
- Turnstile boundary;
- dedicated rate limit;
- idempotent Lead capture;
- deterministic Resend handoff;
- OpenAI Responses API with `store:false`;
- public `POST /api/assistant` behind kill switch;
- Admin-only runtime readiness.

Old #213 is closed/superseded.

## Production runtime readiness — PASS

After the owner configured the four originally missing bindings, authenticated production readiness returned:

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

This is the expected safe state before public enablement: runtime fully configured, public flag still OFF.

## Assistant widget — PR #228

The old widget draft #215 was based on obsolete #213 lineage, so it was not retargeted or merged.

Instead, only the intended widget scope was reconstructed on the exact current `main` and integrated through PR #228.

Included:

- Contact-section launcher; no second persistent floating CTA;
- desktop modal / mobile bottom sheet;
- EN/ES runtime copy;
- no local/session storage or transcript persistence;
- sealed session token only;
- Turnstile explicit render with token reset per operation;
- current #225 browser/API wire contract;
- server-owned explicit privacy consent actions;
- deterministic human fallbacks without exposing owner phone;
- rendering only if `ASSISTANT_PUBLIC_ENABLED=true` and the site key is valid.

PR #228 CI PASS and post-merge Tests #626 PASS.

Production smoke with the flag OFF PASS: no Assistant launcher/widget rendered publicly.

Old #215 is now **CLOSED WITHOUT MERGE / superseded by #228**. Do not reopen it.

## Cloudflare Turnstile Siteverify warning — current gate

Cloudflare displays for the existing **SD.Live Forms** widget:

`Siteverify isn't being called for SD.Live Forms`

Repository investigation completed after the warning was discovered.

Confirmed browser path:

- Contact widget renders with action `contact`;
- Rental widget renders with action `rental`;
- both obtain a token through `window.turnstile.getResponse(...)`;
- both include `turnstileToken` in their real request payloads.

Confirmed server path:

- `worker.js` calls `https://challenges.cloudflare.com/turnstile/v0/siteverify`;
- it uses `TURNSTILE_SECRET_KEY` server-side;
- it requires `result.hostname === "sdlive.show"`;
- it requires the expected action (`contact` or `rental`);
- failed verification returns before Lead creation.

Therefore the warning is not evidence of missing server-side Siteverify implementation. The remaining uncertainty is runtime observation/association: we have not yet proved that a current real production token from this exact widget is reaching Siteverify in a way Cloudflare associates with **SD.Live Forms**.

Do not call the warning a false positive yet.

### Next safe proof

Perform one non-destructive Contact validation:

1. obtain a fresh valid Turnstile token from the live Contact widget;
2. send it through the live Contact endpoint;
3. intentionally omit/fail a later validation requirement so the request is rejected after Turnstile verification;
4. verify no Lead is created;
5. re-check/disposition the Cloudflare warning/telemetry.

This proof is required before setting `ASSISTANT_PUBLIC_ENABLED=true`.

## Public enablement — not yet

`ASSISTANT_PUBLIC_ENABLED` remains absent/false.

Only after the Turnstile gate above is clean:

1. explicitly enable the public flag;
2. perform final Assistant E2E one manual action at a time;
3. cover desktop/mobile, EN/ES, normal reply, deterministic Availability/Rental, explicit consent, exactly one Lead, notification, idempotency, provider fallback, Turnstile failure, rate limit and human fallback;
4. confirm existing Contact/Rental remain functional.

## Superseded / separate work

- #213 — CLOSED WITHOUT MERGE / superseded by #225.
- #215 — CLOSED WITHOUT MERGE / superseded by #228.
- #216 — CLOSED WITHOUT MERGE / superseded by #224.
- #218 — CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY.
- #191 — OPEN / separate Availability owner transport; do not touch unless explicitly reprioritized.

## Hard boundaries

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

**Current Active Gate: prove the existing SD.Live Forms Turnstile widget reaches server-side Siteverify in production without creating a Lead. Keep `ASSISTANT_PUBLIC_ENABLED` OFF until that evidence is clean.**
