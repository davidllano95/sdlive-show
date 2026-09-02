# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-02 — America/Bogota**

Current runtime baseline:

`bf93bbbf9f707abea22105753c9d424b82a68b27` — PR #231.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged but smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — Assistant Safari second turn/session continuity

The public Assistant is enabled in production. Runtime bindings, widget integration, Siteverify and the first real OpenAI turn are PASS.

A Safari deadlock was then found between turns: after a successful first turn, Turnstile still looked successful although its token had been consumed; Send stayed disabled and `Enviando…` remained visible.

PR #231 fixes that by destroying/recreating Turnstile after each consumed token and clearing stale sending state. It is MERGED, PR CI PASS and `main` CI PASS. The only immediate acceptance step is the production Safari second-turn smoke.

Required order now:

1. [ ] In Safari, send one successful first Assistant turn.
2. [ ] Confirm `Enviando…` clears after the response.
3. [ ] Confirm Turnstile visibly regenerates with a fresh verification state.
4. [ ] Confirm Send becomes available again.
5. [ ] Send the planned second turn and confirm session continuity retains theatre-show + Bogotá context.
6. [ ] Mark `SESSION CONTINUITY = PASS` if successful.
7. [ ] Continue remaining Assistant E2E: explicit consent, exactly one Assistant Lead, idempotency/effects, handoff/notification, deterministic pricing/Availability boundaries, Contact/Rental continuity and mobile smoke if needed.
8. [ ] Close Assistant rollout docs.
9. [ ] Resume #191 immediately afterward.

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

Includes gated `/api/assistant`, Admin readiness, dedicated limiter, Turnstile verification, sealed stateless session, Responses API / strict Structured Outputs / `store:false`, deterministic tools, explicit consent, idempotent Lead capture and Resend handoff.

Old #213 is closed/superseded.

## D. Runtime configuration/readiness

✅ **PASS IN PRODUCTION / PUBLIC ENABLED.**

- OpenAI ready.
- Session key ready.
- Turnstile browser + server config ready.
- Assistant rate limiter ready.
- D1 ready.
- Notification config ready.
- `missingBindings:[]`.
- `invalidBindings:[]`.
- `readyForPublicEnablement:true` after activation.
- `publicExposure.enabled:true`.
- `ASSISTANT_PUBLIC_ENABLED=true`.

## E. Assistant public widget — PR #228

✅ **MERGED / CI PASS / DEPLOYED.**

Widget scope: Contact launcher, desktop modal/mobile sheet, EN/ES, memory-only conversation, sealed token, Turnstile per operation, current API contract, server-owned consent and safe human fallback.

Production evidence:

- launcher visible;
- modal opens;
- Assistant Turnstile loads and verifies;
- first real OpenAI turn PASS after API credits were added.

Known non-blocking visual debt: green/olive widget tones should later be aligned with the current violet SD.Live palette.

Old #215 is closed/superseded.

## F. SD.Live Forms Siteverify warning

✅ **DISPOSITIONED / PRODUCTION PASS.**

Cloudflare dashboard had shown `Siteverify isn't being called for SD.Live Forms`.

Code audit and a real production Contact probe proved the Siteverify boundary works. A fresh valid token with privacy consent intentionally omitted returned:

`{"ok":false,"error":"Privacy consent is required"}`

Because consent is downstream of Turnstile, the request necessarily passed server-side Siteverify first. No Lead was created by the probe.

Reopen only if future production evidence contradicts this result.

## G. First real Assistant turn

✅ **PASS.**

Initial fallback was traced to OpenAI API billing/credit availability. After credits were added, the same first-turn scenario returned a valid bounded response requesting date, venue, requested support, rehearsal/show schedule and technical requirements.

This established that the public route, provider integration, structured response path and browser security gate function end to end for one turn.

## H. PR #231 — Turnstile refresh between turns

🟢 **MERGED / PR CI PASS / MAIN CI PASS / PRODUCTION SAFARI SMOKE PENDING.**

Squash merge: `bf93bbbf9f707abea22105753c9d424b82a68b27`.

Implementation:

- `turnstile.remove(widgetId)` after token consumption;
- clear the Turnstile container;
- recreate a fresh widget/token while modal remains open;
- clear stale status on API success/error/network failure;
- regression coverage for the Safari-visible deadlock.

CI history:

- Tests #631 failed because an old contract assertion still required `turnstile.reset(widgetId)`;
- this was a stale test contract, not a browser security regression and not an `OPENAI_*` exposure failure;
- contract test updated to require `turnstile.remove(widgetId)`;
- Tests #632 PASS on PR head;
- Tests #633 PASS on merged `main`.

Security protections remain unchanged.

## I. Final Assistant E2E

🚧 **CURRENT ACTIVE GATE.**

Immediate Safari session-continuity smoke:

Second-turn message:

`The show is October 17, 2026. Venue is still TBD. I need sound design and FOH, with rehearsal on October 16 from 2–8 PM. What else do you need?`

Acceptance:

- [ ] first turn succeeds;
- [ ] stale `Enviando…` disappears;
- [ ] Turnstile regenerates after first response;
- [ ] Send re-enables;
- [ ] second turn sends successfully;
- [ ] answer retains prior **theatre show** context;
- [ ] answer retains prior **Bogotá** context;
- [ ] no need to repeat those prior facts.

After session continuity PASS, continue within the same milestone:

- [ ] explicit privacy consent is product-owned and required;
- [ ] exactly one Lead created, `source=assistant`, `status=new`;
- [ ] consent persisted;
- [ ] Lead visible in Admin;
- [ ] notification behavior correct;
- [ ] duplicate/effect retry does not duplicate Lead;
- [ ] Availability uses deterministic truth;
- [ ] Rental known item resolves through deterministic backend boundary;
- [ ] ambiguous/unknown Rental item fails closed;
- [ ] no invented prices/current inventory claims;
- [ ] existing Contact/Rental continue working;
- [ ] mobile smoke if applicable;
- [ ] kill switch remains a valid rollback control.

# Open PR audit and priority

Repository-wide open-PR audit completed again after #231 merge.

Old preparatory Assistant drafts #192–#212 remain **CLOSED WITHOUT MERGE / superseded by #225**. Old #213, #215, #216 and temporary #218 are closed/superseded.

Exactly **one operational PR remains open**:

## Priority 1 — finish Assistant rollout

🚧 Current gate. Do not mix in unrelated runtime work until the Assistant E2E is closed and documented.

## Priority 2 — PR #191: verified-owner WhatsApp Availability control

🟡 **OPEN / NEXT AFTER ASSISTANT.**

Current plan after Assistant closeout:

- do not merge the old branch directly;
- inspect #191 scope against then-current `main`;
- reconstruct/rebase only still-valid WhatsApp owner-control changes;
- preserve HMAC signature verification, exact owner/phone-number-id allowlisting, D1 message-id idempotency and canonical Availability write path;
- complete Meta WhatsApp Cloud API / Cloudflare secret configuration;
- CI green → squash merge → exactly one production smoke.

## Priority 3 — Rental real-time availability / double-booking protection

⏳ Establish deterministic inventory truth for Rental and Assistant.

## Priority 4 — Mobile Rental Cart total visibility / sticky summary

⏳ Contained high-value public UX debt.

## Priority 5 — Rental quote/PDF + Finance Document Generator foundation

⏳ Build one reusable document engine rather than parallel PDF paths.

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
✅ Assistant public widget integration.  
✅ Existing SD.Live Forms Siteverify verification.  
✅ First real Assistant provider turn.

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

**PR #231 is merged and green. Run exactly one Safari second-turn/session-continuity smoke. If it passes, finish the remaining Assistant E2E gates and close the milestone before resuming #191.**
