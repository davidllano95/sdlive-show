# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. GitHub `main` + comportamiento verificado en producción prevalecen sobre cualquier documento.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-27 — America/Bogota** |
| GitHub `main` verificado | **`561cfebbf059568fb028d2a76c28b275eebdbcad` · PR #275** |
| Producción | `https://sdlive.show` |
| Active Gate | **SD.Live Documents v1 — Finalize production gate pending** |
| Documents current code | **Storage + domain/finalize core + profiles/signature + draft/editor/preview + visual system merged through #275** |
| Documents irreversible state | **Real Finalize/real sequences/PDF NOT production-enabled** |
| PILA | **Backlog / research candidate** |
| WhatsApp owner control | **PR #246 merged; rollout intentionally paused** |
| Bloqueado | **Generic Finance write-back / D1 Finance mirror / bidirectional sync** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. checkpoint/handoff fechado más reciente;
4. este archivo;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. docs/prompts históricos.

**Stability > novelty. `MERGED != PRODUCTION VERIFIED`. `CORE IMPLEMENTED != PRODUCTION ENABLED`.**

## Workflow obligatorio para la continuación actual

Runtime:

`inspect current main → short branch → implement → tests/CI → PR → CI green → explain result → explicit owner authorization → squash merge → one representative production smoke when applicable`

Docs-only:

`inspect → branch → docs → CI → PR → CI green → explain result → explicit owner authorization → squash merge`

No hacer merge de un PR nuevo sin autorización explícita del owner, aunque CI esté verde.

Acciones productivas sensibles siguen requiriendo autorización separada y explícita:

- real sequence bootstrap;
- real document finalization/issuance;
- manual production SQL;
- private signature exposure/publication;
- paid Cloudflare changes;
- irreversible production-resource changes.

# Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = Admin boundary.
- Google Sheets = Finance persistence.
- `REGISTRO` = parent work/payment table.
- `PAGO_TERCEROS` = physical third-party obligation/payment ledger.
- AppSheet SD.Live Track = primary mobile/offline Finance workflow.
- D1 is not a Finance mirror.
- General Finance Admin remains read-only except the already-approved narrow third-party payment fact write.
- Documents never writes to Sheets/AppSheet in v1.
- Documents uses dedicated `DOCS_DB` + private `DOCS_BUCKET`.
- Signature/final PDFs never use public `MEDIA_BUCKET`.
- Finalized snapshots/numbers are immutable.
- Drafts never consume official numbers.
- Public traffic must never migrate D1 schema.

# Current Active Gate — SD.Live Documents v1

Canonical implementation contract:

`docs/roadmap/sdlive-documents-v1.md`

## Product goal

Private Admin registry/generator for:

- `cc-co-es` — Cuenta de cobro · Colombia · Español;
- `invoice-intl-en` — Invoice · International · English.

Target lifecycle:

`Draft → Preview → Finalize → atomic number + snapshot → signed PDF → registry`

Future Quote/Cotización kinds reuse the same foundation but are not part of the immediate MVP.

## Documents current implementation — merged through PR #275

### ✅ Storage foundation — PR #262

- dedicated Documents D1/R2;
- schema + immutability triggers;
- preflight + explicit preparation;
- test sequences only;
- Admin/Auth boundary.

### ✅ Domain/finalization core — PR #263

- kind registry;
- integer money math;
- Spanish amount-in-words;
- canonical JSON/SHA-256 snapshot;
- `sdlive.document.snapshot/1`;
- sequence CAS;
- draft revision guard;
- idempotent `finalizeKey`;
- supersedes relation;
- audited sequence bootstrap primitive;
- `pdf_status=pending` after finalize.

**Important:** the internal `finalizeDocument()` core exists, but there is no approved production Admin Finalize surface yet.

### ✅ Profiles + private signature settings — PR #264

- issuer/client profile CRUD;
- private signature upload/history metadata;
- Settings workspace;
- numbering safety/test sequence verification.

### ✅ Draft editor + preview — PR #265

- draft CRUD;
- registry/editor;
- autosave + `draftRev`;
- document-local issuer/client overrides;
- line items;
- draft renderers for CC/Invoice;
- sandboxed preview;
- watermark/no-number/no-real-signature guarantees.

### ✅ Admin/Settings/editor hardening — PRs #266–#268

- shared Admin visual/navigation system;
- profile active/default/bank/address hardening;
- issuer/client/draft cleanup UX with deletion guards.

### ✅ Document/editor behavior — PRs #269–#275

- ordered localized bank details;
- issue city/date;
- PO/reference, due date, terms, notes;
- quantity/unit/rate/line totals;
- optional quantity/unit;
- date ranges + explicit no-date control;
- Invoice original-expense metadata;
- CC simple concept mode;
- CC Itemize toggle + General rate / total;
- non-itemized multi-concept mode;
- standardized document typography;
- blank visual brand behavior;
- per-document SD•Live logo toggle;
- SD•Live / Creative Audio document wordmark/rule;
- signature/footer/header/concept metadata polish.

Product name remains **SD.Live**; `SD•Live` is a visual wordmark treatment in documents where enabled.

# Documents behavior now

## Cuenta de Cobro

Supports simple and detailed cases.

Non-itemized:

- one or many editable concepts;
- single General rate / total;
- no forced qty/unit/date/line-PO/rate/per-line totals.

Itemized may include:

- quantity;
- unit;
- line type;
- date/date range;
- line PO/reference;
- rate and line totals.

## Invoice

Remains itemized and supports services, expenses/reimbursements, mixed line kinds, quantity/unit/rate, dates/ranges, PO/ref, original-currency metadata and bank-detail toggle.

# What remains pending

## 1. Production visual verification after #275

GitHub Actions for current `main` is green. This does not by itself prove latest authenticated Cloudflare deployment/rendering.

Before irreversible Finalize, verify representative production cases:

- CC simple;
- CC non-itemized multiple concepts;
- CC detailed;
- Invoice services + expenses;
- blank visual brand;
- branding without logo;
- branding with logo;
- bank details on/off.

## 2. Finalize production gate

Next bounded runtime milestone:

- authenticated Admin Finalize endpoint;
- confirmation UX with prospective number;
- exact `draftRev` guard;
- per-confirmation `finalizeKey`;
- server-side profile/signature/issuer/type/status validation;
- call existing `finalizeDocument()` core;
- user-visible retry/conflict handling;
- transition registry/editor to Finalized;
- tests for double-click/network retry/no double-number consumption;
- test-series-only smoke.

Do not duplicate/rewrite the existing numbering core.

## 3. Real series

Planned values only, pending storage verification + explicit owner authorization:

- `samuel:CC` next proposed = `21`;
- `samuel:INV` next proposed = integer `19`, display `0019`.

No real bootstrap as deploy side effect.

## 4. Real signature validation

Verify active real signature metadata privately. If absent, upload only to private R2. Never expose bytes/private key/public URL.

## 5. Signed PDF

After Finalize gate:

- add `BROWSER` only when implementing PDF;
- render frozen snapshot through canonical renderer;
- inject private signature automatically;
- generate/store private PDF;
- persist artifact hash/status;
- authenticated download;
- PDF failure never releases number; retry from snapshot.

## 6. Registry lifecycle

Pending full UX for:

- Finalized / Generated;
- Void;
- supersedes/superseded-by;
- Reissue;
- download/events/history/client history.

Future Sent/Paid must not create a parallel payment ledger.

## 7. Finance read-only integration

Future prefill may read REGISTRO and default billed amount from `Valor bruto`, but Documents performs zero Sheets/AppSheet writes.

## 8. Legal/accounting review

Template-version Colombian retention/tax wording and review with accountant/legal professional before treating it as authoritative. Do not present Documents as DIAN electronic invoicing.

# Finance owner-money + third-party operations — CLOSED / PASS

Durable status:

- Sheets remains Finance source of truth;
- AppSheet remains primary mobile/offline workflow;
- owner-money management semantics are separated from full transaction facts;
- third-party payment operations/history are production-verified;
- general Finance Admin stays read-only except the narrow approved payment fact write;
- generic Finance write-back / D1 mirror / bidirectional sync remain blocked.

Known Finance cleanup/debt remains backlog and does not block Documents.

# PILA — backlog only

Not the selected next gate. Re-research current Colombian rules if explicitly selected later.

# WhatsApp owner control — rollout paused

PR #246 merged, but live Meta/Cloudflare activation remains intentionally paused.

# Closed modules — do not reopen without regression evidence

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/widget/full E2E rollout.
- Forms Turnstile disposition.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.
- Finance dashboard/third-party/owner-money milestones through PR #259.

# Later backlog after Documents

- Rental real-time availability / double-booking protection.
- Quote/Cotización kinds on Documents.
- Mobile Rental Cart total/sticky summary.
- Calendar/Projects additions.
- SD.Live Patch.
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.
- Finance cleanup/debt.
- PILA estimator research/planning when deliberately selected.

# Exact continuation point

**The current docs-reconciliation branch must update roadmap/status to match `main` through PR #275, run CI and open a docs-only PR. Do not merge that PR until the owner explicitly authorizes it. After merge/reconfirmation of `main`, the next runtime gate is Finalize Admin API + confirmation UX using test series only, reusing the existing finalization core. Real series bootstrap, real issuance and PDF/BROWSER remain separate later gates.**
