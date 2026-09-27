# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured application state, R2 stores managed artifacts/media, Google Sheets remains Finance persistence, AppSheet **SD.Live Track** remains the mobile/offline Finance workflow client, and Cloudflare Access protects Admin.

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

Base before the Documents Active Gate docs:

`f5e0054a84cebf238542cbde08793d995f9059c4` — PR #259.

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
- `Third parties` opens reconciliation, obligations and registered paid-history views when needed.
- representative production smokes for owner-money and the Finance tabs passed.

Canonical management math:

- `ownerGenerated = Valor bruto - Cobro terceros`
- `factor = Valor Recibido / Valor bruto`
- `thirdPartyPayable = Cobro terceros * factor`
- `ownerCashReceived = Valor Recibido - thirdPartyPayable`

### Finance source-of-truth boundary

- General `/admin/finance/` analytics remain read-only.
- **Only approved write exception:** explicit third-party `Marcar pagado` may write only physical `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero` after a fresh server-side read/revalidation.
- No generic Finance write-back.
- No D1 Finance mirror.
- No bidirectional Finance sync.
- Assistant remains isolated from Finance.

## Current Active Gate — SD.Live Documents v1

Canonical implementation contract:

`docs/roadmap/sdlive-documents-v1.md`

The active workstream is a reusable private Admin document registry/generator, not a one-off PDF button.

Initial v1 kinds:

- **Cuenta de cobro · Colombia · ES**
- **Invoice · International · EN**

Key decisions:

- legal issuer v1 = Samuel David Llano Muñoz;
- optional/discreet `sd•live · Creative Audio` visual branding, removable if it is confusing;
- all draft fields editable before finalization;
- final PDF always signed automatically;
- drafts consume no number;
- finalized snapshot/number are immutable;
- Cuenta de cobro switches from historical client-scoped numbering to a new global per-issuer series, intended first real number `21`;
- Invoice continues its existing global series, intended first real number `0019`;
- reissue with PO gets a new number + supersedes relation;
- dedicated private `DOCS_DB` + `DOCS_BUCKET`; no use of public `MEDIA_BUCKET`;
- Documents reads Finance for prefill only and never writes to Sheets in v1;
- future Cotización/Quote kinds reuse the same foundation.

Implementation sequence:

0. docs / Active Gate;
1. storage foundation;
2. domain + atomic numbering;
3. issuer/client profiles + private signature + sequences;
4. draft editor + preview + templates;
5. finalize + signed PDF;
6. Finance read-only prefill/linking;
7. reissue/PO/registry completion;
8. approved legacy import.

Real D1/R2 creation/preparation, real sequence bootstrap and smokes that consume real numbers are explicit production steps, not automatic merge side effects.

## Known non-blocking Finance debt

- Some Google Sheets dashboard helper sections use fixed client filters and can omit newly added clients.
- Sheet monthly graph ranges are fixed to January–March.
- `PENDIENTES` is narrower than total owner receivable and must remain clearly labelled as collection-workflow scope rather than all outstanding money.
- Event-level partial third-party payment history would require an intentional ledger redesign.

## PILA

PILA is a backlog/research candidate only. It is **not** the automatic next milestone while Documents v1 is active.

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
- Finance roadmap reconciliation through PR #259.

## Later candidate workstreams

Documents v1 is selected now. Later candidates include:

- Rental real-time availability + double-booking protection;
- Quote/Cotización kinds on the Documents foundation;
- Mobile Rental Cart total/sticky summary;
- Calendar/Projects workflow additions;
- SD.Live Patch;
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog;
- Finance cleanup/debt;
- PILA estimator research/planning when deliberately selected.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only:

`branch → docs → tests/CI → PR → CI green → squash merge`.

The owner has granted standing authorization to squash-merge in-scope, reviewed, green-CI PRs without a separate per-PR confirmation. This does not authorize silent production resource creation, real sequence bootstrap or other production-sensitive actions.

No production smoke for docs-only PRs. Manual QA with the owner remains one action at a time.

## Exact continuation

**Complete Documents PR 0 (docs/Active Gate), merge after green CI, inspect resulting `main`, then begin PR 1 storage foundation. Before real `DOCS_DB`/`DOCS_BUCKET` bindings are committed or production storage is prepared, obtain the actual Cloudflare resource IDs.**

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/roadmap/sdlive-documents-v1.md` — active Documents implementation contract.
- `docs/roadmap/future-finance-document-generator-2026-08-25.md` — historical precursor, superseded by Documents v1.
- `docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md` — current Finance closeout.
- `docs/roadmap/finance-owner-money-and-third-party-history-2026-09-26.md` — owner-money/history milestone spec/closeout.
- `docs/roadmap/finance-third-party-pila-2026-09-05.md` — historical Finance/PILA planning.
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md` — historical source-of-truth baseline.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled backlog/work order.
