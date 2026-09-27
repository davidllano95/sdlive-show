# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets remains Finance persistence, AppSheet **SD.Live Track** remains the mobile/offline Finance workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older prompts/ideas/references.

**Stability > novelty.** `UNMERGED != PRODUCTION`, and `CI PASS != PRODUCTION SMOKE PASS`.

## Current state — 2026-09-26

GitHub `main` at this handoff:

`45afe5fe05deb96c8c9b5b72b274e7f459f4cd09` — PR #258.

### Finance

Finance owner-money semantics and third-party operations are CLOSED/PASS.

Current behavior:

- Google Sheets remains the Finance source of truth.
- `REGISTRO` stores parent work/payment facts.
- `PAGO_TERCEROS` stores physical third-party obligation/payment facts.
- AppSheet remains the primary mobile/offline Finance workflow.
- owner-facing management analytics use owner-attributable economics rather than counting third-party pass-through as owner revenue.
- full billed and bank-received facts remain separately available for reconciliation/accounting/tax review.
- Finance Admin defaults to `Overview`.
- `Third parties` opens the third-party reconciliation, obligations and registered paid-history views only when needed.
- representative production smokes for owner-money and the Finance tabs passed.

Canonical management math:

- `ownerGenerated = Valor bruto - Cobro terceros`
- `factor = Valor Recibido / Valor bruto`
- `thirdPartyPayable = Cobro terceros * factor`
- `ownerCashReceived = Valor Recibido - thirdPartyPayable`

Displayed percentages may be rounded, but monetary calculations use the full ratio.

### Finance source-of-truth boundary

- General `/admin/finance/` analytics remain read-only.
- **Only approved write exception:** explicit third-party `Marcar pagado` may write only physical `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero` after a fresh server-side read/revalidation.
- No generic Finance write-back.
- No D1 Finance mirror.
- No bidirectional Finance sync.
- Assistant remains isolated from Finance.

### Third-party payment history limitation

The current physical schema stores cumulative `Valor pagado tercero` plus one `Fecha pago tercero` per obligation. The Admin history is therefore a registered cumulative paid fact per obligation, not an event-level log of every partial payment.

### Finance docs

Consolidated closeout:

`docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md`

Owner-money/history roadmap:

`docs/roadmap/finance-owner-money-and-third-party-history-2026-09-26.md`

Historical third-party/PILA planning:

`docs/roadmap/finance-third-party-pila-2026-09-05.md`

## Current Active Gate

**None selected.**

The next step is to review the reconciled backlog and choose one bounded workstream before opening another runtime branch.

PILA is a backlog/research candidate only; it is **not** the automatic next milestone.

## Known non-blocking Finance debt

- Some Google Sheets dashboard helper sections use fixed client filters and can omit newly added clients.
- Sheet monthly graph ranges are fixed to January–March.
- `PENDIENTES` is narrower than total owner receivable and must remain clearly labelled as collection-workflow scope rather than all outstanding money.
- Event-level partial third-party payment history would require an intentional ledger redesign.

## WhatsApp owner control

PR #246 was merged as `4fc02a565317c802c07fed78e6d25bd231eeb70b`, but Meta/Cloudflare onboarding and live owner-number activation are intentionally paused. Do not restart that rollout unless explicitly requested. Old PR #191 remains superseded historical material.

## Other closed/PASS foundations

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/public widget/full production E2E.
- SD.Live Forms Turnstile Siteverify disposition.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.
- Finance general dashboard foundation.
- Finance third-party payment operations through PR #255 + production write smoke.
- Finance owner-money/full-transaction/history through PR #257 + production visual smoke.
- Finance `Overview` / `Third parties` tabs through PR #258 + production visual smoke.

## Candidate future workstreams

No ordering is approved yet:

- Finance cleanup/debt.
- Rental real-time availability + double-booking protection.
- Mobile Rental Cart total/sticky summary.
- Rental quote/PDF automation + shared document-generation foundation.
- Calendar/Projects workflow additions.
- SD.Live Patch.
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.
- PILA estimator research/planning, only if explicitly selected.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → ask owner authorization → squash merge → exactly one representative production smoke`.

Docs-only:

`branch → docs → tests/CI → PR → CI green → ask owner authorization → squash merge`.

No production smoke for docs-only PRs. Manual QA with the owner: **one action at a time**.

## Exact continuation

**Inspect current `main` at/after `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`. Finance owner-money and third-party operations/history/tabs are CLOSED/PASS. Review `PROJECT_STATUS.md` and `ROADMAP_MASTER_CHECKLIST.md`, choose one bounded next workstream with the owner, and only then open a runtime branch. Do not automatically start PILA.**

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md` — current Finance closeout.
- `docs/checkpoints/handoff-finance-third-party-closed-2026-09-26.md` — third-party write-path closeout.
- `docs/roadmap/finance-owner-money-and-third-party-history-2026-09-26.md` — owner-money/history milestone spec and closeout.
- `docs/roadmap/finance-third-party-pila-2026-09-05.md` — historical Finance/PILA planning; not current execution order.
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md` — historical source-of-truth baseline; superseded only where newer handoffs explicitly authorize the narrow J/K fact write.
- `docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md` — final Assistant rollout closeout.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order and backlog.
