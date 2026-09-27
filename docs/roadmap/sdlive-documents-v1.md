# SD.Live Documents v1 — Implementation contract

**Status:** ACTIVE GATE — approved for implementation, one PR at a time.  
**Date:** 2026-09-26 — America/Bogota  
**Base:** GitHub `main` at/after `f5e0054a84cebf238542cbde08793d995f9059c4` (PR #259).

This file is the implementation contract for SD.Live Documents v1. Current `PROJECT_STATUS.md` invariants win if any conflict is found.

## 0. Workflow and guardrails

1. Repo workflow: `inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge → representative production smoke when runtime-relevant`.
2. The owner has explicitly authorized squash merge without a separate per-PR confirmation once scope is correct and CI is green.
3. Production-sensitive operations remain separate and must not be executed silently: D1/R2 creation or preparation, real sequence bootstrap, or smokes that consume real document numbers.
4. One coherent PR at a time, in the order below.
5. Do not change Finance ownership: Documents never writes to Google Sheets, never creates a D1 Finance mirror and never changes AppSheet behavior.
6. Do not use `CMS_DB`, `MEDIA_BUCKET` or `MEDIA_PUBLIC_BASE` for Documents. Signature assets and PDFs are private.
7. No DDL on ordinary traffic. Storage preparation is explicit and authenticated.
8. Vanilla JS, current flat-module repo style, `node --test`, Node 22 CI, no framework/build migration.
9. If a real Cloudflare resource ID is required and unavailable, stop before committing a deploy-breaking placeholder.
10. Missing `DOCS_DB`, `DOCS_BUCKET` or `BROWSER` bindings must fail closed for Documents only and must not affect the rest of the site.

## 1. Product goal

Add `/admin/documents/` to SD.Live Control Center to produce professional, already-signed documents with:

- editable drafts;
- real preview before issue;
- immutable finalized snapshots;
- system-controlled sequential numbering;
- permanent registry and search;
- private signed PDF storage;
- read-only prefill from Finance;
- future reuse by Quotes/Cotizaciones.

Initial kinds:

| kind_id | type | market | language | template |
|---|---|---|---|---|
| `cc-co-es` | Cuenta de cobro | CO | es | `cc-co-es@1` |
| `invoice-intl-en` | Invoice | INTL | en | `invoice-intl-en@1` |

Future, not v1: `quote-co-es`, `quote-intl-en` on the same core.

Flow:

`Draft → Preview → Finalize → atomic number + snapshot → signed PDF → registry`

## 2. Adopted decisions

### D1 — Cuenta de cobro numbering

From Documents v1 onward, Cuenta de cobro uses **one global series per issuer**, not one sequence per client.

For Samuel:

- series key: `samuel:CC`
- first new number: **21**
- visible default: `CUENTA DE COBRO No. 21`

Historical documents keep their original client-scoped numbering and are imported as legacy; they are never renumbered. This is an intentional professional transition to globally unique new document numbers.

### D2 — Invoice numbering

Invoices continue the existing global sequence:

- series key: `samuel:INV`
- first new number: **19**
- visible default: `Invoice No. 0019`

Internally numbering is always `(series_key, number INTEGER)`, never parsed from display strings.

### D3 — Reissue with PO

Reissues use a **new number** plus a `supersedes` relation. The historical `.5` convention is retired for new Documents records. A template may display `Reemplaza la cuenta de cobro No. N`.

### D4 — Storage

Use dedicated private resources:

- D1: `sdlive-documents-production`, binding `DOCS_DB`
- R2: `sdlive-documents-private`, binding `DOCS_BUCKET`
- no public custom domain / no public R2 delivery

A CMS restore must not roll back issued documents.

### D5 — PDF renderer

Preferred renderer: Cloudflare Browser Rendering / Browser Run (`BROWSER`, `@cloudflare/puppeteer`) using the same HTML template as preview/final rendering. `pdf-lib` may be used only for bounded metadata/post-processing.

### D6 — Issuer

Legal issuer in v1: **Samuel David Llano Muñoz**.

Confirmed address default: `Calle 151 # 13a-50, Bogotá`.

Issuer data lives in an Issuer Profile and is copied into every finalized snapshot.

### D7 — Legal text

Colombian retention/tax text is template-versioned (for example `co-ret@2026-1`). Current wording may seed v1 but is not represented as independently verified legal advice. A later wording change creates a new version, never an in-place mutation of issued documents.

### D8 — Multiple issuers

The model supports multiple issuers, but v1 activates only `samuel`. A second issuer requires its own profile, consent, signature and series.

### D9 — Bank details

Cuenta de cobro: per-client/default toggle, editable per draft; default off unless required.  
Invoice: default on, editable before finalize.

### D10 — Page size

US Letter for both v1 templates.

### D11 — Finance write-back

None in v1. `Enviar Cuenta` and other Finance/AppSheet workflow actions remain unchanged.

### D12 — Historical import

Historical import is deliberately after the working v1 product. Start with metadata + original PDFs for the approved 2026 scope, then expand only if useful. Legacy import must never consume new-series numbers.

### D13 — sd•live branding

The legal issuer remains Samuel. `sd•live · Creative Audio` may appear as **optional, discreet visual branding** only.

- branding must never imply that SD.Live is the legal issuer;
- template/profile configuration must allow the branding to be disabled without schema changes;
- preview will be used to decide whether the mark stays in the final templates.

## 3. Real-document requirements

### Cuenta de cobro · CO · ES

Preserve the functional requirements of the current documents:

- city + issue date;
- document number;
- client legal name + NIT;
- issuer legal name + CC;
- amount in Spanish words + numeric total;
- one or multiple work lines;
- PO/OC may exist **per line**, not only per document;
- structured `usesCostsDeductions` flag for the retention declaration;
- optional bank/payment line;
- automatic signature;
- issuer identification/contact, CIIU and VAT-status labels.

Several REGISTRO jobs may be grouped in one Cuenta de cobro if client and currency are compatible.

### Invoice · INTL · EN

One flexible template handles both services and reimbursements. It may mix line kinds such as:

- professional service;
- equipment;
- per diem;
- transport;
- reimbursable expense;
- other.

A line may retain informational original-currency context, e.g. original COP expense billed in USD. Document currency remains singular; conversions are never implicit.

Invoice includes issuer/client details, project/service period, optional PO, line items, total, payment information and automatic signature. Due date/terms may be present when relevant.

### Signature

Final documents always include the issuer signature automatically.

- signature asset is private and never committed to git;
- upload accepts a cleaned transparent PNG (SVG only if safely sanitized/rasterized);
- draft preview does **not** expose the signature bytes and shows a placeholder;
- final PDF injects the active signature asset and records its asset ID/hash in the snapshot.

## 4. Architecture

Documents is another module of the existing Worker, not a separate service and not a second Finance system.

Proposed modules:

- `documents-domain.js` — pure domain logic: minor-unit money, line calculations, Spanish amount-in-words, validation, state machine, canonical snapshot/hash.
- `documents-kinds.js` — versioned kind/template registry in code.
- `documents-schema.js` — Documents DDL/triggers, only invoked by explicit preparation.
- `documents-admin-storage-preparation.js` — storage preflight + confirmed preparation.
- `documents-storage.js` — drafts, sequences, finalize CAS/batch, events and registry queries.
- `documents-templates/shared.js`
- `documents-templates/cc-co-es.v1.js`
- `documents-templates/invoice-intl-en.v1.js`
- `documents-pdf.js` — final render, private R2 write and hashes.
- `documents-finance-prefill.js` — read-only REGISTRO prefill.
- `documents-api.js` — authenticated `/api/admin/documents/*` routes.
- `admin/documents/` — registry, editor/preview, clients and settings.

Released template versions are immutable; template changes add a new version.

PDF rendering must be deterministic and make no external network requests. Fonts/assets needed for rendering must be locally available to the renderer.

## 5. Data model

Dedicated `DOCS_DB` should contain these concepts:

### `doc_issuer_profiles`

Mutable defaults for legal issuer identity, IDs, VAT/CIIU/contact/address, market-specific bank data, optional brand label and active signature ID. Finalized snapshots copy the relevant values.

### `doc_signature_assets`

Private signature metadata: issuer, R2 key, content type, sha256, dimensions and retirement timestamp. Assets are retired, not overwritten.

### `doc_client_profiles`

Lightweight client directory containing editable defaults:

- display/legal name;
- tax ID;
- billing/contact details;
- default kind/currency;
- payment terms;
- PO policy (`none`, `document`, `line`, `required`);
- bank-display default;
- Finance aliases used to match `REGISTRO.Cliente`.

Every value remains editable per draft.

### `doc_sequences`

One row per issuer/type series. Holds `next_value`, display pattern, test flag and bootstrap audit metadata.

### `doc_documents`

Core registry record:

- UUID;
- kind/type/issuer/client;
- `draft | finalized | void`;
- `system | legacy_import` origin;
- number/series/display number;
- searchable client/project/PO/date/currency/total fields;
- mutable draft JSON + revision;
- immutable snapshot JSON + hash + template version;
- supersedes relations;
- void metadata;
- finalize idempotency key;
- PDF status/keys/hashes;
- timestamps.

`UNIQUE(series_key, number)` is mandatory.

### `doc_document_sources`

Links document lines to source records such as `REGISTRO.ID`. Stores observed source facts for audit/divergence comparison. Source links freeze at finalize.

### `doc_document_events`

Append-only audit events such as draft created/updated, finalized, PDF rendered/failed, voided, superseded, downloaded, legacy imported, sequence bootstrapped and signature uploaded/retired.

### Database immutability

D1 triggers must prevent:

- deleting issued documents;
- changing finalized snapshot/number/template/issuer/core economic fields;
- invalid status transitions;
- updating audit events.

After finalize only explicitly allowed lifecycle/artifact columns may change.

## 6. Snapshot contract

Finalized `snapshot_json` schema starts at `sdlive.document.snapshot/1` and must contain everything necessary to reproduce the issued document independently of later profile/Finance/template-default changes.

At minimum:

- kind/type/market/language/template version;
- number + series + display;
- issue city/date, due date and terms where used;
- complete issuer copy + signature asset ID/hash;
- complete client copy;
- project/service period;
- document-level PO;
- currency;
- full line items including per-line PO/reference;
- totals and amount-in-words + override flag;
- versioned legal/retention block state;
- bank visibility/details;
- supersedes notice;
- notes;
- source references.

Snapshot hash is sha256 of canonical JSON.

Money uses integer minor units. One currency per document. COP/USD are never combined or converted implicitly. Original-currency reimbursement details are informational metadata only.

## 7. Numbering and finalize

Drafts never have real numbers. Preview shows no definitive number.

Finalize must be atomic and idempotent:

1. re-read and validate the current draft server-side;
2. verify active issuer/signature and required fields;
3. read expected sequence value;
4. build snapshot using that number;
5. atomically CAS-increment the sequence and convert the draft to finalized only if draft revision/series expectations still hold;
6. establish supersedes/source/event rows in the same logical operation;
7. re-read and return the finalized record;
8. render PDF from the frozen snapshot.

A per-confirmation `finalizeKey` makes network/double-click retries idempotent.

If PDF generation fails, the number is **not released**. The document remains finalized with a failed artifact state and can regenerate the PDF from the frozen snapshot.

Real series bootstrap is explicit and audited. It may only raise a sequence and never move below already-issued numbers.

Initial intended real bootstrap after test smoke:

- `samuel:CC = 21`
- `samuel:INV = 19`

Legacy imports have `series_key = NULL`, their historical text number, and never occupy new-series numbers.

## 8. Lifecycle

v1 states:

- `draft`
- `finalized`
- `void`

`Superseded` is a relation, not a state.

Allowed flows:

- Draft → Finalized
- Draft → deleted/discarded
- Finalized → Void (reason required; number/PDF retained)
- Finalized → Reissue: create a new draft copied from snapshot with `supersedes_id`; original only receives `superseded_by_id` when the new document finalizes.

`Sent` and `Paid` are not document states in v1. Finance/payment truth remains in REGISTRO/AppSheet.

## 9. Storage map

| Data | Store |
|---|---|
| Profiles, sequences, drafts, snapshots, sources, events | `DOCS_DB` |
| Final PDF | private `DOCS_BUCKET` |
| Deterministic final rendered HTML when retained | private `DOCS_BUCKET` |
| Signature assets | private `DOCS_BUCKET` |
| Legacy PDFs | private `DOCS_BUCKET` |
| Jobs/amounts/payment state | Google Sheets `REGISTRO`, unchanged/read-only |

No public/signed URLs in v1. Authenticated Admin PDF download streams the private object with `Cache-Control: no-store`.

## 10. Finance integration

Read-only prefill rules:

- map client through `finance_aliases_json`;
- line description from operational role/project context;
- dates from work span;
- amount = **`Valor bruto`**, never `ownerGenerated`, `Valor Neto` or `Valor Recibido`;
- currency from `Moneda`;
- source reference = durable `REGISTRO.ID`.

Multi-select may group rows only when compatible client/currency rules pass. `Cobro terceros` may trigger an internal editor note, but never silently changes the billed contractual amount.

Issued document views may show Finance divergence later, but nothing auto-corrects an issued snapshot.

Documents must issue **zero** write requests to Sheets.

Future Rental Quotes reuse the authoritative existing backend pricing; Documents never creates a second Rental pricing engine.

## 11. UX

Routes:

- `/admin/documents/` — registry
- `/admin/documents/new?...` — create/prefill
- `/admin/documents/<id>` — draft editor or final viewer
- `/admin/documents/clients/`
- `/admin/documents/settings/`

Registry supports filters/search by client, number, type, year, status, currency, PO and project. COP/USD totals stay separate. Test series are hidden by default.

Editor sections:

- Issuer
- Client
- Document metadata
- Line items
- Text/legal blocks
- Bank/details toggles
- Notes
- Preview

Every draft field is editable. Changes to a draft never automatically mutate Finance or the client/issuer profiles.

Preview uses the same template engine as final rendering, shows a DRAFT/BORRADOR watermark, consumes no number and does not receive signature bytes.

Finalize confirmation should state the prospective number, client, currency/total and that a signature will be applied.

Final view provides PDF, download, duplicate, reissue with PO, void and event/history context.

Mobile may present Form and Preview as tabs.

## 12. Visual direction

### Cuenta de cobro

Professional, modern, still recognizably a Colombian Cuenta de cobro:

- optional subtle `sd•live · Creative Audio` branding;
- legal issuer clearly Samuel David Llano Muñoz;
- title + number + city/date;
- Client / Issuer cards;
- strong amount box with Spanish words and numeric COP;
- concept table with per-line date/PO/value;
- versioned legal certification block;
- optional payment line;
- automatic signature + legal issuer facts;
- trace footer with document number/hash.

If branding visually competes with or confuses the legal issuer, it is disabled.

### Invoice

Professional international invoice:

- optional subtle `sd•live · Creative Audio` branding while Samuel remains legal issuer;
- Invoice metadata, Bill To and Engagement blocks;
- flexible service/reimbursement line items;
- grouped sections/subtotals when helpful;
- original-currency reimbursement metadata where applicable;
- prominent total due;
- payment details;
- automatic signature;
- trace footer/hash.

## 13. Security

- all Documents UI/API remains behind existing Admin Access verification;
- private R2 only;
- signature bytes never exposed in draft preview;
- authenticated PDF streaming only, no public links in v1;
- strict JSON/mutation size limits;
- safe logging: no ID numbers, bank data, signatures or unnecessary PII in logs;
- SVG uploads, if accepted, must be sanitized or rasterized;
- tests must reject references to public `MEDIA_BUCKET` / `MEDIA_PUBLIC_BASE` and any Sheets write path.

## 14. Implementation plan

Implement one PR at a time:

### PR 0 — Docs / Active Gate

- add this contract;
- promote Documents to Active Gate in master docs;
- connect/supersede the historical Future Finance Document Generator note;
- no runtime changes or smoke.

### PR 1 — Storage foundation

- schema/triggers;
- explicit preparation/preflight endpoints;
- missing-binding fail-closed behavior;
- D1/R2 bindings only after real resource IDs exist;
- guard tests for no public media / no Sheets writes.

Production-sensitive step after merge: owner-controlled resource/preparation action.

### PR 2 — Domain + atomic numbering

- domain functions;
- kinds registry;
- sequence/finalize storage logic;
- concurrency/idempotency/immutability tests;
- no visible UI required.

### PR 3 — Profiles + signature + test sequences

- issuer/client APIs + UI;
- private signature upload;
- sequence/bootstrap API and Settings UI;
- production-sensitive smoke uses test series only.

### PR 4 — Draft editor + preview + templates

- draft CRUD/revisions;
- registry shell/editor UI;
- `cc-co-es@1` and `invoice-intl-en@1` draft render;
- no real finalize yet.

### PR 5 — Finalize + signed PDF

- atomic finalize route;
- Browser renderer;
- private R2 PDF/HTML artifact flow;
- download/void/retry/events;
- smoke with `test:CC` only.

Only after this smoke, explicitly bootstrap real `samuel:CC=21` and `samuel:INV=19`.

### PR 6 — Finance prefill/linking

- create document draft from one or multiple compatible REGISTRO rows;
- source links;
- linked-document reads in Finance;
- Finance remains read-only.

### PR 7 — Reissue + PO + registry completion

- supersedes/reissue with PO;
- printed replacement notice;
- complete filters/history UX.

### PR 8 — Legacy import

- read-only extraction/import workflow;
- owner review before import;
- approved historical metadata/PDF scope into private storage;
- legacy numbers preserved exactly.

Later, not v1: receipts appendix, email/send action, Rental Quote/Cotización kinds, second issuer.

## 15. Required automated coverage

At minimum:

- Spanish amount-in-words edge cases;
- integer money/line math and rounding;
- amount override behavior;
- single-currency validation;
- stable canonical snapshot hashes;
- drafts consume no number;
- concurrent finalize same doc → one number;
- concurrent different docs → distinct numbers;
- same `finalizeKey` → same result;
- stale draft revision → conflict;
- finalized immutability triggers;
- void terminal rules;
- bootstrap raise-only / exact confirmation / not below MAX+1;
- reissue relation preserves original;
- Finance prefill uses `Valor bruto`;
- zero Sheets writes;
- template snapshots and no external network URLs;
- draft preview has no final number/signature asset;
- authenticated access and private media invariants.

## 16. Acceptance criteria

v1 is complete only when:

1. One or more Finance jobs can create a prefilled Cuenta de cobro draft while every field remains editable.
2. Preview closely matches final layout, shows BORRADOR/DRAFT, has no real number and exposes no signature bytes.
3. Finalize produces a signed, ready-to-send Letter PDF with the next unique number in one operation.
4. Double click/retry never consumes duplicate numbers or creates duplicate issued documents.
5. Registry search by client/number/PO/project finds historical and new records.
6. Reissue with PO receives a new number and preserves the original.
7. Void retains its number, snapshot and PDF.
8. Later changes to Finance/profiles/templates cannot mutate an issued snapshot/PDF.
9. Invoice EN can mix service, per diem and reimbursement lines while preserving informational original-currency data.
10. Documents performs no Google Sheets writes and leaves REGISTRO/AppSheet behavior unchanged.
11. Signature assets and issued PDFs are not reachable from public media URLs.
12. The visible sd•live branding can be disabled without changing issuer/legal data or document history.

## Exact continuation

**PR 0 is the active step. After it is merged with green CI, inspect current `main` and begin PR 1 storage foundation. Before committing real D1/R2 bindings, obtain the actual Cloudflare resource IDs; never deploy placeholder IDs. Do not create/prepare production storage or bootstrap real document sequences as an implicit side effect of a code merge.**
