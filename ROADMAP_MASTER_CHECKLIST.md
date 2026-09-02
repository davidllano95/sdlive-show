# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve current work order and durable backlog without allowing historical notes to override the live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-02 — America/Bogota**

Current verified `main` before this docs-only follow-up:

`5b709f5cb3a7923d25ac1f8062ae3458b02fc806` — PR #226.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-smoked.
- 🟢 **MERGED / CI PASS** — merged but production smoke status must be stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / DRAFT / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work, does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — Assistant runtime readiness verification

The backend is deployed and the public feature remains OFF.

The first production readiness probe identified four missing bindings. The owner has now entered all four in Cloudflare:

- `ASSISTANT_SESSION_KEY`
- `ASSISTANT_TURNSTILE_SITE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_MODEL`

This is **owner-reported configuration, not yet verified runtime PASS**. The next action is one authenticated readiness GET.

Already verified ready from the first probe:

- D1 binding
- Assistant rate limiter
- notification routing/provider config
- Turnstile server secret
- Assistant storage schema

Do not enable `ASSISTANT_PUBLIC_ENABLED` yet.

## A. Lead Core foundation

✅ **CLOSED/PASS through PR #190.**

Canonical statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Lead sources:

- `contact`
- `rental`
- `assistant`

Service categories:

- `live`
- `theatre`
- `sound_design`
- `systems`
- `rental`
- `other`

## B. Assistant storage gate

✅ **CLOSED/PASS IN PRODUCTION.**

Completed work includes:

- read-only preflight;
- exact migration of legacy `leads` preserving IDs/data and `project` type;
- email made nullable;
- `assistant` Lead type added;
- `privacy_consents` accepts `assistant`;
- canonical unique consent index preserved;
- `assistant_effect_reservations` created with canonical constraints/index;
- production preflight returns `readyForAssistantLeadCapture:true`.

Relevant final PRs:

- #223 — confirmed exact Leads schema migration endpoint — merged and production PASS.
- #224 — final supported Privacy + idempotency preparation — merged and production PASS.

Old #216 is CLOSED WITHOUT MERGE / superseded by #224.

## C. Assistant backend — PR #225

✅ **MERGED / CI PASS / DEPLOYED WITH PUBLIC FLAG OFF.**

- Squash merge: `259b68b2d94b5fca7dcfe13bec79ace40792fff8`.
- PR tests PASS.
- Post-merge `main` Tests #620 PASS.
- `/api/assistant` mounted behind hard kill switch.
- `/api/admin/assistant/readiness` mounted Admin-only.
- dedicated `ASSISTANT_RATE_LIMITER` ready.
- OpenAI Responses API / Structured Outputs / `store:false`.
- sealed stateless session.
- deterministic Availability/Rental/Lead boundaries.

Old #213 is CLOSED WITHOUT MERGE / superseded by #225.

## D. Runtime configuration/readiness

🚧 **CURRENT ACTIVE GATE.**

First production readiness after #225 deployment:

- `readyForRuntimeConfiguration:false`
- `readyForPublicEnablement:false`
- public exposure disabled
- no runtime network/storage mutation in readiness probe

Owner has since configured the four previously missing bindings. Required next:

- rerun authenticated readiness;
- require `readyForRuntimeConfiguration:true`;
- require all runtime dependencies ready;
- require `missingBindings:[]` and `invalidBindings:[]`;
- require `publicExposure.enabled:false`;
- keep `ASSISTANT_PUBLIC_ENABLED` absent/false.

## E. Turnstile Siteverify warning

🚧 **MANDATORY SECURITY FOLLOW-UP BEFORE FINAL PUBLIC ENABLEMENT.**

Cloudflare Turnstile dashboard currently shows this warning for the existing widget **SD.Live Forms**:

`Siteverify isn't being called for SD.Live Forms`

Required investigation:

- inspect the real Contact/Rental submission path;
- determine whether submitted Turnstile tokens are actually verified server-side against Cloudflare Siteverify;
- determine whether the dashboard warning is a detection false positive or a real validation gap;
- if a gap exists, fix it and regression-test Contact/Rental;
- do not weaken the Assistant's separate Turnstile validation boundary;
- close/disposition this warning before `ASSISTANT_PUBLIC_ENABLED=true`.

This warning is not evidence by itself that the Assistant readiness probe will fail; it concerns the existing SD.Live Forms widget and must be investigated separately.

## F. PR #215 — public widget

🟡 **OPEN / DRAFT / UNMERGED / NOT PRODUCTION.**

- Prepared on old #213 lineage.
- Do not merge directly.
- Reverify/rebase only after runtime readiness is fully green with flag OFF.
- Merge while flag remains OFF.
- Explicit public enablement happens only after widget merge + CI and after the Turnstile Siteverify warning has been dispositioned.

## G. PR #218 — temporary integration proof

🧪 **CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY / PASS**.

Do not reopen or merge.

## H. PR #191 — Availability owner WhatsApp transport

🟡 **OPEN / separate workstream.**

Do not touch unless explicitly reprioritized.

# Rollout checklist

- [x] Availability Core v1 CLOSED/PASS.
- [x] Lead Core operational workflow merged.
- [x] Lead status audit visibility production-smoked PASS.
- [x] Read-only Assistant storage preflight deployed.
- [x] Exact physical Leads migration completed and verified.
- [x] Privacy + idempotency storage preparation completed and verified.
- [x] Storage gate reached `readyForAssistantLeadCapture:true`.
- [x] Old #213 superseded by clean backend integration #225.
- [x] #225 CI PASS.
- [x] #225 squash merged.
- [x] `main` post-merge Tests #620 PASS.
- [x] Authenticated production runtime readiness smoke with public flag OFF.
- [x] Owner entered the four previously missing runtime bindings in Cloudflare (pending runtime verification).
- [ ] Re-run `/api/admin/assistant/readiness` and reach runtime-ready state with public flag OFF.
- [ ] Investigate Cloudflare `Siteverify isn't being called for SD.Live Forms` warning.
- [ ] If real gap, fix server-side Contact/Rental Turnstile verification and regression-test.
- [ ] Reverify/rebase #215 onto current `main`.
- [ ] CI PASS for rebased widget.
- [ ] Merge #215 while flag OFF.
- [ ] Explicitly enable `ASSISTANT_PUBLIC_ENABLED=true` only after Turnstile warning disposition.
- [ ] Final Assistant E2E, one manual action at a time.
- [ ] Confirm existing Contact/Rental remain functional after final enablement.

# Final Assistant E2E checklist — later

Do not run as one bundled manual instruction.

- [ ] widget appears only when enabled;
- [ ] desktop;
- [ ] mobile;
- [ ] EN;
- [ ] ES;
- [ ] normal reply;
- [ ] Availability question uses deterministic source;
- [ ] known Rental item;
- [ ] unknown Rental item fails closed;
- [ ] no invented prices;
- [ ] consent prompt;
- [ ] explicit authorization;
- [ ] exactly one Lead created;
- [ ] source `assistant`;
- [ ] status `new`;
- [ ] consent recorded;
- [ ] Lead visible in Admin;
- [ ] Resend notification;
- [ ] duplicate submit does not duplicate Lead;
- [ ] provider failure safe fallback;
- [ ] Turnstile failure;
- [ ] rate limit;
- [ ] human fallback;
- [ ] feature flag OFF hides/disables Assistant;
- [ ] existing Contact/Rental remain functional.

# Closed modules — do not reopen without regression

✅ Finance read-only / regression closeout.  
✅ Calendar controlled create + multi-day.  
✅ Site Schedule / automatic Show Day / Location.  
✅ Show Day Admin force control.  
✅ Admin stabilization through #150.  
✅ Public visual audit issue #124.  
✅ Rental image-editor parity #157.  
✅ Availability Core v1.  
✅ Lead Core workflow/status audit.  
✅ Assistant storage gate.

# Source-of-truth boundaries

## Finance

- Google Sheets `REGISTRO` = operations/finance persistence + formulas.
- AppSheet SD.Live Track = mobile/offline workflow.
- Finance Admin = read-only.
- ⛔ Generic Finance Phase 3 write-back remains BLOCKED.
- Assistant has no Finance write path.

## Rental

- backend pricing/quote logic is authoritative;
- Assistant cannot become a second Rental catalog/pricing engine;
- unknown/ambiguous item resolution fails closed;
- no fuzzy substitution;
- inventory availability remains unknown unless deterministic backend says otherwise;
- cart is request for quotation, not checkout.

## Availability

- D1 Availability Core is authoritative;
- AI consumes it as a deterministic tool;
- Travel/private timezone data is not public business context;
- public owner phone leakage is prohibited.

## Assistant session/privacy

- no transcript persistence;
- structured slots only;
- AES-GCM sealed browser token;
- browser cannot alter authenticated state;
- no provider-side conversation-state dependency;
- explicit product-owned consent only;
- Lead + consent + idempotency effect persisted atomically;
- retry returns existing completed Lead rather than duplicate PII.

# Durable backlog — does not displace Active Gate

⏳ Mobile Rental Cart total visibility / sticky summary.  
⏳ Rental real-time availability + double-booking protection.  
⏳ Rental quote/PDF automation.  
⏳ Calendar workflow additions / Projects.  
⏳ Finance Document Generator.  
⏳ AppSheet reminder delivery hardening.  
⏳ SD.Live Patch.  
⏳ Basic CRM beyond current Lead Core.  
⏳ Admin Inbox / Workspace association.  
⏳ Data Studio / business analytics.  
⏳ SEO/indexation monitoring.  
⏳ Mobile critical-render performance work.  
⏳ Accessibility fixes from previous audit.  
⏳ CMS advanced layout/DAM/editor capabilities.  
⏳ Canonical HTML CV/private portfolio.  
⏳ Content/Journal only with real editorial value.  
⏳ Security/Cloudflare evaluation.  
⏳ PR #191 verified-owner WhatsApp transport after Assistant gate or explicit reprioritization.

# Non-negotiable workflow

- Never write directly to `main`.
- One short branch per coherent change.
- Tests/CI before merge.
- Squash merge.
- Exactly one representative production smoke for runtime changes.
- No production smoke for docs-only.
- One manual QA action at a time.
- Do not use Cloudflare deployment internals as routine source of truth.
- Do not treat DRAFT code as production.

# Exact continuation

**Run one authenticated Assistant runtime readiness GET. If fully green with the public flag OFF, investigate/disposition the SD.Live Forms Siteverify warning before final public enablement, then rebase/integrate #215.**
