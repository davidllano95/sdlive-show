# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-03 — America/Bogota**

Current runtime baseline:

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

# Current Active Gate — PR #191 WhatsApp owner control for Availability

🚧 **ACTIVE / OPEN / UNMERGED.**

The Assistant rollout is now CLOSED/PASS, so #191 becomes the approved next workstream.

Do **not** merge `feature/whatsapp-owner-control` directly. Its branch predates the completed Assistant rollout and must be reconstructed/reverified on current `main`.

Required order:

1. [ ] Inspect the existing #191 diff against current `main`.
2. [ ] Identify only still-valid bounded WhatsApp owner-control behavior.
3. [ ] Create a fresh short branch from current `main`.
4. [ ] Preserve Meta webhook HMAC signature verification.
5. [ ] Preserve exact owner sender + `phone_number_id` allowlisting.
6. [ ] Preserve D1 WhatsApp message-id idempotency and in-flight duplicate protection.
7. [ ] Reuse the existing Availability owner parser and canonical Availability write path.
8. [ ] Keep owner phone/token/app secret server-side and out of public config/repo vars.
9. [ ] Complete Meta WhatsApp Cloud API / Cloudflare onboarding and secrets.
10. [ ] Run tests/CI, open PR, require green CI, squash merge.
11. [ ] Run exactly one representative production smoke.
12. [ ] Close/document #191 before starting the next runtime milestone.

No AI is required for #191.

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

# Priority 1 — PR #191: verified-owner WhatsApp Availability control

🚧 **CURRENT ACTIVE GATE.**

See top of this checklist. The old branch is reference material only; reconstruct on current `main`.

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

**Assistant rollout is CLOSED/PASS. Start #191 by inspecting its old diff and reconstructing the still-valid WhatsApp owner-control scope on a fresh branch from current `main`; do not merge the stale branch directly.**
