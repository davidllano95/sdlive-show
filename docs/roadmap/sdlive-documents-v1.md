# SD.Live Documents v1 — Implementation contract

**Status:** ACTIVE GATE — TEST document lifecycle operational; real-series production gate pending.  
**Reconciled runtime baseline:** PR #295 / `32f371277f8ba7911c98494a5ea08767303f2a24`.  
**Approved template baselines:** `cc-co-es@1`, `invoice-intl-en@1`.

This file is the canonical roadmap/implementation contract for SD.Live Documents v1. For architecture, maintenance, visual contracts and future-change procedure, read:

`docs/operations/documents-v1-maintenance.md`

Current GitHub `main` + verified production behavior outrank documentation if a discrepancy is found.

---

## 0. Guardrails

1. Inspect current `main` before every Documents gate.
2. Use a short branch before any write.
3. Documents never writes to Google Sheets/AppSheet in v1.
4. No D1 Finance mirror.
5. Signature and final PDF artifacts stay in private Documents storage.
6. Drafts never consume official numbers.
7. Finalized snapshots/numbers are immutable.
8. PDF failure never releases a number.
9. Missing Documents resources fail closed.
10. Real sequence bootstrap / real issuance are explicit production actions, never deploy side effects.
11. Approved v1 template renderers are historical artifact contracts; output-affecting changes require a new template version.

---

## 1. Product goal

`/admin/documents/` is a reusable private registry/generator for professional documents.

Initial kinds:

| kind_id | type | market | language | approved template |
|---|---|---|---|---|
| `cc-co-es` | Cuenta de Cobro | CO | es | `cc-co-es@1` |
| `invoice-intl-en` | Invoice | INTL | en | `invoice-intl-en@1` |

Lifecycle:

`Draft → Preview → Finalize → atomic number + immutable snapshot → signed private PDF → registry`

Correction lifecycle:

`Issued → correction draft → -B / -C / ... → immutable replacement document`

Future Quote/Cotización kinds may reuse the foundation, but are outside the immediate v1 production gate.

---

## 2. Source-of-truth boundaries

### Finance

- Google Sheets remains Finance persistence.
- AppSheet SD.Live Track remains primary mobile/offline Finance workflow.
- Documents may eventually read Finance context for prefill only.
- Documents never writes document edits/status back into Finance in v1.

### Documents

Dedicated resources:

- D1: `DOCS_DB`;
- private R2: `DOCS_BUCKET`;
- Browser Rendering: `BROWSER`;
- static asset access when needed: `ASSETS`.

Never expose signature bytes/private R2 keys/public artifact URLs through settings/read APIs.

---

## 3. Approved numbering model

### TEST

- `test:CC`
- `test:INV`

Current Finalize, PDF and correction/revision runtime paths are restricted to TEST series.

### Planned real series

- `samuel:CC` — proposed next base number `21`.
- `samuel:INV` — proposed next base integer `19`, intended display `0019`.

These are planning values only until read-only production storage verification + explicit owner authorization.

### Important pre-production display-pattern audit

The approved v1 templates render the labels themselves:

- `Cuenta de Cobro No. <display number>`
- `Invoice No. <display number>`

The currently planned `SAMUEL_SEQUENCE_BOOTSTRAP.displayPattern` values still contain `CUENTA DE COBRO No.` / `Invoice No.`. Resolve that contract before bootstrap so real documents cannot render duplicated labels.

Do not fix this by parsing formatted text later. The stored display-number contract should be correct at the sequence layer.

---

## 4. Draft / Preview — COMPLETE

Implemented:

- draft CRUD;
- `draftRev` optimistic concurrency;
- issuer/client profile selection + local overrides;
- line items and document metadata;
- CC simple/non-itemized/itemized modes;
- Invoice itemized services/expenses;
- optional quantity/unit/date/ranges/PO/ref;
- original-expense currency + FX metadata;
- bank censor toggle;
- sandboxed preview;
- draft watermark/no-number/no-real-signature guarantees.

UX contract:

- opening a Draft prioritizes Preview first;
- opening New Draft clears any previous issued/PDF panel state.

---

## 5. Finalize TEST gate — COMPLETE

Implemented:

- authenticated Admin Finalize preview/confirmation;
- prospective number without pre-consumption;
- exact `draftRev` requirement;
- client-generated UUID `finalizeKey`;
- server-side kind/issuer/client/signature/series validation;
- atomic sequence CAS;
- immutable snapshot JSON + SHA-256 + template version;
- idempotent retry;
- `pdf_status=pending` after Finalize.

Standard finalize must reuse the existing storage/domain primitive rather than duplicate numbering logic in UI/API code.

---

## 6. Signed private PDF — COMPLETE FOR TEST

Implemented:

- frozen snapshot → canonical renderer;
- snapshot hash verification;
- exact snapshot template-version dispatch;
- private signature retrieval + hash verification;
- Browser Rendering PDF;
- Letter/CSS page geometry;
- content-addressed private R2 artifact;
- PDF SHA-256 persistence;
- `pending / ready / failed` state;
- safe Retry PDF from frozen snapshot;
- authenticated inline PDF retrieval;
- explicit download UI;
- number remains consumed on PDF failure.

Issued UI contract:

- selecting Finalized/Void opens PDF/status-first;
- draft editor does not appear first;
- issued snapshot is presented as immutable.

---

## 7. Correction / revision model — COMPLETE FOR TEST

Decision:

Issued documents are never edited in place.

A requested client change creates a new correction draft and, when finalized, a revision of the same base number.

Display convention:

- original: no suffix (implicit A);
- first correction: `-B`;
- second correction: `-C`;
- etc.

Required invariants implemented:

- source issued document remains immutable;
- `supersedes_id` / `superseded_by_id` chain;
- only latest unsuperseded issued document can create the next correction;
- only one open correction draft per source;
- dedicated revision sequence/counter;
- correction does not consume next base number;
- finalize remains snapshot/PDF based.

Verified Invoice smoke:

`TEST-INV 0004 → TEST-INV 0004-B → TEST-INV 0004-C`

while next independent invoice was:

`TEST-INV 0005`

Remaining TEST validation: repeat the same chain/invariant for Cuenta de Cobro.

---

## 8. Approved visual v1 — COMPLETE

### Shared family

Both templates use:

- Letter page;
- 30pt title scale;
- shared sans/mono typography;
- violet accent system;
- compatible spacing/rhythm;
- shared lower payment/signature two-column geometry;
- 108px applied signature image;
- bottom-anchored footer.

### Cuenta de Cobro `cc-co-es@1`

Approved distinct structure:

- `Cuenta de Cobro No. <display number>`;
- bordered rounded `La empresa` card;
- bordered rounded `Debe a` card;
- light violet-tinted rounded `La suma de` card;
- `Por concepto de`;
- simple/non-itemized/itemized functionality preserved;
- Colombian retention certification preserved;
- Spanish bank labels;
- richer issuer facts below signature.

### Invoice `invoice-intl-en@1`

Approved distinct structure:

- `Invoice No. <display number>`;
- issuer + Bill to / Engagement structure;
- `DESCRIPTION / QTY / UNIT / RATE / AMOUNT`;
- Professional services + Expenses & reimbursements grouping;
- original expense + `1 USD = x original currency` FX presentation;
- clean Total due without old black rule/box;
- Payment Information + signature at page bottom.

### Template-version rule

From this checkpoint forward, output-affecting changes require a new renderer/version (`@2`, etc.). Preserve `@1` for historical PDF retry/regeneration.

---

## 9. Current production gate — NEXT

### 9.1 Final Cuenta de Cobro TEST revision smoke

Verify:

`TEST-CC n → TEST-CC n-B → TEST-CC n-C`

and confirm next independent CC remains `n+1`.

### 9.2 Read-only real-series preflight

Before any real bootstrap:

1. inspect `DOCS_DB` sequence state;
2. verify proposed next CC `21`;
3. verify proposed next Invoice integer `19` / intended display `0019`;
4. reconcile real `displayPattern` with v1 template labels;
5. verify active real signature metadata/private object;
6. verify no collision with issued rows;
7. present exact bootstrap actions to owner.

### 9.3 Explicit owner authorization

Only after preflight, request authorization for:

- real `samuel:CC` bootstrap;
- real `samuel:INV` bootstrap;
- first real number-consuming smoke.

### 9.4 First real controlled smoke

Issue:

- one real Cuenta de Cobro;
- one real Invoice.

Verify:

- base number;
- display number;
- immutable snapshot;
- correct template version;
- signature;
- private PDF;
- inline viewer/download;
- registry status/events.

Do not bulk-issue documents in the first smoke.

---

## 10. Real correction enablement — SEPARATE GATE

Current correction/revision modules fail closed on real series.

After real base issuance is proven, separately review whether to enable:

`real document → -B → -C`

The real gate must preserve all TEST invariants and must not alter the base sequence.

---

## 11. Remaining lifecycle backlog after real issuance

- Void UX/reason/history polish;
- visible supersedes/superseded-by chain;
- event/history view;
- client document history;
- optional Sent/Paid presentation only if it does not become a parallel Finance ledger;
- Finance read-only prefill;
- Quote/Cotización kinds later.

---

## 12. Legal/accounting note

Cuenta de Cobro retention wording is template-versioned (`co-ret@2026-1`) and should be reviewed with an accountant/legal professional before being treated as authoritative for every future tax scenario.

Do not describe this module as DIAN electronic invoicing.

---

## 13. Exact continuation point

**Visual/document template v1 is approved through PR #295. Complete the Cuenta de Cobro TEST revision smoke. Then perform a read-only real-series/signature preflight, including correction of the planned real display-number patterns before bootstrap. Real series creation, real issuance and real correction enablement remain explicit owner-authorized production gates. Read `docs/operations/documents-v1-maintenance.md` before any future Documents change.**
