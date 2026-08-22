# 14.5 — SD.Live as Control Center

**Reprioritized:** 2026-08-22 — America/Bogota

**Status:** Reprioritized roadmap direction — queued immediately after the current active gate closes; not current runtime work while P3.4 is open.

This initiative supersedes the earlier informal Category D / future-integration framing for CRM, AppSheet integration, Automatic Show Day and Calendar. Existing detail in those sections remains valid; this document defines the required sequence and priority.

## Why this changed

SD.Live is intended to become Samuel's single operational control center, including the freelance finance system currently known as NextPay26 (Google Sheets + AppSheet), rather than remaining only a marketing/CMS site.

That direction must preserve the source-of-truth discipline already established for CMS content, pricing, leads and media. Moving quickly means following the dependency order below, not skipping it.

## Required sequence — do not reorder without explicit re-approval

### 1. Close the current active gate

No Control Center implementation starts before the current active gate closes and its production smoke passes.

Current active gate at the time of this reprioritization: **P3.4 — Responsive image/media delivery pipeline**.

### 2. Security backlog — rate limiting + baseline CSP

Promote the already-documented security backlog before operational/financial-adjacent integration begins.

- [ ] Explicit, verifiable rate limiting for relevant public APIs/forms.
- [ ] Baseline CSP compatible with GTM, Turnstile, R2/media, Workers and current public behavior.
- [ ] Preserve Referrer-Policy / Permissions-Policy follow-up where appropriate.
- [ ] CI + production smoke + rollback plan.

Rationale: the site will begin holding or relaying operational and financial-adjacent data, not only marketing content.

### 3. Full audit of the finance app currently known as NextPay26

Do not limit this audit to previously observed issues. Review the complete system before choosing repair or rewrite.

- [ ] Full data-quality audit beyond known ghost-row / sync issues.
- [ ] Formula correctness review: COP/USD, fees, retentions, invoicing logic, aging and payment state.
- [ ] AppSheet sync reliability and action/bot behavior review.
- [ ] Data-model review: jobs/events, clients, payments, invoice lifecycle and derived fields.
- [ ] Explicit **repair vs full rewrite decision** with written reasoning before implementation.
- [ ] Do not assume repair is automatically cheaper.
- [ ] Do not assume a rewrite is automatically cleaner or safer.
- [ ] If rewrite is selected, define the target architecture and migration/rollback plan before writing integration code.
- [ ] If D1 becomes the new backing store, define how/when Google Sheets ceases to be authoritative rather than creating dual ownership.

### 4. Brand-coherent rename

The current name **NextPay26** must be retired before deeper SD.Live integration so no new integration code or documentation depends on the legacy name.

Evaluate names against the existing SD.Live brand voice, including:

- **SD.Live Ledger**
- **SD.Live Finance**
- **SD.Live Books**

- [ ] Choose the final name deliberately.
- [ ] Apply it consistently to whichever implementation survives step 3: repaired Sheets/AppSheet or rewritten native system.
- [ ] Preserve historical references only where needed for migration/audit context.

### 5. Finance integration Phase 1 — source-of-truth mapping

Before integration code, document a field-by-field ownership table.

Required columns:

| Field / datum | Current owner | Future owner | Sync direction | Read/write scope | Sensitive? | Notes |
|---|---|---|---|---|---|---|
| Example only | TBD | TBD | TBD | TBD | TBD | Must be audited first |

No integration is allowed until the real table is completed for the fields SD.Live may touch.

### 6. Finance integration Phase 2 — read-only, Admin-only insights

First useful integration is read-only and private.

If the existing system is repaired:

- Worker reads the **underlying Google Sheet/API**, not AppSheet as an assumed authoritative API layer.

If rewritten:

- Worker reads the approved native source of truth, e.g. D1.

Admin-only view should surface useful operational insights such as:

- [ ] Pending invoices / accounts receivable.
- [ ] Outstanding retentions / deductions where applicable.
- [ ] COP / USD split.
- [ ] Aging / priority collection signals.
- [ ] Relevant jobs/events if they remain outside the finance table after step 3.

Guardrails:

- `/admin` only.
- Behind the existing Cloudflare Access barrier.
- No public route exposing finance data.
- Read-only in this phase.
- No second financial source of truth.

### 7. Availability-aware contact widget + WhatsApp AI qualification

This is an **independent sub-track**. It may run in parallel with steps 3–6 once the current active gate is closed; it neither blocks nor is blocked by the finance-app audit/integration track.

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
- Steps 1–4 are prerequisites for the finance/control-center track.
- Step 7 is the explicit parallel-track exception after the current active gate closes.
- Repair vs rewrite remains **UNKNOWN until the audit is complete**.

## Explicit non-goals for now

- No public-facing financial data without separate explicit approval.
- No two-way realtime sync in a first version.
- No pre-commitment to Google Sheets/AppSheet as the permanent backing store.
- No pre-commitment to D1 rewrite before the audit.
- No AI quoting or pricing.
- No parallel chatbot-owned lead database.
- No automatic promotion of old backlog items merely because they are related to this initiative.

## Relationship to existing roadmap sections

Existing sections remain valid detail and should not be deleted or recreated:

- **14 — Basic CRM**
- **15 — AppSheet integration**
- **16 — Automatic Show Day Mode**
- **17 — Calendar**

This **14.5 Control Center** initiative owns their sequencing and reprioritization. When P3.4 closes, the root README and `PROJECT_STATUS.md` must point here before the checkpoint is considered fully closed.