# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve current work order and durable backlog without allowing historical notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-02 — America/Bogota**

Current verified runtime baseline before this docs-only reconciliation:

`6ef4c1990a8e4903b38f6fefb334d307634119f8` — PR #228.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-smoked.
- 🟢 **MERGED / CI PASS** — merged but production smoke status stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — Turnstile production verification before Assistant public enablement

The Assistant storage, backend, runtime configuration and public widget are now integrated. The public feature remains OFF.

Authenticated production readiness is fully green:

- `readyForRuntimeConfiguration:true`
- all runtime dependencies ready
- `missingBindings:[]`
- `invalidBindings:[]`
- `publicExposure.enabled:false`

PR #228 is deployed and the flag-OFF smoke PASS: the widget is not rendered publicly while disabled.

Do not enable `ASSISTANT_PUBLIC_ENABLED` until the Turnstile warning below is dispositioned.

## A. Lead Core foundation

✅ **CLOSED/PASS through PR #190.**

Canonical statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`.

Lead sources: `contact`, `rental`, `assistant`.

Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

## B. Assistant storage gate

✅ **CLOSED/PASS IN PRODUCTION.**

- exact Leads migration preserved IDs/data/legacy `project`;
- email nullable;
- `assistant` Lead source supported;
- Privacy accepts `assistant`;
- `assistant_effect_reservations` ready;
- `readyForAssistantLeadCapture:true`.

Relevant final PRs: #223 and #224. Old #216 is closed/superseded.

## C. Assistant backend — PR #225

✅ **MERGED / CI PASS / DEPLOYED.**

Squash merge: `259b68b2d94b5fca7dcfe13bec79ace40792fff8`.

Includes gated `/api/assistant`, Admin readiness, dedicated limiter, Turnstile verification, sealed stateless session, Responses API / strict Structured Outputs / `store:false`, deterministic tools, explicit consent, idempotent Lead capture and Resend handoff.

Old #213 is closed/superseded.

## D. Runtime configuration/readiness

✅ **PASS IN PRODUCTION WITH PUBLIC FLAG OFF.**

- OpenAI: ready.
- Session key: ready.
- Turnstile browser + server configuration: ready.
- Assistant rate limiter: ready.
- D1 binding: ready.
- notification configuration: ready.
- no missing or invalid bindings.

`readyForPublicEnablement:false` is currently expected because the kill switch remains OFF.

## E. Assistant public widget — PR #228

✅ **MERGED / CI PASS / DEPLOYED / FLAG-OFF SMOKE PASS.**

Squash merge: `6ef4c1990a8e4903b38f6fefb334d307634119f8`.

- Clean reconstruction on current `main`; no obsolete #213 lineage imported.
- Contact-section launcher, no second persistent floating CTA.
- Desktop modal / mobile bottom sheet.
- EN/ES.
- In-memory conversation only; sealed session token only.
- Explicit Turnstile token/reset per browser operation.
- Current `/api/assistant` contract.
- Server-owned consent prompt/actions.
- Human fallback with no owner phone exposure.
- Renders only with public flag true + valid site key.

Old #215 is **CLOSED WITHOUT MERGE / superseded by #228**.

## F. Turnstile Siteverify warning

🚧 **CURRENT MANDATORY SECURITY GATE.**

Cloudflare Turnstile dashboard shows for **SD.Live Forms**:

`Siteverify isn't being called for SD.Live Forms`

Code investigation completed:

- [x] Contact browser sends `turnstileToken`.
- [x] Rental browser sends `turnstileToken`.
- [x] server POSTs token to Cloudflare Siteverify.
- [x] server requires hostname `sdlive.show`.
- [x] server requires action `contact` or `rental` as appropriate.
- [x] failed Turnstile validation returns before Lead creation.
- [ ] prove a real production token from the existing widget reaches this server-side Siteverify path.
- [ ] re-check/disposition Cloudflare dashboard warning after that real verification.

Do not classify the dashboard warning as a false positive until the runtime proof is complete.

The production probe should be non-destructive: use a valid Contact Turnstile token but intentionally fail a later request validation gate so Siteverify runs and no Lead is persisted.

## G. Final public enablement — later

⏳ Only after the Turnstile gate is clean:

- [ ] explicitly set `ASSISTANT_PUBLIC_ENABLED=true`;
- [ ] verify widget appears on desktop;
- [ ] verify mobile bottom sheet;
- [ ] verify EN;
- [ ] verify ES;
- [ ] normal model reply;
- [ ] Availability question uses deterministic source;
- [ ] known Rental item;
- [ ] unknown Rental item fails closed;
- [ ] no invented prices;
- [ ] consent prompt;
- [ ] explicit authorization;
- [ ] exactly one Lead created with source `assistant` and status `new`;
- [ ] consent recorded;
- [ ] Lead visible in Admin;
- [ ] Resend notification;
- [ ] duplicate submission does not duplicate Lead;
- [ ] provider failure safe fallback;
- [ ] Turnstile failure;
- [ ] rate limit;
- [ ] human fallback;
- [ ] existing Contact/Rental remain functional;
- [ ] final flag-OFF rollback check remains available.

Run this **one manual action at a time**, not as one bundled QA instruction.

## H. Separate / held work

🟡 PR #191 — Availability owner WhatsApp transport. Separate workstream; do not touch unless explicitly reprioritized.

🧪 PR #218 — CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY; do not reopen.

# Closed modules — do not reopen without regression

✅ Finance read-only / regression closeout.  
✅ Calendar controlled create + multi-day.  
✅ Site Schedule / automatic Show Day / Location.  
✅ Show Day Admin force control.  
✅ Admin stabilization.  
✅ Public visual stabilization.  
✅ Rental image-editor parity.  
✅ Availability Core v1.  
✅ Lead Core workflow/status audit.  
✅ Assistant storage gate.  
✅ Assistant backend integration.  
✅ Assistant runtime configuration.  
✅ Assistant public widget integration with flag OFF.

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

# Exact continuation

**Keep the Assistant OFF. Perform one non-destructive production proof that a valid SD.Live Forms Contact token is verified server-side through Siteverify without creating a Lead. Disposition the Cloudflare warning from that evidence. Only then enable the public Assistant and begin final E2E.**
