# SD.Live Documents v1 — Maintenance, architecture and handoff guide

**Status:** CANONICAL MAINTENANCE GUIDE · **V1 PRODUCTION READY**  
**Production-ready checkpoint:** 2026-09-28  
**Approved template baselines:** `cc-co-es@1` and `invoice-intl-en@1`  
**Scope:** SD.Live Admin Documents (`/admin/documents/`)  
**Production checkpoint:** `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`

> This document exists so future work on Documents can resume without reconstructing the architecture from chat history. Read this before changing rendering, numbering, finalization, revisions, signatures, PDFs, registry behavior, production series, TEST cleanup or mobile Documents UX.
>
> **Precedence:** current GitHub `main` + verified production behavior > production-ready checkpoint > this guide > older roadmap/checkpoint text. If code and this document disagree, inspect the code first and reconcile the docs in the same change.

---

## 1. What “Documents v1 production ready” means

The following are production-enabled and considered complete for the v1 milestone:

- dedicated `DOCS_DB` + private `DOCS_BUCKET`;
- issuer/client profiles;
- private signatures;
- Draft/Preview workflow;
- real and TEST Finalize routing;
- atomic numbering + immutable snapshots;
- signed private PDF generation;
- inline PDF viewer + explicit download;
- filename contract containing document number + client;
- TEST and real correction/revision flows;
- real-series health check;
- TEST workspace cleanup;
- iPhone/iPad operational UX;
- approved Cuenta de Cobro and Invoice v1 renderers.

At the production-ready checkpoint the real series were:

| series | issuer | pattern | current next at checkpoint |
|---|---|---|---:|
| `samuel:CC` | `samuel-cop` | `{n}` | `21` |
| `samuel:INV` | `samuel-usd` | `{n:04}` | `19` → display `0019` |

Those values are live sequence state and will advance after real issuance. Do not hardcode them as permanent values in future logic.

The TEST workspace was re-scanned clean:

- zero TEST documents/artifacts/events/revision counters;
- `test:CC` next `1`;
- `test:INV` next `1`.

---

## 2. Template versioning rule — critical

The accepted v1 renderers are:

| kind | template version | status |
|---|---|---|
| Cuenta de Cobro · Colombia · Español | `cc-co-es@1` | **V1 FROZEN** |
| Invoice · International · English | `invoice-intl-en@1` | **V1 FROZEN** |

`@1` is a historical artifact contract.

Do **not** casually change the visual or semantic output of these renderers. Finalized snapshots persist the template version, and PDF retry/regeneration resolves the exact stored version.

For a future output-affecting change:

1. preserve the existing `.v1.js` renderer;
2. create a new renderer/version (`@2`, etc.);
3. update kind/version selection only for newly finalized documents;
4. preserve historical `@1` resolution in PDF rendering;
5. add regression tests for old + new renderer versions;
6. never rewrite finalized snapshots to the new version.

A code-only fix that provably does not alter historical artifact output may stay on the same version, but the PR must explicitly say why.

---

## 3. Product boundary

SD.Live Documents is a private Admin document generator/registry.

It is **not**:

- DIAN electronic invoicing;
- a replacement for Finance persistence;
- a parallel Accounts Receivable ledger;
- a Google Sheets/AppSheet write-back surface.

Initial kinds:

- `cc-co-es` → Cuenta de Cobro, Colombia, Spanish;
- `invoice-intl-en` → international commercial Invoice, English.

Canonical lifecycle:

`Draft → Preview → Finalize → immutable snapshot + number → signed private PDF → registry`

Correction lifecycle:

`Issued A (implicit) → correction draft → Issued -B → correction draft → Issued -C ...`

---

## 4. Infrastructure and security boundaries

### Runtime resources

- `DOCS_DB` — dedicated Documents D1 database.
- `DOCS_BUCKET` — private R2 bucket for signatures/final PDFs.
- `BROWSER` — Cloudflare Browser Rendering for PDF generation.
- `ASSETS` — static asset access where logo inlining is required.
- Cloudflare Access/Admin auth — boundary for `/admin/documents/` and `/api/admin/documents/*`.

### Hard invariants

- Signature bytes never go to public media storage.
- Final PDFs never go to public media storage.
- No public R2 key/public signature URL is exposed.
- Draft preview never receives usable final signature bytes.
- Missing required Documents bindings fail closed.
- Finalized snapshots are immutable.
- Issued numbers are never released because of Void/PDF failure.
- Public traffic must never run D1 schema preparation/migration.
- Documents v1 performs no Finance writes.
- Real destructive maintenance actions require explicit authenticated confirmation.

---

## 5. Core file map

### Domain / kinds / storage

- `documents-kinds.js`
  - kind registry;
  - template versions;
  - real series defaults;
  - display patterns.
- `documents-domain.js`
  - money/line normalization;
  - Spanish amount-in-words;
  - snapshot construction;
  - canonical JSON/SHA-256;
  - finalization validation.
- `documents-storage.js`
  - draft/finalized persistence;
  - atomic sequence CAS;
  - immutable snapshot storage;
  - `finalizeKey` idempotency;
  - events/supersedes relationships.

### Finalize / revisions

- `documents-finalize-gate.js`
  - prospective-number preview;
  - exact `draftRev`;
  - UUID `finalizeKey` validation;
  - real/TEST series routing;
  - correction-aware finalization.
- `documents-corrections.js`
  - creates correction drafts from issued documents;
  - latest-unsuperseded-only rule;
  - one open correction draft per source.
- `documents-revisions.js`
  - revision counters;
  - suffix allocation (`-B`, `-C`, ...);
  - base-number preservation;
  - atomic revision finalization.

### Profiles / production checks / cleanup

- `documents-profiles.js`
  - issuer/client profile normalization;
  - TEST sequence ensure;
  - signature metadata.
- `documents-admin-profiles-api.js`
  - authenticated Settings/profile/signature endpoints;
  - production preflight/bootstrap routes;
  - TEST cleanup routes.
- `documents-production-preflight.js`
  - read-only production health.
- `documents-production-bootstrap.js`
  - explicit real sequence bootstrap primitive.
- `documents-test-data-purge.js`
  - dry-run/fingerprint TEST cleanup;
  - real-data exclusion;
  - TEST root reset.

### Templates / PDFs

- `documents-templates/shared.js`
  - shared document CSS/helpers.
- `documents-templates/cc-co-es.v1.js`
  - frozen Cuenta de Cobro v1 renderer.
- `documents-templates/invoice-intl-en.v1.js`
  - frozen Invoice v1 renderer.
- `documents-pdf-artifacts.js`
  - frozen snapshot → exact renderer;
  - snapshot/signature hash verification;
  - Browser Rendering;
  - private R2 PDF;
  - artifact hash verification;
  - authenticated inline response/download filename.

### Admin UI

- `admin/documents/editor.js`
  - base draft editor/registry.
- `admin/documents/management.js`
  - profile/settings management.
- `admin/documents/pdf-artifact-ux.js`
  - preview-first/issued-first state routing;
  - inline PDF viewer;
  - Retry PDF.
- `admin/documents/revision-ux.js`
  - correction/revision actions.
- `admin/documents/production-active-ux.js`
  - REAL vs TEST Finalize presentation;
  - active production copy/state.
- `admin/documents/production-preflight-ux.js`
  - production health UI.
- `admin/documents/test-cleanup-ux.js`
  - TEST scan/purge UX.
- `admin/documents/mobile-webapp*.css/js`
  - iPhone/iPad operational layer.
- `admin/documents/mobile-settings-polish.css`
  - compact mobile Settings/health/cleanup layout.
- `admin/documents/state-router-fix.js`
  - loads incremental UX layers and protects issued/draft state transitions.

### Worker/API mounting

Documents authenticated routes are mounted through the current Admin worker/API chain. Inspect current `admin-stabilization-worker.js` and Documents Admin API modules before changing routing.

---

## 6. Draft contract

A draft is mutable and uses optimistic concurrency via `draftRev`.

A draft:

- does not consume an official number;
- does not contain the final private signature;
- may be deleted while still a draft under existing guards;
- can render live preview;
- may contain issuer/client document-local overrides without silently writing those overrides back to profiles.

### Draft UI

- opening a Draft prioritizes Preview first;
- opening New Draft clears previous issued/PDF state;
- selecting a Finalized/Void record must hide the draft editor;
- returning from issued state to Draft/New Draft must clear the issued panel.

### Preview geometry

The preview must preserve Letter layout geometry.

On narrow/mobile screens, scale the Letter viewport visually instead of allowing the document renderer to reflow into a narrow responsive page. The preview should remain representative of the final PDF.

---

## 7. Finalization contract

The confirmation request is based on:

```json
{
  "draftRev": "exact current revision",
  "finalizeKey": "client-generated UUID"
}
```

The server must:

1. re-read the document;
2. require `status = draft`;
3. require exact `draftRev`;
4. resolve issuer/client/signature context server-side;
5. validate kind/type/series;
6. preview the next number without consuming it before confirmation;
7. atomically consume/advance the sequence at Finalize;
8. freeze canonical snapshot JSON + SHA-256 + template version;
9. set `pdf_status = pending`;
10. treat the same valid `finalizeKey` retry idempotently.

Do not reimplement sequence logic in UI code.

### REAL routing

Canonical issuer/series routing:

- Cuenta de Cobro → issuer `samuel-cop` → `samuel:CC`;
- Invoice → issuer `samuel-usd` → `samuel:INV`.

TEST issuer routes to TEST series.

The Finalize dialog must clearly distinguish REAL vs TEST issuance.

---

## 8. Numbering

### TEST series

- `test:CC`;
- `test:INV`.

Clean baseline after purge is next `1` for both.

### Real series

- `samuel:CC` → `{n}`;
- `samuel:INV` → `{n:04}`.

At production-ready checkpoint:

- CC next `21`;
- Invoice next `19`, display `0019`.

These are historical checkpoint values only. Always read current D1 state before diagnosing numbering later.

### Display pattern rule

Templates render their own labels. Sequence patterns are number formatting only.

Correct:

- `{n}`;
- `{n:04}`.

Incorrect:

- `CUENTA DE COBRO No. {n}`;
- `Invoice No. {n:04}`.

Internal base number identity must never be inferred by parsing formatted display text.

---

## 9. Corrections / revisions

Issued documents are immutable. Client-requested changes create a correction draft, not an edit-in-place.

Flow:

1. create correction draft cloned from issued source;
2. edit normally;
3. finalize as revision of same base number;
4. preserve supersedes chain.

### Display convention

Original is implicit A/no suffix:

- `21`;
- `21-B`;
- `21-C`.

Invoice example:

- `0019`;
- `0019-B`;
- `0019-C`.

### Required invariants

- original remains immutable/available;
- revision is a new document/snapshot/PDF;
- `supersedes_id` / `superseded_by_id` chain;
- only latest unsuperseded issued document can create next correction;
- one open correction draft per source;
- dedicated revision sequence/counter;
- revision does **not** advance base sequence.

Real revision counter examples:

- `revision:samuel:CC:21`;
- `revision:samuel:INV:19`.

Do not treat revision counters as legal base document numbers.

Verified TEST interleaving proved a revision remains attached to its base even after the base sequence advances:

`CC n → n-B → independent n+1 → n-C`.

---

## 10. Signed PDF artifact contract

Final PDF uses the **frozen snapshot**, not current profile/draft state.

Pipeline:

1. read finalized/void document;
2. parse immutable `snapshot_json`;
3. recompute/verify snapshot SHA-256;
4. load exact private signature asset referenced by snapshot metadata;
5. verify signature SHA-256;
6. resolve exact template version;
7. inline required static assets;
8. call Browser Rendering with Letter/print background/CSS page size;
9. hash generated PDF;
10. store content-addressed private PDF in `DOCS_BUCKET`;
11. persist `pdf_status=ready` + artifact hash/event.

### Failure semantics

If PDF generation fails:

- document stays finalized;
- number stays consumed;
- snapshot stays frozen;
- `pdf_status=failed`;
- Retry PDF renders from frozen snapshot;
- number is never released/reused.

### Retrieval / filename

Authenticated retrieval verifies artifact hash before returning the PDF.

The in-app viewer uses inline PDF response.

The explicit download filename contract is:

`<DOCUMENT NUMBER> - <CLIENT>.pdf`

The client component is mandatory. Filename sanitization may normalize characters for filesystem safety but must not silently omit the client.

---

## 11. Finalized-document UI

Selecting issued/finalized/void must **not** open the draft editor first.

Priority:

1. PDF ready/status;
2. inline PDF/Retry;
3. issued metadata;
4. correction action where allowed.

When issued:

- draft grid hidden;
- Delete Draft/Finalize hidden;
- snapshot immutable;
- old draft/PDF state must not leak between records.

---

## 12. Cuenta de Cobro v1 visual contract

Template: `cc-co-es@1`  
Renderer: `documents-templates/cc-co-es.v1.js`

### Header

- Letter;
- title `Cuenta de Cobro`;
- number line `Cuenta de Cobro No. <display number>`;
- city/date upper area.

### Identity cards — intentional distinction

Preserve:

- `LA EMPRESA` bordered rounded card;
- `DEBE A` bordered rounded card;
- `LA SUMA DE` violet-tinted rounded card.

Do not convert Cuenta de Cobro into the Invoice `Bill to / Engagement` semantic structure.

### Concepts/pricing

Preserve all modes:

**Simple**
- compact concept/value.

**Non-itemized**
- one/multiple concepts;
- one General rate/total;
- no forced qty/unit/date/PO/per-line total.

**Itemized**
- optional quantity/unit;
- type badge;
- optional date/date range;
- optional PO/reference;
- rate + line total.

### Legal block

Preserve Colombian retention certification + version marker unless deliberately changed following legal/accounting review and template versioning.

### Lower page

- payment information left;
- signature/issuer identity right;
- applied signature treatment;
- lower block anchored naturally toward bottom;
- footer at page bottom.

---

## 13. Invoice v1 visual contract

Template: `invoice-intl-en@1`  
Renderer: `documents-templates/invoice-intl-en.v1.js`

### Header/parties

- `Invoice` title;
- `Invoice No.` metadata;
- issuer upper left;
- `BILL TO` / `ENGAGEMENT` semantics.

### Table

Core columns:

`DESCRIPTION · QTY · UNIT · RATE · AMOUNT`

Header typography/baselines must remain visually aligned.

Groups:

- Professional services;
- Expenses & reimbursements.

Original-expense metadata may show original currency/amount + FX convention:

`1 USD = x original currency`

No FX date is displayed.

### Total

`TOTAL DUE` remains clean; do not restore the old black rule/box treatment.

### Lower page

Payment Information + signature share the approved lower-page geometry and bottom-anchored footer.

---

## 14. Production health

The read-only production preflight/health check is the authoritative operational check for real Documents state.

It validates:

- storage bindings;
- schema;
- TEST root identity;
- real series identity/pattern/current next state;
- number collisions;
- active private signatures;
- signature hash match.

A real sequence is healthy if it preserves its correct identity/pattern and its next value is valid/above issued history. Do not require it to remain equal to the original bootstrap number after real use.

---

## 15. TEST workspace cleanup

TEST cleanup is physical maintenance, not just registry hiding.

Dry-run identifies exact TEST-only state and produces a fingerprint.

Purge may remove:

- TEST documents/drafts/finalized/void;
- TEST events/source links;
- private TEST PDFs/artifacts;
- TEST revision counters;
- then reset `test:CC` / `test:INV` to `1`.

It must never delete:

- `samuel:CC` / `samuel:INV`;
- real documents;
- issuer/client profiles;
- real signature assets.

A fresh dry-run fingerprint + explicit confirmation are required.

If the scan reports the workspace already clean, hide the destructive Purge action.

---

## 16. Mobile webapp contract

### iPhone

When a draft is open:

- use a solid minimal app shell;
- hamburger remains available;
- compact document/client header + Close;
- fixed Preview/Edit rail at top;
- only central document content scrolls;
- fixed Save/Finalize dock at bottom;
- respect safe-area insets;
- iOS inputs stay at safe font sizes;
- date controls cannot overflow;
- Issuer/Client may default collapsed;
- registry/general page chrome stays out of the open-draft path;
- Finalize uses mobile-friendly presentation.

### iPad

- touch-friendly portrait;
- dual editor/preview in landscape where space allows.

### Settings

Mobile Settings should remain compact and readable:

- sequence rows separate title/meta/state;
- real rows say `Current next`, not `Planned next` once active;
- health cards compact but legible;
- TEST cleanup compact;
- Safari bottom safe-area room;
- no hamburger/content overlap.

---

## 17. Safe future-change procedure

Before any Documents change:

1. inspect current `main`;
2. read the production-ready checkpoint + this guide;
3. identify whether the change affects historical PDF output;
4. preserve security/numbering/immutability invariants;
5. use a short branch;
6. add/update regression tests;
7. open one PR;
8. require CI green before merge;
9. perform representative production verification when applicable;
10. update this guide/checkpoint if the operational contract changes.

### If changing renderer output

Create a new template version.

### If changing numbering/revisions

Verify base sequence and revision counter independence.

### If changing signature/PDF handling

Verify private storage and hashes; never expose public URLs.

### If changing cleanup/destructive operations

Require read-only preflight/fingerprint + explicit confirmation + fail-closed real-data exclusion.

### If changing mobile UX

Test at least:

- iPhone 15 Pro class viewport;
- iPad Air class portrait/landscape;
- Safari safe areas/keyboard/date controls;
- Preview/Edit and Save/Finalize fixed rails;
- no excessive reflow of Letter preview.

---

## 18. Remaining backlog — not v1 blockers

- Void reason/history polish;
- revision/supersedes history UI;
- event/history view;
- client document history;
- Finance read-only prefill;
- Quote/Cotización kinds;
- template v2 changes when deliberately requested;
- legal/accounting review as needed.

These are future enhancements, not reasons to keep Documents v1 open as an active gate.

---

## 19. Recovery / continuation checklist

If returning to Documents after months:

1. read current `PROJECT_STATUS.md`;
2. read `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`;
3. read this guide;
4. inspect current `documents-kinds.js`, finalize/revision/PDF modules and Admin UX;
5. run/read production health before diagnosing sequence/signature concerns;
6. never assume checkpoint next values are still current;
7. preserve frozen v1 renderers unless creating a new template version.

**Documents v1 is a closed production-ready milestone. Normal real documents can be issued through the approved workflow without additional TEST smoke unless a regression is being investigated.**
