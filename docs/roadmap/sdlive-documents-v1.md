# SD.Live Documents v1 — Implementation contract

**Status:** **PRODUCTION READY / V1 CLOSED**  
**Production-ready checkpoint:** `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`  
**Canonical maintenance guide:** `docs/operations/documents-v1-maintenance.md`  
**Approved template baselines:** `cc-co-es@1`, `invoice-intl-en@1`.

Current GitHub `main` + verified production behavior outrank this document if a discrepancy is found.

---

## 0. Guardrails

1. Inspect current `main` before every Documents change.
2. Use a short branch before any write.
3. Documents never writes to Google Sheets/AppSheet in v1.
4. No D1 Finance mirror.
5. Signature and final PDF artifacts stay in private Documents storage.
6. Drafts/Preview never consume official numbers.
7. Finalized snapshots/numbers are immutable.
8. PDF failure never releases a number.
9. Missing Documents resources fail closed.
10. Irreversible/destructive production actions remain explicit owner actions, never deploy side effects.
11. Approved v1 template renderers are historical artifact contracts; output-affecting changes require a new template version.

---

## 1. Product goal — COMPLETE

`/admin/documents/` is a private professional document registry/generator.

Initial kinds:

| kind_id | type | market | language | template |
|---|---|---|---|---|
| `cc-co-es` | Cuenta de Cobro | CO | es | `cc-co-es@1` |
| `invoice-intl-en` | Invoice | INTL | en | `invoice-intl-en@1` |

Lifecycle:

`Draft → Preview → Finalize → atomic number + immutable snapshot → signed private PDF → registry`

Correction lifecycle:

`Issued → correction draft → -B / -C / ... → immutable replacement document`

---

## 2. Source-of-truth boundaries — COMPLETE

### Finance

- Google Sheets remains Finance persistence.
- AppSheet SD.Live Track remains primary mobile/offline Finance workflow.
- Documents may read Finance context in a future prefill feature.
- Documents performs no Finance writes in v1.

### Documents

Dedicated resources:

- `DOCS_DB`;
- private `DOCS_BUCKET`;
- Browser Rendering `BROWSER`;
- `ASSETS` when required by rendering.

Never expose signature bytes/private R2 keys/public artifact URLs through settings/read APIs.

---

## 3. Numbering — PRODUCTION ACTIVE

### TEST roots

- `test:CC` → clean baseline next `1`;
- `test:INV` → clean baseline next `1`.

The TEST workspace was purged/re-scanned clean at the production-ready checkpoint.

### Real series

- `samuel:CC` → issuer `samuel-cop` → pattern `{n}` → **current next 21 at checkpoint**;
- `samuel:INV` → issuer `samuel-usd` → pattern `{n:04}` → **current next 19 / display 0019 at checkpoint**.

These values are now live sequence state, not planning placeholders.

The templates render their own textual labels:

- `Cuenta de Cobro No. <display number>`;
- `Invoice No. <display number>`.

Therefore sequence display patterns contain number formatting only.

A healthy real sequence may advance naturally after issuance. Production health must validate identity/pattern/collision/state without requiring the sequence to remain at its original bootstrap value forever.

---

## 4. Draft / Preview — COMPLETE

Implemented:

- draft CRUD;
- `draftRev` optimistic concurrency;
- issuer/client selection + document-local overrides;
- line items/document metadata;
- CC simple/non-itemized/itemized modes;
- Invoice services/expenses;
- optional quantity/unit/date/range/PO/reference;
- original expense currency + FX metadata;
- bank censor toggle;
- sandboxed preview;
- draft watermark/no-number/no-final-signature guarantees.

UX contract:

- Draft opens Preview-first;
- New Draft clears issued/PDF state;
- preview preserves Letter geometry and scales visually rather than reflowing the document on narrow screens.

---

## 5. Finalize — COMPLETE FOR TEST AND REAL

Implemented:

- authenticated Admin Finalize preview/confirmation;
- prospective number without pre-consumption;
- exact `draftRev`;
- UUID `finalizeKey`;
- server-side issuer/client/signature/series validation;
- atomic sequence CAS;
- immutable snapshot JSON + SHA-256 + template version;
- idempotent retry;
- `pdf_status=pending` after Finalize;
- explicit REAL vs TEST confirmation UX.

Verified real routing without consuming a number:

- `samuel-cop` Cuenta de Cobro → `samuel:CC` → prospective `21`;
- `samuel-usd` Invoice → `samuel:INV` → prospective `0019`.

---

## 6. Signed private PDF — COMPLETE FOR TEST AND REAL

Implemented:

- frozen snapshot → exact canonical renderer;
- snapshot hash verification;
- exact template-version dispatch;
- private signature retrieval + hash verification;
- Browser Rendering Letter PDF;
- content-addressed private R2 artifact;
- PDF SHA-256 persistence;
- `pending / ready / failed` state;
- safe Retry PDF from frozen snapshot;
- authenticated inline PDF retrieval;
- explicit download action;
- number remains consumed on PDF failure;
- downloaded filename includes document number + client name.

Issued UI contract:

- selecting Finalized/Void opens PDF/status-first;
- draft editor does not appear first;
- issued snapshot is immutable.

---

## 7. Corrections / revisions — COMPLETE FOR TEST AND REAL

Issued documents are never edited in place.

Display convention:

- original: no suffix (implicit A);
- first correction: `-B`;
- second correction: `-C`;
- etc.

Invariants:

- source issued document remains immutable;
- `supersedes_id` / `superseded_by_id` chain;
- only latest unsuperseded issued document can create next correction;
- one open correction draft per source;
- dedicated revision sequence/counter;
- correction does not consume next base number;
- revision Finalize remains snapshot/PDF based.

Verified TEST behavior included:

- Invoice chain `TEST-INV 0004 → 0004-B → 0004-C`, with next independent `0005`;
- Cuenta de Cobro stronger interleaving smoke `CC n → n-B → independent n+1 → n-C`.

Real revision counters are independent from base sequences, e.g.:

- `revision:samuel:CC:<base>`;
- `revision:samuel:INV:<base>`.

---

## 8. Approved visual v1 — FROZEN

### Shared family

Both templates use:

- Letter page;
- 30pt title scale;
- shared sans/mono typography system;
- violet accents;
- compatible spacing/rhythm;
- shared lower payment/signature geometry;
- applied signature treatment;
- bottom-anchored footer.

### Cuenta de Cobro `cc-co-es@1`

Approved distinct structure:

- `Cuenta de Cobro No. <display number>`;
- bordered rounded `La empresa` card;
- bordered rounded `Debe a` card;
- violet-tinted rounded `La suma de` card;
- `Por concepto de`;
- simple/non-itemized/itemized functionality;
- Colombian retention certification;
- Spanish payment/bank presentation.

### Invoice `invoice-intl-en@1`

Approved distinct structure:

- `Invoice No. <display number>`;
- issuer + Bill to / Engagement structure;
- services/expenses table;
- original expense + `1 USD = x original currency` presentation;
- clean Total due;
- Payment Information + signature at page bottom.

### Template-version rule

Output-affecting changes require a new renderer/version (`@2`, etc.). Preserve `@1` for historical PDF retry/regeneration.

---

## 9. Production health — COMPLETE

Settings exposes read-only **Real-series health**.

It checks:

1. `DOCS_DB` / `DOCS_BUCKET`;
2. schema;
3. real sequence identity/pattern/current state;
4. number collisions;
5. active real signature metadata/private object;
6. SHA-256 match for each active signature.

Production was verified **READY** after real bootstrap.

---

## 10. TEST workspace cleanup — COMPLETE

Settings exposes:

1. read-only TEST scan;
2. exact state fingerprint;
3. explicit destructive confirmation;
4. TEST-only D1/R2 purge;
5. TEST root reset to `1`;
6. fail-closed protection against real data.

Production-ready re-scan result:

- 0 TEST documents;
- 0 drafts/finalized/void;
- 0 private TEST artifacts;
- 0 revision counters;
- 0 events;
- TEST roots at clean baseline.

When scan confirms no data exists, the Purge action must remain hidden.

---

## 11. Mobile webapp — COMPLETE FOR V1

### iPhone

- open draft becomes an app-like screen;
- solid minimal navigation shell;
- fixed Preview/Edit top rail;
- fixed Save/Finalize bottom dock;
- safe areas for Dynamic Island/home indicator;
- iOS-safe 16px form controls;
- date controls constrained to card width;
- Issuer/Client collapsible by default;
- reduced-scroll workflow;
- mobile Finalize bottom-sheet treatment;
- compact Settings/health/cleanup UI.

### iPad

- touch-friendly portrait behavior;
- dual editor + preview workspace where landscape width permits.

---

## 12. Production milestone definition — PASS

Documents v1 is considered closed because the following are complete and production-enabled:

- dedicated storage;
- profiles/private signatures;
- Draft/Preview;
- CC + Invoice v1 templates;
- real numbering;
- real Finalize routing;
- immutable snapshots;
- private PDFs/viewer/download;
- TEST + real corrections/revisions;
- production health;
- TEST cleanup;
- mobile webapp UX;
- production-ready handoff documentation.

Do not require another TEST smoke before ordinary real usage unless a regression is being investigated.

---

## 13. Remaining backlog — NOT V1 BLOCKERS

- Void UX/reason/history polish;
- visible supersedes/superseded-by history;
- event/history view;
- client document history;
- Finance read-only prefill;
- Quote/Cotización kinds;
- future template v2 work;
- legal/accounting review when needed.

Documents is not DIAN electronic invoicing.

---

## 14. Exact continuation point

**Documents v1 is production-ready and closed. Normal real documents may now be issued through the approved workflow. Before any future Documents internal change, read `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md` and `docs/operations/documents-v1-maintenance.md`, inspect current `main`, and preserve numbering/security/immutability/template-version invariants. The broader roadmap may move to the next selected workstream.**
