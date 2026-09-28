# SD.Live Documents v1 — Maintenance, architecture and handoff guide

**Status:** CANONICAL MAINTENANCE GUIDE  
**Baseline approved:** 2026-09-27 / 2026-09-28 — through PR #295  
**Approved template baselines:** `cc-co-es@1` and `invoice-intl-en@1`  
**Scope:** SD.Live Admin Documents (`/admin/documents/`)  

> This document exists so future work on Documents can resume without reconstructing the architecture from chat history. Read this before changing document rendering, numbering, finalization, revisions, signatures, PDFs, registry behavior or production series.
>
> **Precedence:** current GitHub `main` + verified production behavior > this guide > older roadmap/checkpoint text. If code and this document disagree, inspect the code first and update this guide in the same change.

---

## 1. What “v1 approved” means

The following visual templates are now the accepted SD.Live Documents v1 baseline:

| kind | template version | status |
|---|---|---|
| Cuenta de Cobro · Colombia · Español | `cc-co-es@1` | **V1 APPROVED** |
| Invoice · International · English | `invoice-intl-en@1` | **V1 APPROVED** |

Both are Letter (`8.5 × 11 in`) documents and share the same SD.Live document family: typography, spacing rhythm, violet accents, lower-page payment/signature geometry and footer placement. They are intentionally **siblings, not clones**.

### Versioning rule from this checkpoint forward

`@1` is a frozen artifact contract.

Do **not** casually change the visual or semantic output of `cc-co-es@1` or `invoice-intl-en@1` after this checkpoint. Finalized snapshots store the template version, and PDF retry/regeneration resolves that exact version. Mutating an old renderer can therefore cause a frozen historical snapshot to produce a visually different PDF later.

For a future output-affecting change:

1. preserve the existing `.v1.js` renderer;
2. create a new renderer/version (`@2`, with a corresponding file such as `cc-co-es.v2.js`);
3. update the kind/version selection only for newly finalized documents;
4. keep the PDF renderer able to resolve historical `@1` snapshots;
5. add regression tests proving both old and new versions render;
6. never rewrite already-finalized snapshots to the new template version.

A code-only fix that provably does not alter historical artifact output may stay within the same version, but this should be the exception and should be called out explicitly in the PR.

---

## 2. Product boundary

SD.Live Documents is a private Admin document generator/registry. It is **not**:

- DIAN electronic invoicing;
- a replacement for Finance persistence;
- a parallel Accounts Receivable ledger;
- a Google Sheets/AppSheet write-back surface.

Initial document kinds:

- `cc-co-es` → Cuenta de Cobro, Colombia, Spanish;
- `invoice-intl-en` → commercial international Invoice, English.

Canonical lifecycle:

`Draft → Preview → Finalize → immutable snapshot + number → signed PDF → registry`

Corrections extend that lifecycle without mutating issued documents:

`Issued A (implicit) → correction draft → Issued -B → correction draft → Issued -C ...`

---

## 3. Infrastructure and security boundaries

### Runtime resources

- `DOCS_DB` — dedicated Documents D1 database.
- `DOCS_BUCKET` — private R2 bucket for signatures and final PDFs.
- `BROWSER` — Cloudflare Browser Rendering binding used for PDF generation.
- `ASSETS` — used when an SD.Live logo asset must be inlined into final HTML before PDF rendering.
- Cloudflare Access / Admin auth — security boundary for `/admin/documents/` and `/api/admin/documents/*`.

### Hard security invariants

- Signature bytes never go to the public media bucket.
- Final PDFs never go to the public media bucket.
- No public R2 key or public signature URL is exposed.
- Draft preview never receives usable signature bytes.
- Missing required Documents bindings fail closed.
- Finalized snapshots are immutable.
- Issued numbers are never released/reused because of Void or PDF failure.
- Public traffic must never run D1 schema migrations.
- Documents v1 performs no Finance writes.

---

## 4. Core file map

### Domain / storage / kinds

- `documents-kinds.js`
  - kind registry;
  - template version;
  - Letter page size;
  - default real series keys;
  - planned Samuel bootstrap values.
- `documents-domain.js`
  - money/line normalization;
  - Spanish amount in words;
  - snapshot construction;
  - canonical JSON and snapshot schema `sdlive.document.snapshot/1`;
  - finalization validation.
- `documents-storage.js`
  - document persistence;
  - draft/finalized state;
  - atomic sequence CAS;
  - immutable snapshot storage;
  - `finalizeKey` idempotency;
  - events and supersedes relationships.

### Finalize / corrections / revisions

- `documents-finalize-gate.js`
  - current TEST-series finalize gate;
  - exact `draftRev` requirement;
  - prospective-number preview;
  - UUID `finalizeKey` validation;
  - correction-aware finalization routing.
- `documents-corrections.js`
  - creates correction drafts from issued documents;
  - only the latest unsuperseded issued document may be corrected;
  - one open correction draft per source;
  - TEST-only at the current checkpoint.
- `documents-revisions.js`
  - revision sequence/counter;
  - suffix generation (`-B`, `-C`, ...);
  - revision snapshot number context;
  - atomic revision finalization;
  - revision counter is independent from base document numbering.

### Templates / PDFs

- `documents-templates/shared.js`
  - shared document CSS/helpers.
- `documents-templates/cc-co-es.v1.js`
  - **approved Cuenta de Cobro v1 renderer**.
- `documents-templates/invoice-intl-en.v1.js`
  - **approved Invoice v1 renderer**.
- `documents-pdf-artifacts.js`
  - maps immutable snapshots back to renderer views;
  - validates snapshot hash;
  - reads private signature bytes;
  - renders via `BROWSER.quickAction("pdf")`;
  - stores content-addressed private PDF;
  - verifies artifact hash on read;
  - exposes authenticated inline PDF response.

### Admin UI

- `admin/documents/editor.js`
  - base draft editor and registry behavior.
- `admin/documents/management.js`
  - management/settings behavior.
- `admin/documents/pdf-artifact-ux.js`
  - draft preview-first layout;
  - issued-document panel;
  - inline PDF viewer;
  - Retry PDF;
  - prevents finalized documents from opening in the draft editor;
  - cleans legacy FX UI.
- Documents correction/revision UX files should be reviewed together with the files above whenever correction behavior changes.

### Worker/API mounting

- `admin-stabilization-worker.js` and the Documents Admin API modules mount the authenticated `/api/admin/documents/*` routes.

---

## 5. Draft contract

A draft is mutable and has optimistic concurrency via `draftRev`.

A draft:

- does not consume a number;
- does not contain a final signature;
- may be deleted while still a draft, subject to existing guards;
- can render a live preview;
- may contain issuer/client document-local overrides without silently writing those overrides back to profiles.

### Draft UI behavior

When opening a normal draft:

- **Preview is the primary/first visual pane**;
- editor controls remain available alongside/after preview;
- any previously displayed issued/PDF panel must be fully hidden/reset.

The CSS rule that makes this reliable is important: `.document-editor-grid[hidden]` must actually resolve to `display:none`; do not assume the HTML `hidden` attribute will win against an author `display:grid` rule.

---

## 6. Finalization contract

Current finalize behavior is intentionally TEST-only.

The core confirmation/finalize request is based on:

```json
{
  "draftRev": "exact current revision",
  "finalizeKey": "client-generated UUID"
}
```

The server must:

1. re-read the document;
2. require `status = draft`;
3. require the exact `draftRev`;
4. resolve issuer/client/signature context server-side;
5. validate document kind/type/series;
6. preview the next number without consuming it before confirmation;
7. atomically consume/advance the correct sequence at Finalize;
8. freeze canonical snapshot JSON + SHA-256 + template version;
9. set `pdf_status = pending`;
10. treat a retry with the same valid `finalizeKey` as idempotent rather than consuming another number.

Do not reimplement sequence logic in UI code.

---

## 7. Numbering

### TEST series currently used

- `test:CC`
- `test:INV`

The TEST gate is intentionally fail-closed against real series.

### Planned real series — not yet enabled by this checkpoint

- `samuel:CC` — planned next base number: `21`.
- `samuel:INV` — planned next base number: integer `19`, displayed `0019`.

These values are planning/bootstrap values, **not permission to bootstrap or issue real documents**.

Real sequence bootstrap must remain:

- explicit;
- audited;
- verified against current D1 state first;
- able to raise but never lower a sequence;
- never a deploy side effect.

### Base number vs display string

Internal base-number identity must not be inferred from formatted text.

Examples:

- Invoice base integer `19` may display as `0019`.
- A correction of `TEST-INV 0004` displays `TEST-INV 0004-B`, but does not consume base `0005`.

---

## 8. Correction / revision contract

This is one of the most important v1 behaviors.

### Why corrections exist

Issued/finalized documents are immutable. If a client asks for a change, do not reopen or mutate the issued snapshot/PDF.

Instead:

1. create a correction draft cloned from the issued document;
2. edit the correction draft normally;
3. finalize it as a revision of the same base number;
4. preserve the complete supersedes chain.

### Display convention

Original is implicit `A` and has no suffix.

- `0004`
- `0004-B`
- `0004-C`
- `0004-D`

Same concept for Cuenta de Cobro:

- `CC 21`
- `CC 21-B`
- `CC 21-C`

### Required invariants

- Original remains immutable and available.
- Revision is a new document/snapshot/PDF.
- Revision is linked through `supersedes_id` / `superseded_by_id`.
- Only the latest unsuperseded issued document can create the next correction.
- Do not create two parallel `-B` revisions.
- An already-open correction draft is reused/idempotent.
- Revision suffix allocation uses a dedicated internal revision sequence.
- Revision does **not** advance the normal base sequence.
- Example already smoke-tested: `TEST-INV 0004 → 0004-B → 0004-C`, while the next independent invoice remained `0005`.

### Current limitation

Correction/revision support is **TEST-series-only** at this checkpoint. Enabling it for real series is a separate reviewed production gate.

---

## 9. Signed PDF artifact contract

Final PDF generation uses the **frozen immutable snapshot**, not the current draft/profile state.

Pipeline:

1. read finalized/void document;
2. verify it belongs to an allowed TEST series;
3. parse immutable `snapshot_json`;
4. recompute canonical snapshot SHA-256 and require equality;
5. load the exact signature asset referenced by snapshot metadata from private `DOCS_BUCKET`;
6. verify signature hash;
7. resolve the exact template version from the snapshot;
8. inline logo asset if required;
9. call `BROWSER.quickAction("pdf")` with Letter / print background / CSS page size;
10. hash generated PDF;
11. store it privately under a content-addressed R2 key;
12. set `pdf_status = ready` and record artifact hash/event.

### PDF failure semantics

If PDF generation fails:

- document stays finalized;
- number stays consumed;
- snapshot stays frozen;
- `pdf_status` becomes `failed`;
- Retry PDF renders again from the frozen snapshot;
- the base/revision number must never be released.

### PDF retrieval

Authenticated GET returns the private PDF with:

- `Content-Type: application/pdf`;
- inline disposition for the in-app viewer;
- private/no-store cache headers;
- hash verification before response.

The Admin viewer provides the inline PDF and an explicit Download PDF action.

---

## 10. Finalized-document UI contract

Selecting an issued/finalized/void row must **not** open the draft editor first.

Issued view priority:

1. `PDF ready` / PDF status;
2. inline PDF viewer or Retry PDF action;
3. issued metadata;
4. correction/revision actions where allowed.

When an issued record is selected:

- draft grid is hidden;
- Delete Draft / Finalize controls are hidden;
- snapshot is presented as immutable;
- old draft/PDF state must not leak when switching between records.

When returning to a draft/new draft, the issued panel must be cleared/hidden.

---

## 11. Approved visual contract — Cuenta de Cobro v1

Template: **`cc-co-es@1`**  
Renderer: `documents-templates/cc-co-es.v1.js`

This template keeps Colombian Cuenta de Cobro semantics while sharing the Invoice family.

### Header

- Letter page.
- Title `Cuenta de Cobro` at the same 30pt scale as Invoice.
- Number line uses the exact pattern:
  - `Cuenta de Cobro No. <display number>`
- City/date remain at upper left.

### Identity cards — intentional CC distinction

These are part of the approved v1 identity and should **not** be removed merely to make CC look more like Invoice:

- `LA EMPRESA` — bordered rounded card.
- `DEBE A` — bordered rounded card.
- `LA SUMA DE` — full-width rounded card with light violet-tinted background.

The words/amount and numeric total live inside `LA SUMA DE`.

### Mandatory semantic structure

Preserve:

- `La empresa`
- `Debe a`
- `La suma de`
- `Por concepto de`

Do not convert CC into the Invoice `Bill to / Engagement` model.

### Concept/pricing behavior

CC supports multiple valid modes and future visual work must not collapse them:

**Simple concepts**
- compact concept + value representation when no structured metadata is used.

**Non-itemized**
- one or many concepts;
- one General rate / total;
- no forced qty/unit/date/PO/per-line total.

**Itemized**
- optional quantity;
- optional unit;
- line type badge;
- optional date/date range;
- optional line PO/reference;
- rate + line total.

### Legal block

Preserve the Colombian retention certification block and its template-versioned legal text marker (`co-ret@2026-1`) unless legal/accounting review explicitly changes it.

### Lower page

Shared with Invoice:

- same two-column bottom geometry (`1.2fr / 1fr`);
- payment information on left;
- signature/issuer identity on right;
- applied signature height currently 108px;
- bottom block uses `margin-top:auto` so the page fills Letter naturally;
- footer remains at bottom.

CC may contain more issuer facts under the signature than Invoice; that difference is intentional.

---

## 12. Approved visual contract — Invoice v1

Template: **`invoice-intl-en@1`**  
Renderer: `documents-templates/invoice-intl-en.v1.js`

### Header / parties

- `Invoice` title at 30pt.
- `Invoice No.` metadata on upper right.
- issuer information on upper left.
- `BILL TO` and `ENGAGEMENT` remain the Invoice semantic structure.

### Table

Columns:

`DESCRIPTION · QTY · UNIT · RATE · AMOUNT`

All table header labels must use compatible typography/baselines; numeric-column headers must not accidentally inherit a monospace face that shifts their vertical alignment.

Grouped sections:

- Professional services;
- Expenses & reimbursements.

Original-expense metadata may show:

- original currency/amount;
- FX convention: `1 USD = x original currency`.

No FX date is displayed.

### Total

- `TOTAL DUE` remains clean, without the old black horizontal rule/box treatment.

### Lower page

- Payment Information and signature use the same lower-page geometry as CC.
- Signature height currently 108px.
- Footer anchored at bottom through page flex + bottom `margin-top:auto`.

---

## 13. Shared visual family

The two v1 templates intentionally share:

- Letter geometry;
- sans + mono typography system;
- violet accent language;
- line-kind badges where applicable;
- restrained gray borders;
- same title scale;
- same lower payment/signature proportions;
- same signature image size;
- same footer concept;
- `SD•Live Documents` visual wordmark treatment.

Do not force identical content layout where the document semantics differ.

---

## 14. Tests that matter before changing Documents

Relevant regression coverage includes, at minimum:

- `tests/documents-draft-templates.test.mjs`
- `tests/documents-template-visual-parity.test.mjs`
- PDF artifact tests;
- finalize gate tests;
- revision/correction tests;
- Admin Documents UX tests.

When changing template output, tests should verify important **contracts**, not every incidental byte of generated HTML.

### Manual visual smoke matrix for renderer changes

At minimum inspect newly generated PDFs for:

**Cuenta de Cobro**
- simple concept;
- non-itemized multiple concepts;
- itemized/detailed;
- payment details on/off;
- final signature;
- revision suffix document.

**Invoice**
- professional services only;
- services + expenses/reimbursements;
- original-currency expense + FX;
- payment details on/off;
- final signature;
- revision suffix document.

Also verify:

- Letter page remains one page for representative content;
- lower section is not stranded halfway up the page;
- no clipping/overflow;
- title/headers remain aligned;
- footer remains at page bottom.

---

## 15. Safe change procedure

Before changing Documents in the future:

1. inspect current `main`;
2. read this file;
3. read `docs/roadmap/sdlive-documents-v1.md`;
4. inspect the exact runtime files involved;
5. create a short branch **before any write**;
6. change the smallest possible surface;
7. update/add tests;
8. open one PR;
9. wait for CI;
10. if CI fails, stop and diagnose from the failing log rather than guessing;
11. when CI is green and repository workflow allows it, squash merge;
12. wait for Cloudflare Git deploy;
13. hard-refresh authenticated Admin;
14. perform a representative TEST smoke;
15. do not perform real sequence/bootstrap/issuance operations unless separately and explicitly authorized.

### Important connector/workflow lesson

Do not write temporary placeholder files to `main` while changing GitHub connector actions. Always create/switch to the intended branch first and verify the branch argument on write actions.

---

## 16. How to make a future visual change

### If only new documents should change

Use a new template version.

Example for Cuenta de Cobro:

1. copy `cc-co-es.v1.js` → `cc-co-es.v2.js`;
2. export `CC_CO_ES_TEMPLATE_VERSION = "cc-co-es@2"`;
3. update kind selection for new documents;
4. keep `@1` registered in final PDF rendering;
5. preserve historical snapshot/PDF retry behavior;
6. add side-by-side renderer tests;
7. create fresh TEST docs and visually review them.

### If a client asks to change an already-issued document

Do **not** change the template or mutate the issued snapshot just for that client.

Use the correction workflow:

`original → -B → -C ...`

### If legal/tax wording changes

Treat it as a separate versioned legal contract. Update `legalBlockVersion` deliberately and keep the old wording available for historical snapshots.

---

## 17. Production gate still pending

Even though TEST Finalize, signed private PDF, inline viewing and TEST revisions are functioning, this checkpoint does **not** authorize real-number issuance.

Before enabling real Documents:

1. inspect actual `DOCS_DB` sequence state;
2. verify proposed `samuel:CC` next `21` and `samuel:INV` next `19` against real historical/current numbering;
3. verify active real signature metadata/private object;
4. explicitly authorize real series bootstrap;
5. bootstrap via the audited operation only;
6. issue one controlled real CC and one controlled real Invoice;
7. verify number, immutable snapshot, signature, PDF and registry;
8. then separately decide whether correction `-B/-C` is enabled for real series.

---

## 18. Known intentional differences between CC and Invoice

Do not “fix” these as visual inconsistencies:

**Cuenta de Cobro**
- Spanish;
- Colombian retention block;
- `La empresa / Debe a / La suma de / Por concepto de`;
- identity/sum cards;
- simple/non-itemized modes;
- more issuer facts under signature.

**Invoice**
- English;
- `Bill to / Engagement`;
- always itemized;
- services vs expenses groups;
- original-currency/FX metadata;
- `Total due` pattern;
- leaner signature facts.

They should feel like the same product while remaining the correct document type.

---

## 19. Definition of done for a future Documents change

A future change is not done merely because code merged.

It is done when:

- contract/invariants are preserved or deliberately versioned;
- CI is green;
- Cloudflare deployed the merged main;
- authenticated Admin behavior was smoke-tested;
- a representative TEST PDF was visually checked if rendering changed;
- historical renderer support remains intact;
- real-series state was not changed without explicit authorization;
- this guide is updated if architecture, contracts or file ownership changed.

---

## 20. Current handoff summary

As of this v1 checkpoint:

- `cc-co-es@1` visual baseline is approved, including restored `La empresa`, `Debe a` and `La suma de` cards.
- `invoice-intl-en@1` visual baseline is approved.
- Draft opens Preview-first.
- Finalized opens PDF/status-first without showing the draft editor.
- TEST Finalize works with immutable snapshot + TEST number.
- Signed private PDF generation/retry/view/download works.
- Invoice revision smoke is validated through `-B` and `-C` while the next independent base number remains unaffected.
- CC and Invoice share the lower payment/signature visual family.
- Real series and real issuance remain a separate explicit production gate.

When resuming work, start from current `main`, then this guide, then the current Documents roadmap. Do not reconstruct behavior from old chat history unless a code discrepancy requires historical investigation.
