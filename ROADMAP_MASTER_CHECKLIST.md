# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-27 — America/Bogota**

Current verified GitHub base:

`561cfebbf059568fb028d2a76c28b275eebdbcad` — PR #275, `Documents: polish branding, header and concept layout`.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged; production smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS. CORE IMPLEMENTED != PRODUCTION ENABLED.**

# Current Active Gate — SD.Live Documents v1

🚧 **ACTIVE.**

Canonical contract:

`docs/roadmap/sdlive-documents-v1.md`

Initial document kinds:

1. Cuenta de cobro · Colombia · ES (`cc-co-es`)
2. Invoice · International · EN (`invoice-intl-en`)

Future Quote/Cotización kinds reuse the same engine but are not part of the immediate MVP.

## Current implementation state through PR #275

### ✅ Completed / merged foundations

- [x] PR #260 — Documents Active Gate docs/contract.
- [x] PR #262 — dedicated Documents storage foundation (`DOCS_DB`, private `DOCS_BUCKET`, schema, immutability triggers, preflight/preparation, test sequences only).
- [x] PR #263 — domain/finalization core: kind registry, integer minor-unit math, Spanish amount-in-words, canonical JSON/SHA-256 snapshot, sequence CAS, draft revision guard, finalize idempotency, supersedes relation and audited sequence bootstrap primitive.
- [x] PR #264 — issuer/client profiles, private signature infrastructure/settings, numbering safety display and test-sequence verification.
- [x] PR #265 — draft CRUD, registry/editor, autosave, document-local overrides, preview API and draft renderers for Cuenta de Cobro + Invoice.
- [x] PR #266 — Documents Admin brand/navigation integration.
- [x] PR #267 — profile/settings hardening after production smoke.
- [x] PR #268 — issuer/client/draft cleanup UX and protected deletion rules.
- [x] PR #269 — editor/renderer polish, bank detail presentation, issue city/date, PO/reference, due date, terms/notes, line item controls.
- [x] PR #270 — optional quantity/unit, date ranges and Invoice original-expense metadata preservation.
- [x] PR #271 — Cuenta de Cobro line-layout/no-date UX.
- [x] PR #272 — simple concept mode for unstructured Cuenta de Cobro cases.
- [x] PR #273 — explicit Itemize toggle + General rate / total.
- [x] PR #274 — concept preservation/rendering in non-itemized mode.
- [x] PR #275 — current document typography/branding/header/signature/footer polish and per-document SD•Live logo toggle.

### Important distinction

The domain storage layer already contains a `finalizeDocument()` core with:

- server-side draft read;
- draft revision conflict guard;
- sequence issuer/type validation;
- atomic sequence CAS + draft finalization batch;
- immutable snapshot hash storage;
- `finalizeKey` idempotency;
- source rows/events;
- supersedes behavior;
- `pdf_status=pending` after finalization;
- retry semantics that never release a consumed number.

That core is **not yet the same thing as production-enabled Finalize**. There is still no approved Admin Finalize surface consuming real series.

## Current UX/product capabilities

### Cuenta de Cobro

Supports both simple and detailed drafts.

Simple/non-itemized mode can show one or many editable concepts plus a single `General rate / total`, without forcing quantity, unit, dates, line PO, per-line rate or per-line totals.

Itemized mode can use:

- quantity (optional; zero/blank means not applicable);
- unit (optional);
- date/date range;
- PO/reference per line;
- line type;
- rate and totals.

### Invoice

Remains itemized and supports:

- professional services;
- expenses/reimbursements;
- mixed line kinds;
- quantity/unit/rate;
- date/date range;
- PO/reference;
- original currency/original amount metadata for expenses;
- USD totals;
- bank details toggle.

### Draft preview guarantees

- draft watermark (`BORRADOR` / `DRAFT`);
- number remains unset (`—` / no definitive number);
- no real signature bytes are read into the draft preview;
- draft edits do not mutate issuer/client profiles or Finance;
- Draft and Final are intended to share the canonical renderer path rather than diverging visually.

## 🚧 Pending production work

### 1. Production visual verification after PR #275

Before enabling irreversible Finalize, verify representative cases in authenticated production:

- CC simple;
- CC non-itemized with multiple concepts;
- CC detailed/itemized;
- Invoice with services + expenses;
- blank visual brand;
- SD.Live branding without logo;
- SD•Live logo enabled;
- bank details on/off.

GitHub CI for current `main` is green, but authenticated production rendering/deployment must be verified separately; GitHub CI alone does not prove the Cloudflare deployment or the visual smoke.

### 2. Irreversible Finalize production gate

Still required:

- Admin Finalize endpoint/route;
- authorization/fail-closed checks;
- confirmation UX;
- explicit prospective-number preview without consumption;
- exact draftRev/finalizeKey contract at the API boundary;
- fail/retry behavior visible to the user;
- audit metadata surfaced appropriately;
- double-submit/network retry protection;
- no number reuse under any failure path;
- finalized registry/view behavior.

### 3. Real sequence bootstrap

Real series are **not to be created as a deploy side effect**.

Planned values, subject to explicit verification/authorization:

- `samuel:CC` → proposed next number `21`;
- `samuel:INV` → proposed next number `19` (displayed `0019`).

Before bootstrap:

- verify no conflicting issued numbers exist;
- verify current sequence state from dedicated Documents storage;
- use the audited explicit bootstrap primitive;
- bootstrap may raise but never lower a sequence;
- never infer sequence state by parsing display strings.

### 4. Real signature validation

The private signature architecture exists. Before final artifact generation:

- verify whether the real issuer already has an active signature asset;
- if absent, upload only to private `DOCS_BUCKET` with metadata/hash in D1;
- never expose a public URL, R2 key or signature bytes in ordinary settings/read APIs;
- finalization must apply the signature automatically; no download → sign → upload workflow.

### 5. Signed PDF pipeline

After Finalize/numbering gate is reviewed:

- add `BROWSER` only when PDF work actually starts;
- render final HTML from the frozen snapshot using the canonical renderer;
- inject the active private signature;
- generate the PDF;
- persist final artifact privately;
- persist artifact hash/status;
- expose authenticated Admin download;
- if PDF fails after number reservation, keep the finalized document and number, set/retain a pending/failed artifact state and retry later from the frozen snapshot.

### 6. Final registry lifecycle

Add complete UX for:

- Draft;
- Finalized / Generated;
- Void;
- supersedes/superseded-by relationships;
- download/history/events;
- client history.

Future workflow metadata may include Sent/Paid, but Finance remains the payment source of truth.

### 7. Void / Reissue

Void:

- never deletes the record/artifact;
- never releases/reuses the number;
- requires durable reason/audit context.

Reissue:

- creates a new draft/document;
- receives a new number on finalization;
- receives a new snapshot;
- records `supersedes`;
- preserves the previous issued document;
- does not use the legacy `.5` convention for new Documents records.

### 8. Finance read-only integration

Not part of the immediate Finalize/PDF gate, but still planned:

- prefill from `REGISTRO` only;
- billed amount default = `Valor bruto`;
- no Google Sheets/AppSheet writes from Documents;
- no D1 Finance mirror;
- no automatic mutation of issued snapshots when Finance later changes.

### 9. Legal/accounting review

Before relying on Colombian tax/retention wording as authoritative production copy:

- review relevant wording with an accountant/legal professional;
- template-version legal declarations rather than silently mutating old documents;
- do not present Cuenta de Cobro as DIAN electronic invoicing;
- international Invoice is a commercial international document, not Colombian electronic invoicing.

### 10. Later / not immediate

- Quote/Cotización kinds;
- approved historical import;
- automatic Sent/Paid integration;
- deep Finance writeback;
- rental document automation;
- additional issuers/jurisdictions.

# Finance — owner money + third-party milestone

✅ **CLOSED / PASS.**

Current durable behavior:

- Google Sheets remains Finance persistence.
- `REGISTRO` is the parent work/payment table.
- `PAGO_TERCEROS` is the physical third-party obligation/payment ledger.
- AppSheet SD.Live Track remains the primary mobile/offline workflow.
- owner-facing management analytics use owner-attributable economics.
- full billed/bank-received facts remain separately available for reconciliation/accounting/tax review.
- general Finance Admin remains read-only except for the already-approved narrow third-party `Marcar pagado` J/K write after fresh validation.
- no generic Finance write-back, no D1 Finance mirror and no bidirectional Finance sync.

Known Finance debt remains backlog and does not block Documents.

# PILA estimator

⏳ **BACKLOG / RESEARCH CANDIDATE ONLY.**

PILA is not the current gate. Research current Colombian legal/operational rules again if/when selected.

# WhatsApp owner control

🟢 **CODE MERGED / ROLLOUT PAUSED.**

PR #246 is merged; Meta/Cloudflare live owner-number rollout remains intentionally paused unless explicitly reopened.

# Later backlog after Documents

- Rental real-time availability + double-booking protection.
- Quote/Cotización kinds on the Documents foundation.
- Mobile Rental Cart total/sticky summary.
- Calendar/Projects workflow additions.
- SD.Live Patch.
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS backlog.
- Finance cleanup/debt.
- PILA estimator research/planning when deliberately selected.

# Source-of-truth boundaries

## Documents

- Documents is not a Finance persistence layer.
- `DOCS_DB` stores Documents profiles/sequences/drafts/snapshots/audit state only.
- `DOCS_BUCKET` stores private signature/PDF/legacy artifacts only.
- issued document numbers/snapshots are immutable.
- draft edits never mutate Finance facts automatically.
- Documents prefill from REGISTRO is read-only.
- public `MEDIA_BUCKET` is prohibited for signature and issued PDFs.

## Finance

- Google Sheets = Finance persistence.
- AppSheet = primary mobile/offline Finance workflow.
- generic Finance write-back remains blocked.

# Non-negotiable workflow for the current continuation

1. Inspect current `main` and recent PRs before changing anything.
2. Use one short branch per coherent change.
3. Implement/update.
4. Run tests and wait for CI.
5. Open a PR.
6. Explain scope/results.
7. **Do not merge until the owner gives explicit authorization for that PR.**
8. When authorized, squash merge.
9. Run one representative production smoke for runtime changes when appropriate.
10. Never silently perform real sequence bootstrap, real document finalization, production SQL, private-signature exposure, paid Cloudflare upgrades or irreversible production resource changes.

# Exact continuation

**First reconcile stale Documents docs/status against current `main` through PR #275. After that docs-only PR is green and explicitly approved/merged, the next concrete runtime milestone is the Finalize production gate: expose the existing finalization core through a bounded Admin API + confirmation UX using test series only, without bootstrapping real `samuel:CC` / `samuel:INV` and without adding PDF/BROWSER in the same PR unless the reviewed scope explicitly expands.**
