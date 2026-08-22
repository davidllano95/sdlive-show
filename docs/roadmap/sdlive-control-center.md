# 14.5 — SD.Live as Control Center

**Reprioritized:** 2026-08-22 — America/Bogota

**Status:** Active sequenced initiative — Steps 1–3 are closed; **Step 4 brand-coherent rename is the current F Active Gate**. Final name selected: **SD.Live Track**. Availability/WhatsApp is eligible as the documented parallel track but is not active automatically.

This initiative supersedes the earlier informal Category D / future-integration framing for CRM, AppSheet integration, Automatic Show Day and Calendar. Existing detail in those sections remains valid; this document defines the required sequence and priority.

## Why this changed

SD.Live is intended to become Samuel's single operational control center, including the freelance finance system historically known as NextPay26 (Google Sheets + AppSheet), rather than remaining only a marketing/CMS site.

That direction must preserve the source-of-truth discipline already established for CMS content, pricing, leads and media. Moving quickly means following the dependency order below, not skipping it.

## Required sequence — do not reorder without explicit re-approval

### 1. Close the current active gate — ✅ CLOSED

P3.4 — Responsive image/media delivery closed on 2026-08-22 with production smoke. Responsive header + R2/CMS delivery is live; final Mobile PageSpeed smoke measured Performance 90 / LCP 3.1 s and ~58 KiB residual `Improve image delivery` savings.

### 2. Security backlog — rate limiting + baseline CSP — ✅ CLOSED

- [x] Explicit, verifiable rate limiting for the two public write endpoints: independent Contact/Rental Worker bindings at 10 requests / 60 seconds.
- [x] Baseline CSP compatible with GTM/GA, Turnstile, R2/media, Google Fonts, Cloudflare Insights, Workers and current public behavior.
- [x] `X-Content-Type-Options`, `SAMEORIGIN`, Referrer-Policy and Permissions-Policy baseline applied without breaking the same-origin Admin preview.
- [x] CI + production smoke completed: Home, `/en/`, Admin/Editor preview, Contact submit/email and Rental submit/email all PASS.

Evidence: PR #53 / `2710c0c0...` (headers/CSP) and PR #54 / `2c0fe574...` (rate limiting).

### 3. Full audit of the finance app historically known as NextPay26 — ✅ CLOSED

**Decision: repair + integrate; do not rewrite from zero.**

Audit evidence is preserved in `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md`.

Verified scope/results:

- [x] 12 Google Sheets tabs and 57 real work records reviewed.
- [x] 11 Actions, 3 Bots, 11 Views and 10 Slices in AppSheet reviewed.
- [x] Critical formulas and collection rules reviewed, including Net Value, COP/USD collection logic and the LiventX workflow.
- [x] Two missing payment dates completed so monthly income summaries reflect them.
- [x] `No Pagados USD` aligned with the COP rule so `Fecha cuenta enviada` is required before counting as outstanding.
- [x] `No Pagados` view Show If simplified to reuse its own Slice rather than duplicate business logic.
- [x] `REGISTRO` range reduced from 21,040 to 3,000 rows.
- [x] Net Value formula improved so blank cells and genuine errors are not silently conflated.
- [x] `HER_PENDIENTES_PIVOT` verified as functioning correctly; no unnecessary repair performed.
- [x] High-risk LiventX rule confirmed already correct: entries do not enter collection until evaluation and signature are both complete.
- [x] Audit found zero P0 data-loss/corruption issues.
- [x] Explicit repair-vs-rewrite decision documented: retain the existing Google Sheets + AppSheet finance system and integrate it incrementally.

Decision rationale:

- Existing business logic already represents real operational edge cases and should not be rediscovered in a rewrite.
- AppSheet's reliable offline field capture remains valuable and expensive to reproduce correctly in a new web application.
- Current volume does not demonstrate a scaling problem requiring a new backing architecture.
- The actual problem to solve is operational fragmentation, not a failed finance architecture.

**Architecture consequence:** AppSheet remains the field/offline capture tool. The first SD.Live integration remains read-only and Admin-only, reading the underlying Google Sheet/API rather than treating AppSheet as a second API/source of truth. This decision does **not** pre-commit Google Sheets as the permanent backing store forever; future ownership changes still require the field-level source-of-truth mapping and a deliberate migration plan.

### 4. Brand-coherent rename — 🚧 F ACTIVE GATE

**Approved final name: SD.Live Track.** Naming decision evidence: `docs/decisions/sdlive-track-name-2026-08-22.md`.

The legacy name **NextPay26** must now be retired from the surviving user-facing Google Sheets + AppSheet implementation before deeper SD.Live integration so new integration code/documentation does not depend on it.

- [x] Final name chosen deliberately: **SD.Live Track**.
- [ ] Apply **SD.Live Track** consistently to the surviving repaired Google Sheets + AppSheet system.
- [ ] Preserve `NextPay26` only where needed for historical audit/migration context.
- [ ] Before changing any technical AppSheet app name/deep-link identifier, identify dependencies such as `LINKTOAPP()` or URL `appName` references; presentation labels may be renamed independently when safe.
- [ ] Do not alter formulas, sheet schema, AppSheet table/column references, actions, slices, views or automation merely to rename presentation branding.
- [ ] Smoke the renamed app: launch, sync, offline-capable capture path, core views/actions and existing bots remain operational.

### 5. Finance integration Phase 1 — source-of-truth mapping

Before integration code, document a field-by-field ownership table.

Required columns:

| Field / datum | Current owner | Future owner | Sync direction | Read/write scope | Sensitive? | Notes |
|---|---|---|---|---|---|---|
| Example only | TBD | TBD | TBD | TBD | TBD | Audit decision is repair + integrate; ownership still must be mapped |

No integration is allowed until the real table is completed for the fields SD.Live may touch.

### 6. Finance integration Phase 2 — read-only, Admin-only insights

First useful integration is read-only and private.

- Worker reads the **underlying Google Sheet/API**, not AppSheet as an assumed authoritative API layer.
- AppSheet continues to handle field/offline capture.
- `/admin` becomes the consolidated consultation/control surface without changing finance write logic in this phase.

Admin-only view should surface useful operational insights such as:

- [ ] Pending invoices / accounts receivable.
- [ ] Outstanding retentions / deductions where applicable.
- [ ] COP / USD split.
- [ ] Aging / priority collection signals.
- [ ] Relevant jobs/events if they remain outside the finance table after source mapping.

Guardrails:

- `/admin` only.
- Behind the existing Cloudflare Access barrier.
- No public route exposing finance data.
- Read-only in this phase.
- No second financial source of truth.

### 7. Availability-aware contact widget + WhatsApp AI qualification

This is an **independent sub-track**. P3.4 and the Security baseline are closed, so it may be promoted to run in parallel with steps 4–6; it neither blocks nor is blocked by the finance integration track. Eligibility does not make it active automatically.

The detailed contract is preserved in `docs/roadmap/availability-aware-contact-widget.md`.

Core contract:

- Server-side availability only; never infer owner availability from the visitor browser timezone.
- Layer 1: expiring manual override via owner WhatsApp command.
- Layer 2: travel mode with timezone + end date.
- Layer 3: default weekly schedule in `America/Bogota`.
- D1 `availability_state` is the single source of truth for this feature.
- `GET /api/availability` returns a minimal read-only availability result and may use a short cache TTL.
- Owner commands require an **exact** match to `env.OWNER_WHATSAPP_NUMBER` before any customer/AI routing.
- AI scope is lead qualification only: event type, date, headcount/scale and contact information.
- AI never receives or invents pricing, presets, rental catalog or financial data.
- AI-captured leads write to the same existing `leads` table as the web contact form.
- Existing WhatsApp bubble is shown when available; AI chat may replace it when unavailable.

### 8. Finance integration Phase 3 — write-back automation

Only after Phase 2 has been validated in real use and finance data quality is trusted:

- [ ] Confirmed `rental_requests` may create a **draft** finance-system row.
- [ ] Write-once / draft-first behavior before bidirectional sync.
- [ ] Idempotency / duplicate protection required.
- [ ] Explicit mapping and rollback required.

### 9. Phase 4 — full control-center dashboard and automation

Explicitly remains backlog until steps 1–8 are complete.

Potential later scope:

- [ ] Full operational dashboard.
- [ ] Bidirectional sync only after trust is established.
- [ ] Automatic Show Day from approved Calendar/AppSheet/project source.
- [ ] Native Admin Calendar.
- [ ] Project / CRM / Rental relationships where source-of-truth is defined.
- [ ] No committed timeline yet.

## Non-negotiable guardrails

- No second source of truth for pricing, leads or financial data.
- Financial data is more sensitive than rental pricing and remains behind Cloudflare Access.
- No public finance route regardless of obscurity or unlinked URL state.
- AI qualification has no access to pricing, rental catalog or finance data.
- Read-only or write-once comes before bidirectional sync.
- "As soon as possible" applies to moving through the sequence, not bypassing prerequisites.
- Steps 1–4 are prerequisites for the finance/control-center integration track.
- Step 7 is the explicit parallel-track exception.
- Repair vs rewrite is **DECIDED: repair + integrate** based on the 2026-08-22 full audit; do not reopen it without new evidence of material architectural failure.
- AppSheet's current offline capture behavior is an asset to preserve unless a future replacement proves equivalent reliability before migration.

## Explicit non-goals for now

- No public-facing financial data without separate explicit approval.
- No two-way realtime sync in a first version.
- No rewrite merely to move the current finance workflow into SD.Live.
- No pre-commitment to Google Sheets/AppSheet as the permanent backing store beyond the current repair/integration path.
- No D1 finance rewrite without a future evidence-based migration decision.
- No AI quoting or pricing.
- No parallel chatbot-owned lead database.
- No automatic promotion of old backlog items merely because they are related to this initiative.

## Relationship to existing roadmap sections

Existing sections remain valid detail and should not be deleted or recreated:

- **14 — Basic CRM**
- **15 — AppSheet integration**
- **16 — Automatic Show Day Mode**
- **17 — Calendar**

This **14.5 Control Center** initiative owns their sequencing and reprioritization. README, `PROJECT_STATUS.md` and the master checklist point here; Step 4 brand-coherent rename remains the active gate until **SD.Live Track** is applied and smoke-tested in the surviving Sheets/AppSheet system.