# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve current work order and durable backlog without allowing historical notes to override the live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-02 — America/Bogota**

Current verified runtime baseline before this docs-only milestone:

`1c8e594ce84d3f50d7c1412fcb5dfb29c8bc5da9` — PR #190.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-smoked.
- 🟢 **MERGED / CI PASS** — merged but production smoke status must be stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / DRAFT / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work, does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — SD.Live Assistant rollout

## A. Lead Core foundation

✅ **CLOSED/PASS through PR #190.**

Canonical statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Historical `qualified / won / archived` are not executable contract values.

Lead sources relevant to current architecture:

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

PR #190 — **MERGED / CI PASS / PRODUCTION SMOKE PASS**. Lead status audit visibility is closed; do not mutate the QA lead again just to repeat smoke.

## B. PR #214 — read-only storage preflight

🚧 **NEXT ROLLOUT SLICE**

Status: **OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS**.

- Branch: `preflight/assistant-storage-readonly`.
- Head: `f5413158770254061d8b02a1d2c5113117fe5c0e`.
- Tests #581 PASS.
- Base: `main`.
- Endpoint: authenticated `GET /api/admin/assistant/preflight`.
- Metadata reads only (`PRAGMA` / `SELECT`).
- Checks `leads`, `privacy_consents`, `assistant_effect_reservations`.
- No create/alter/insert/update/delete.
- No public Assistant, new limiter, Finance/Rental/Contact/Calendar/Availability changes.

After docs reconciliation: reverify #214 against resulting `main`, squash merge if clean, then perform exactly one production action: authenticated GET preflight.

## C. PR #216 — conditional storage preparation

🟡 **OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS**.

- Base: #214 branch, not `main`.
- Head: `3ac0338a7896a7429316773dafe73bdf0e767025`.
- Tests #596 PASS.
- Admin-only POST `/api/admin/assistant/storage-prepare`.
- Exact confirmation: `PREPARE_ASSISTANT_STORAGE`.

Decision rule:

- #214 ready → do not merge/use #216;
- only supported safe preparation missing → integrate #216, run once, rerun #214;
- blocked/unknown `leads` schema → do not run #216; implement exact physical-schema migration only.

## D. PR #213 — Assistant backend

🟡 **OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS / NOT PRODUCTION**.

- Head: `cce1144f8336d22cafe2a9b200de93152bd6bea2`.
- Tests #594 PASS.
- Consolidates validated preparatory logic from PRs #192–#212.
- Includes approved EN/ES knowledge, policy, strict structured model output, deterministic Availability/Rental boundaries, explicit consent, sealed stateless session, Turnstile, dedicated limiter, idempotency, Lead capture, Resend handoff, OpenAI Responses boundary, orchestration and `/api/assistant`.
- Public kill switch `ASSISTANT_PUBLIC_ENABLED` defaults OFF.
- Admin readiness endpoint: `GET /api/admin/assistant/readiness`.
- Public runtime never migrates D1 schema.

Do not merge until storage is ready, runtime readiness is ready, kill switch is OFF and CI passes after rebase/integration.

## E. PR #215 — public widget

🟡 **OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS / NOT PRODUCTION**.

- Base: #213 branch.
- Head: `901961c11b9cd22ebf14cee251e4129b2e2c1be2`.
- Tests #595 PASS.
- Contact launcher, desktop modal/mobile bottom sheet, EN/ES, explicit Turnstile, in-memory conversation, sealed session, server-owned consent prompt, deterministic fallbacks.
- Renders only when `ASSISTANT_PUBLIC_ENABLED=true` and valid Turnstile public key exists.

Do not integrate before #213 is live and backend-smoked with flag OFF.

## F. PR #218 — temporary integration proof

🧪 **CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY / PASS**.

- Head: `6adb15bcf6897032e84fd58ff01f6ca63573782d`.
- Tests #598 PASS.
- Validated #213 + #214 + #216 + router coexistence.
- Runtime was not weakened; only stale temporary test assumptions were corrected.
- Do not reopen or merge.

## G. PR #191 — Availability owner WhatsApp transport

🟡 **OPEN / UNMERGED / MERGEABLE**.

Separate workstream; does not displace Assistant Active Gate.

- Meta WhatsApp Cloud API.
- Signature verification.
- Exact `phone_number_id`.
- Exact owner sender allowlist.
- Message-id idempotency.
- Existing Availability owner parser.
- Canonical Availability write path.
- Deterministic reply.
- No AI / Finance / Leads coupling.
- Requires real Meta/Cloudflare configuration before smoke.

# Rollout checklist

- [x] Availability Core v1 CLOSED/PASS.
- [x] Lead Core operational workflow merged.
- [x] Lead status audit visibility PR #190 production-smoked PASS.
- [x] Backend architecture consolidated into #213.
- [x] Read-only storage preflight prepared in #214.
- [x] Conditional storage preparation prepared in #216.
- [x] Public widget prepared in #215.
- [x] Temporary combined integration #218 passed and was closed without merge.
- [ ] Docs-only reconciliation merged.
- [ ] Reverify #214 against current main.
- [ ] Merge #214.
- [ ] One authenticated production `GET /api/admin/assistant/preflight`.
- [ ] Interpret actual D1 result.
- [ ] Use #216 only if real preflight requires supported preparation.
- [ ] Reach storage-ready state.
- [ ] Configure runtime with public Assistant flag OFF.
- [ ] Verify `/api/admin/assistant/readiness` one missing item at a time.
- [ ] Rebase/integrate #213 and rerun CI.
- [ ] Merge #213 backend with flag OFF.
- [ ] One backend production smoke with public Assistant OFF.
- [ ] Rebase/integrate #215 and rerun CI.
- [ ] Merge #215 while flag OFF.
- [ ] Explicitly enable `ASSISTANT_PUBLIC_ENABLED=true`.
- [ ] Final Assistant E2E, one manual action at a time.

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

# Source-of-truth boundaries

## Finance

- Google Sheets `REGISTRO` = operations/finance persistence + formulas.
- AppSheet SD.Live Track = mobile/offline workflow.
- Finance Admin = read-only.
- ⛔ Generic Finance Phase 3 write-back remains BLOCKED.
- Assistant has no Finance writes and no Finance reads unless deliberately designed later.

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

After this docs-only reconciliation is merged:

**Reverify PR #214 against current `main`; if still clean, prepare it for squash merge and merge it. Then ask the owner for exactly one manual production action: authenticated `GET /api/admin/assistant/preflight`. Stop and decide the next branch from that real D1 result.**
