# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-02 — America/Bogota**

Runtime baseline before this docs-only reconciliation:

`d1db8019deadc5d84fba9604de7a36f64658aba7` — PR #229.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged but smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — final Assistant public enablement

Assistant storage, backend, runtime configuration, widget integration and pre-enable Turnstile verification are PASS. The public feature remains OFF only because `ASSISTANT_PUBLIC_ENABLED` has not yet been explicitly enabled.

Required order:

1. [ ] Owner explicitly sets production `ASSISTANT_PUBLIC_ENABLED=true`.
2. [ ] Run one controlled representative Assistant E2E, one manual action at a time.
3. [ ] Confirm a normal response and deterministic Availability/Rental boundaries.
4. [ ] Complete explicit privacy consent and create exactly one QA Lead with `source=assistant`, `status=new`.
5. [ ] Confirm consent, Admin visibility, notification and duplicate protection.
6. [ ] Confirm existing Contact/Rental continuity.
7. [ ] Close Assistant rollout docs.
8. [ ] Resume #191 immediately afterward.

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

Final storage PRs: #223 and #224. Old #216 is closed/superseded.

## C. Assistant backend — PR #225

✅ **MERGED / CI PASS / DEPLOYED.**

Squash merge: `259b68b2d94b5fca7dcfe13bec79ace40792fff8`.

Includes gated `/api/assistant`, Admin readiness, dedicated limiter, Turnstile verification, sealed stateless session, Responses API / strict Structured Outputs / `store:false`, deterministic tools, explicit consent, idempotent Lead capture and Resend handoff.

Old #213 is closed/superseded.

## D. Runtime configuration/readiness

✅ **PASS IN PRODUCTION WITH PUBLIC FLAG OFF.**

- OpenAI ready.
- Session key ready.
- Turnstile browser + server config ready.
- Assistant rate limiter ready.
- D1 ready.
- Notification config ready.
- `missingBindings:[]`.
- `invalidBindings:[]`.
- `publicExposure.enabled:false`.

## E. Assistant public widget — PR #228

✅ **MERGED / CI PASS / DEPLOYED / FLAG-OFF SMOKE PASS.**

Squash merge: `6ef4c1990a8e4903b38f6fefb334d307634119f8`.

Widget scope: Contact launcher, desktop modal/mobile sheet, EN/ES, memory-only conversation, sealed token, Turnstile per operation, current API contract, server-owned consent and safe human fallback. It renders only when the public flag is true and a valid site key exists.

Old #215 is closed/superseded.

## F. SD.Live Forms Siteverify warning

✅ **DISPOSITIONED / PRODUCTION PASS.**

Cloudflare dashboard had shown:

`Siteverify isn't being called for SD.Live Forms`

Code audit:

- [x] Contact sends `turnstileToken`.
- [x] Rental sends `turnstileToken`.
- [x] server POSTs token to Cloudflare Siteverify.
- [x] server requires hostname `sdlive.show`.
- [x] server requires action `contact` / `rental`.
- [x] Turnstile failure exits before Lead persistence.

Production proof:

- [x] fresh real Contact Turnstile token used against live `/api/contact`;
- [x] privacy consent intentionally omitted so no Lead should be created;
- [x] server returned `{"ok":false,"error":"Privacy consent is required"}`;
- [x] because consent validation is downstream of Turnstile, the result proves Siteverify passed and the request reached the later privacy gate.

Disposition: the dashboard warning is stale/incomplete detection or association rather than a missing SD.Live Siteverify implementation. Reopen only if later production evidence contradicts this proof.

## G. Final Assistant E2E

🚧 **CURRENT ACTIVE GATE.**

Run after explicit public enablement, one manual action at a time. One representative flow should cover as much as possible without generating multiple QA Leads.

Acceptance:

- [ ] widget visible when enabled;
- [ ] desktop and mobile usable;
- [ ] EN/ES works;
- [ ] normal reply;
- [ ] Availability uses deterministic truth;
- [ ] Rental known item resolves through deterministic backend boundary;
- [ ] ambiguous/unknown Rental item fails closed;
- [ ] no invented prices/current inventory claims;
- [ ] consent prompt is product-owned;
- [ ] explicit authorization required;
- [ ] exactly one Lead created, `source=assistant`, `status=new`;
- [ ] consent persisted;
- [ ] Lead visible in Admin;
- [ ] notification behavior correct;
- [ ] duplicate submission does not duplicate Lead;
- [ ] safe fallback behavior remains bounded;
- [ ] existing Contact/Rental continue working;
- [ ] kill switch remains a valid rollback control.

# Open PR audit and priority

Repository-wide open-PR audit completed 2026-09-02.

Old preparatory Assistant drafts #192–#212 were left open after the final integrated backend superseded them. They are now all **CLOSED WITHOUT MERGE / superseded by #225**. Old #213, #215, #216 and temporary #218 were already closed/superseded.

After cleanup, exactly **one operational PR remains open**:

## Priority 1 — finish Assistant rollout

🚧 Current gate. No separate implementation PR remains; activation is production configuration followed by controlled E2E and closeout.

## Priority 2 — PR #191: verified-owner WhatsApp Availability control

🟡 **OPEN / NEXT AFTER ASSISTANT.**

This is the workstream the owner was on before the Assistant block.

Current plan after Assistant closeout:

- do not merge the old branch directly;
- inspect #191 scope against then-current `main`;
- reconstruct/rebase only the still-valid WhatsApp owner-control changes;
- preserve HMAC signature verification, exact owner/phone-number-id allowlisting, D1 message-id idempotency and canonical Availability write path;
- complete Meta WhatsApp Cloud API / Cloudflare secret configuration;
- CI green → squash merge → exactly one production smoke.

## Priority 3 — Rental real-time availability / double-booking protection

⏳ High-value next architecture step because it creates deterministic inventory truth for Rental itself and for the Assistant. Do not let the AI invent this state before the backend exists.

## Priority 4 — Mobile Rental Cart total visibility / sticky summary

⏳ Contained public UX debt already observed in production.

## Priority 5 — Rental quote/PDF + Finance Document Generator foundation

⏳ Build one reusable document engine rather than parallel PDF paths. Real Colombian electronic invoicing remains separate from ordinary quotation/account documents unless legal/provider requirements are explicitly implemented.

## Priority 6 — Calendar/Projects workflow additions

⏳ Expand only after current operational flows remain stable.

## Priority 7 — SD.Live Patch

⏳ Larger product module: patch sheets, Stage I/O, signal path, snapshots, visual patch and device profiles.

## Later backlog

⏳ Basic CRM beyond current Lead Core.  
⏳ Admin Inbox / Workspace association.  
⏳ AppSheet reminder delivery hardening.  
⏳ Data Studio / business analytics.  
⏳ SEO/indexation monitoring.  
⏳ Mobile critical-render performance.  
⏳ Accessibility remediation.  
⏳ CMS advanced layout/DAM/editor capabilities.  
⏳ Canonical HTML CV/private portfolio.  
⏳ Security/Cloudflare periodic evaluation.

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
✅ Existing SD.Live Forms Siteverify verification.

# Source-of-truth boundaries

## Finance

- Google Sheets `REGISTRO` = operations/finance persistence + formulas.
- AppSheet SD.Live Track = mobile/offline workflow.
- Finance Admin = read-only.
- ⛔ Generic Finance Phase 3 write-back remains BLOCKED.
- Assistant has no Finance read/write path.

## Rental

- backend pricing/quote logic is authoritative;
- Assistant cannot become a second Rental catalog/pricing engine;
- unknown/ambiguous item resolution fails closed;
- inventory availability remains unknown unless a deterministic backend says otherwise;
- cart is request for quotation, not checkout.

## Availability

- D1 Availability Core is authoritative;
- AI consumes it as a deterministic tool;
- Travel/private timezone data is not public business context;
- public owner-phone leakage is prohibited.

## Assistant session/privacy

- no transcript persistence;
- structured slots only;
- AES-GCM sealed browser token;
- no provider-side conversation-state dependency;
- explicit product-owned consent only;
- Lead + consent + idempotency effect persisted atomically;
- retry returns existing completed Lead rather than duplicate PII.

# Non-negotiable workflow

- Never write directly to `main`.
- One short branch per coherent change.
- Tests/CI before merge.
- Squash merge.
- Exactly one representative production smoke for runtime changes.
- No production smoke for docs-only.
- One manual QA action at a time.

# Exact continuation

**The Turnstile gate is PASS. Finish the current Assistant rollout before changing workstreams: explicitly enable `ASSISTANT_PUBLIC_ENABLED=true`, run the representative E2E, close the Assistant milestone, then resume #191.**
