# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-03 — America/Bogota**

Current GitHub `main`:

`a5bffc66e711af23f2df01cd440aa0d43344d632`.

Last verified runtime baseline:

`c52a06603c0a6b5cd0cc4425cca11f69cce693d7` — PR #244.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged but smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — PR #246 WhatsApp owner control for Availability

🚧 **ACTIVE / OPEN / UNMERGED / CI RED.**

The stale PR #191 has already been inspected and reconstructed rather than merged directly.

Current implementation:

- PR **#246 — Rebuild verified-owner WhatsApp Availability control**;
- branch `feature/whatsapp-owner-control-current-main-20260903`;
- head at handoff `fd4a00929b3bd02c5cc3da0b7338bf90faea911c`;
- base at PR creation `a5bffc66e711af23f2df01cd440aa0d43344d632`;
- 13 changed files;
- GitHub Actions **Tests #673 = FAILURE** in `Run tests`;
- #246 remains unmerged and therefore is not production.

Detailed checkpoint:

`docs/checkpoints/handoff-whatsapp-owner-control-pr246-2026-09-03.md`

Completed reconstruction work:

1. [x] Inspect old #191 behavior against current architecture.
2. [x] Reconstruct only still-valid bounded owner-control behavior on a fresh branch.
3. [x] Preserve raw-body Meta HMAC signature verification.
4. [x] Preserve exact owner sender + `phone_number_id` allowlisting.
5. [x] Preserve D1 WhatsApp message-id idempotency and reply retry semantics.
6. [x] Reuse existing Availability owner parser and canonical `handleAvailabilityApi` path.
7. [x] Add hard `WHATSAPP_OWNER_CONTROL_ENABLED` kill switch.
8. [x] Remove public-webhook schema creation and add Access-protected explicit storage preparation.
9. [x] Shield historical Availability schema guards from this public transport so missing schema fails closed instead of running DDL.
10. [x] Add Admin readiness/storage routes and regression tests.
11. [ ] Extract exact failing assertions from Tests #673.
12. [ ] Fix only those failing contracts while preserving the security/source-of-truth boundaries.
13. [ ] Rerun CI and require green.
14. [ ] Squash merge #246.
15. [ ] Verify `main` CI after merge.
16. [ ] Run storage preparation and readiness with kill switch still OFF.
17. [ ] Complete Meta WhatsApp Cloud API / Cloudflare onboarding and bindings/secrets.
18. [ ] Verify callback/subscriptions and readiness.
19. [ ] Enable the kill switch only when readiness passes.
20. [ ] Run exactly one representative owner-number production smoke and return Availability to AUTO.
21. [ ] Close old #191 without merge as superseded after #246 is validated/merged.
22. [ ] Mark WhatsApp owner control CLOSED/PASS before starting the next runtime milestone.

No AI is required for #246.

# A. Availability Core foundation

✅ **CLOSED/PASS.** D1 Availability Core remains authoritative. Reopen only on regression.

# B. Lead Core foundation

✅ **CLOSED/PASS through PR #190.**

Canonical statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`.

Lead sources: `contact`, `rental`, `assistant`.

Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

# C. Assistant storage/backend/runtime

✅ **CLOSED/PASS IN PRODUCTION.**

- storage supports Assistant Lead capture;
- `privacy_consents` accepts Assistant source;
- `assistant_effect_reservations` provides idempotency;
- `/api/assistant` is gated and operational;
- OpenAI Responses API + strict Structured Outputs + `store:false`;
- sealed stateless session;
- dedicated rate limiter;
- deterministic Availability/Rental tools;
- explicit consent;
- idempotent Lead capture;
- Resend handoff.

Foundation PRs: #224, #225, #228.

# D. Assistant public UX/runtime hardening

✅ **CLOSED/PASS.**

Relevant PRs:

- #231 — Safari post-turn recovery;
- #235 — Turnstile once per Assistant session;
- #236/#237 — branded messaging shell + SD.Live palette/layout correction;
- #238/#239 — inline security confirmation + official SD.Live avatar;
- #240 — deterministic `venue=TBD` persistence;
- #241 — Enter sends / Shift+Enter newline;
- #242 — consent → Lead draft hardening;
- #243/#244 — Rental deterministic fail-closed handling.

# E. Final Assistant E2E — 2026-09-03

✅ **CLOSED / PRODUCTION PASS.**

Final checkpoint: `docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md`.

Acceptance completed:

- [x] first real provider turn succeeds;
- [x] Safari session continuity succeeds across turns;
- [x] `venue=TBD` remains remembered and is not re-asked;
- [x] Enter sends and Shift+Enter remains newline;
- [x] Turnstile security check appears inline and confirms Verified;
- [x] Turnstile once-per-session behavior works;
- [x] desktop messaging layout coherent with SD.Live palette;
- [x] mobile layout works;
- [x] mobile Spanish interaction works;
- [x] explicit privacy consent required and never inferred;
- [x] Data authorization card fully visible;
- [x] exactly one QA Assistant Lead created (`#26`, `source=assistant`, `status=new`);
- [x] consent persisted atomically with Lead/idempotency effect;
- [x] Lead visible in Admin;
- [x] Resend/handoff email received at `hello@sdlive.show`;
- [x] reload/retry does not duplicate Lead;
- [x] Availability response matches deterministic public state (`available + WhatsApp`);
- [x] Rental over-limit request fails closed;
- [x] unknown Rental item fails closed without substitution;
- [x] known Rental item is recognized but price/inventory remain unconfirmed;
- [x] no invented prices or current inventory claims;
- [x] Contact form continuity PASS;
- [x] Rental quote-request continuity PASS;
- [x] public kill switch remains available.

Old preparatory Assistant PRs #192–#212, old #213/#215/#216 and temporary #218 remain closed/superseded. Do not reopen them.

# F. SD.Live Forms Siteverify warning

✅ **DISPOSITIONED / PRODUCTION PASS.**

Contact/Rental submit Turnstile tokens and the Worker verifies Siteverify, hostname and action before downstream consent/Lead behavior. Reopen only if new runtime evidence contradicts that proof.

# Priority 1 — PR #246: verified-owner WhatsApp Availability control

🚧 **CURRENT ACTIVE GATE.**

Do not touch Meta/Cloudflare rollout configuration while CI is red. Resume by extracting the exact failing assertions from Tests #673 and fixing only those contracts on the current #246 branch.

Old PR #191 is historical source material only and must not be merged directly.

# Priority 2 — Rental real-time availability / double-booking protection

⏳ Establish deterministic inventory truth for Rental and Assistant. This is the prerequisite for future real inventory availability claims.

# Priority 3 — Mobile Rental Cart total visibility / sticky summary

⏳ Contained high-value public UX debt.

# Priority 4 — Rental quote/PDF + Finance Document Generator foundation

⏳ Build one reusable document engine rather than parallel PDF paths.

# Priority 5 — Calendar/Projects workflow additions

⏳ Expand only after current operational flows remain stable.

# Priority 6 — SD.Live Patch

⏳ Larger product module: patch sheets, Stage I/O, signal path, snapshots, visual patch and device profiles.

# Later backlog

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
✅ Assistant full production E2E rollout.  
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
- catalog quantity limits fail closed;
- inventory availability remains unknown unless a deterministic backend says otherwise;
- cart is request for quotation, not checkout.

## Availability

- D1 Availability Core is authoritative;
- AI consumes it as a deterministic tool;
- WhatsApp owner control must use the same canonical parser/write path;
- public WhatsApp traffic must not migrate D1 schema;
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

**Resume PR #246 at Tests #673. Extract the exact failing assertions, fix only those contracts on `feature/whatsapp-owner-control-current-main-20260903`, rerun CI, and do not merge or touch Meta/Cloudflare rollout configuration until CI is green.**
