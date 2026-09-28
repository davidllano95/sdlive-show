# SD.Live Documents v1 — Production Ready handoff

**Date:** 2026-09-28 · America/Bogota  
**Status:** **PRODUCTION READY / V1 CLOSED**  
**Verified production runtime before this checkpoint:** PR #312 / `1983f5ebc6dbd45f5a32f23a45cf7af12985285b`  
**Approved renderers:** `cc-co-es@1`, `invoice-intl-en@1`  
**Canonical maintenance guide:** `docs/operations/documents-v1-maintenance.md`

This is the durable production-ready checkpoint for SD.Live Documents v1. It records the verified state after the complete TEST lifecycle, real-series bootstrap, real routing validation, mobile webapp work and TEST workspace cleanup.

Current GitHub `main` + verified production behavior always outrank this checkpoint if a future discrepancy is found.

---

## 1. Production state

Documents v1 is enabled for real document issuance.

Real series are bootstrapped and healthy:

| series | issuer | kind | current next at checkpoint | display |
|---|---|---|---:|---|
| `samuel:CC` | `samuel-cop` | `cc-co-es` | `21` | `21` |
| `samuel:INV` | `samuel-usd` | `invoice-intl-en` | `19` | `0019` |

The production health check was verified **READY** after bootstrap with:

- `DOCS_DB` available;
- `DOCS_BUCKET` available;
- schema exact;
- TEST sequence identities valid;
- active private signature for `samuel-cop` verified by SHA-256;
- active private signature for `samuel-usd` verified by SHA-256;
- `samuel:CC` present with no number collision;
- `samuel:INV` present with no number collision.

At this checkpoint **no real base number has been consumed**. The next actual real Finalize is expected to consume CC `21` or Invoice `0019`, depending on which document is issued first.

---

## 2. TEST workspace state

The TEST workspace cleanup flow was run and re-scanned.

Verified clean baseline:

- `0` TEST documents;
- `0` TEST drafts;
- `0` TEST finalized documents;
- `0` TEST void documents;
- `0` private TEST PDFs/artifacts;
- `0` TEST revision counters;
- `0` TEST events;
- `test:CC` root counter reset to `1`;
- `test:INV` root counter reset to `1`.

TEST remains available as a sandbox if deliberately used later, but production work should not create TEST documents by default.

The cleanup operation is fail-closed and excludes real sequences/documents/profiles/signatures.

---

## 3. Approved document templates

### Cuenta de Cobro

Template: `cc-co-es@1`

Approved visual/semantic contract includes:

- Letter page;
- title/number presentation `Cuenta de Cobro No. <display number>`;
- `LA EMPRESA` card;
- `DEBE A` card;
- violet-tinted `LA SUMA DE` card;
- `Por concepto de`;
- simple, non-itemized and itemized modes;
- Colombian retention certification block;
- payment information + applied signature at the lower page;
- footer anchored to Letter page bottom.

### International Invoice

Template: `invoice-intl-en@1`

Approved contract includes:

- Letter page;
- `Invoice No. <display number>`;
- issuer / Bill to / Engagement structure;
- services and reimbursement grouping;
- quantity/unit/rate/amount support;
- original-expense metadata;
- FX convention `1 USD = x original currency`;
- clean Total due treatment;
- payment information + applied signature at the lower page;
- footer anchored to Letter page bottom.

### Template freeze rule

`@1` is a historical artifact contract.

Any future output-affecting visual or semantic change must create `@2` (or later) rather than silently changing the v1 renderer. Historical snapshots must remain renderable with the exact version stored at Finalize.

---

## 4. Draft / Preview / Finalize behavior

Canonical lifecycle:

`Draft → Preview → Finalize → atomic number + immutable snapshot → private signed PDF → registry`

Verified behavior:

- drafts do not consume official numbers;
- Preview does not consume a number;
- Preview does not receive final signature bytes;
- Finalize requires exact `draftRev`;
- Finalize uses a client UUID `finalizeKey` for idempotency;
- server resolves issuer/client/signature/series;
- number consumption and frozen snapshot are atomic;
- PDF generation uses the frozen snapshot;
- PDF failure never releases/reuses the number;
- Retry PDF uses the frozen snapshot;
- final PDFs stay private in `DOCS_BUCKET`;
- authenticated inline viewer and explicit download are available;
- downloaded filenames must include document number **and client name**.

Real draft routing was verified without number consumption:

- Cuenta de Cobro with `samuel-cop` previews real series `samuel:CC` and prospective number `21`;
- Invoice with `samuel-usd` previews real series `samuel:INV` and prospective display `0019`.

---

## 5. Corrections / revisions

Issued documents are never edited in place.

Correction convention:

- original = implicit A, no suffix;
- first correction = `-B`;
- next = `-C`, etc.

Verified TEST smoke included the stronger interleaving case:

`CC n → CC n-B → independent CC n+1 → CC n-C`

This proved that revision allocation remains attached to the original base document even after the normal base sequence advances.

Real-series correction support is enabled and uses independent revision counters:

- `revision:samuel:CC:<base>`;
- `revision:samuel:INV:<base>`.

A real correction does **not** consume the next base CC/Invoice number.

Required invariants remain:

- source issued snapshot immutable;
- only latest unsuperseded issued record can be corrected;
- one open correction draft per source;
- `supersedes_id` / `superseded_by_id` chain;
- revisions have `number = NULL` and derive display identity from their base + suffix;
- base sequence is untouched by revision finalization.

---

## 6. Private signatures and PDFs

Issuer mapping:

- `samuel-cop` → Cuenta de Cobro / COP profile;
- `samuel-usd` → international Invoice / USD profile.

Security invariants:

- signature objects are private;
- signature metadata is verified against private bytes with SHA-256;
- no public signature URL;
- no public R2 document URL;
- final PDF stored in `DOCS_BUCKET`, not public media storage;
- authenticated retrieval only;
- PDF content hash verified before response;
- public traffic never prepares/migrates Documents storage.

---

## 7. Production health and maintenance controls

Settings exposes a read-only **Real-series health** check.

It validates:

- Documents storage;
- schema;
- signature objects/hashes;
- real series identity/pattern/state;
- current next values;
- number collisions.

Once bootstrapped, a healthy real sequence can advance naturally. The health check must not require it to remain forever at its original bootstrap value.

Settings also exposes **TEST workspace cleanup**:

1. read-only scan;
2. exact TEST-only fingerprint;
3. explicit purge confirmation;
4. fail-closed exclusion of real data;
5. post-purge reset of TEST root counters to `1`.

When a scan confirms the workspace is already clean, the destructive Purge action must remain hidden.

---

## 8. Mobile webapp contract

Documents Admin has an iPhone/iPad-specific operational layer.

### iPhone

Open draft behaves as an app screen:

- minimal solid navigation shell;
- hamburger available without translucent content bleed;
- compact document/client header + Close;
- fixed `Preview / Edit` rail at top;
- fixed `Save / Finalize` dock at bottom;
- safe-area support for Dynamic Island/home indicator;
- form controls use iOS-safe font sizing;
- date controls cannot overflow their cards;
- prefilled Issuer/Client sections are collapsible;
- registry/general chrome is removed from the open-draft flow to reduce scroll;
- Finalize dialog uses mobile-friendly bottom-sheet behavior.

### iPad Air / tablet

- touch-friendly layout in portrait;
- dual editor + preview workspace when landscape width permits.

### Preview geometry

Draft preview preserves Letter geometry and scales visually instead of reflowing the template into a narrow responsive document. The preview must remain representative of the final PDF.

---

## 9. Number/display contracts

Real stored display patterns contain **only the number formatting**, because the templates render their own labels:

- `samuel:CC` → `{n}`;
- `samuel:INV` → `{n:04}`.

Do not store `Cuenta de Cobro No.` or `Invoice No.` in the sequence display pattern.

Internal identity must not be parsed back from formatted display text.

---

## 10. What is closed in v1

The following are considered complete for the v1 production milestone:

- dedicated Documents storage;
- issuer/client profiles;
- private signatures;
- draft/editor/registry;
- preview;
- approved CC and Invoice v1 templates;
- real series bootstrap;
- production health check;
- real Finalize routing;
- immutable snapshots;
- private signed PDFs;
- inline viewer/download;
- correction/revision model for TEST and real series;
- TEST cleanup;
- iPhone/iPad webapp UX;
- production-ready operational documentation.

Do not reopen these as roadmap blockers without an actual regression or a deliberately selected v2 requirement.

---

## 11. Remaining backlog, not blockers

Possible future Documents work:

- Void UX/reason/history polish;
- visible supersedes/superseded-by chain/history;
- document event/history UI;
- client document history;
- Finance read-only prefill;
- Quote/Cotización kinds;
- future template v2 work when a real output change is requested;
- legal/accounting review of template wording as needed.

Documents remains **not** DIAN electronic invoicing and remains separate from Finance write-back.

---

## 12. Exact continuation rule

For a normal real document, use Documents directly. Do not create another TEST smoke just to prove v1 again.

Before changing Documents internals in the future:

1. read `docs/operations/documents-v1-maintenance.md`;
2. read this checkpoint;
3. inspect current `main` and current production behavior;
4. preserve all numbering/security/immutability invariants;
5. create a new template version for output-affecting renderer changes;
6. use a separate explicit production gate for any destructive/irreversible operation.

**Documents v1 is closed as a production-ready milestone. The next major roadmap workstream may proceed independently.**
