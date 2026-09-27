# SD.Live Documents v1 — Implementation contract

**Status:** ACTIVE GATE — runtime foundation/editor implemented through PR #275; irreversible Finalize/PDF gate still pending.  
**Reconciled:** 2026-09-27 — America/Bogota  
**Verified GitHub base:** `561cfebbf059568fb028d2a76c28b275eebdbcad` — PR #275.

This file is the canonical implementation contract for SD.Live Documents v1. Current GitHub `main` + verified production behavior outrank this file if a conflict is discovered.

## 0. Workflow and guardrails

1. Workflow: `inspect current main → short branch → implement/update → tests/CI → PR → CI green → explain result → explicit owner authorization → squash merge → representative production smoke when runtime-relevant`.
2. Do not merge any new PR from this continuation without explicit owner authorization, even when CI is green.
3. Production-sensitive operations remain separate and explicit: real sequence bootstrap, real document finalization/issuance, production SQL, signature exposure/publication, paid Cloudflare changes and irreversible resource changes are never silent side effects.
4. Documents never writes to Google Sheets/AppSheet and never creates a D1 Finance mirror.
5. Do not use `CMS_DB`, `MEDIA_BUCKET` or `MEDIA_PUBLIC_BASE` for Documents. Signature and final artifacts remain private.
6. No DDL on ordinary traffic. Storage preparation is explicit and authenticated.
7. Vanilla JS / current flat-module repo style / `node --test` / Node 22 CI remain the implementation baseline.
8. Missing Documents bindings fail closed for Documents only.
9. `CORE IMPLEMENTED` and `PRODUCTION ENABLED` are distinct states and must stay distinct in docs, code review and UI language.

## 1. Product goal

`/admin/documents/` is a reusable private Admin registry/generator for professional documents, not a one-off PDF button and not a parallel accounting system.

Initial kinds:

| kind_id | type | market | language | template |
|---|---|---|---|---|
| `cc-co-es` | Cuenta de cobro | CO | es | `cc-co-es@1` |
| `invoice-intl-en` | Invoice | INTL | en | `invoice-intl-en@1` |

Future Quote/Cotización kinds may reuse the same foundation, but they are not part of the immediate MVP.

Target lifecycle:

`Draft → Preview → Finalize → atomic number + immutable snapshot → signed PDF → registry`

Draft and final rendering should share the canonical renderer path so preview does not become a decorative approximation of the real document.

## 2. Source-of-truth boundaries

### Finance

- Google Sheets remains Finance persistence.
- AppSheet SD.Live Track remains the primary mobile/offline Finance workflow.
- Documents may eventually read `REGISTRO` for prefill only.
- Document editing never writes back to Finance, Sheets or AppSheet.
- Document amounts are document facts; Finance `Valor bruto` may be used only as a prefill/default when explicitly sourced from REGISTRO.

### Documents storage

Dedicated resources exist:

- D1 binding: `DOCS_DB` → `sdlive-documents-production`;
- private R2 binding: `DOCS_BUCKET` → `sdlive-documents-private`.

Private signature/PDF artifacts must not use public `MEDIA_BUCKET`.

Settings/read APIs must not expose:

- signature bytes;
- private R2 keys;
- public signature URLs;
- unnecessary personal/bank identifiers.

## 3. Adopted numbering decisions

### Cuenta de Cobro

New Documents records use a global per-issuer series:

- planned series: `samuel:CC`;
- proposed next number: `21`.

Historical client-scoped numbering remains historical and is never renumbered.

### Invoice

Invoice continues its global series:

- planned series: `samuel:INV`;
- proposed next integer: `19`;
- display default: `0019`.

Internal identity is always `(series_key, INTEGER number)`. Never infer sequence state from formatted display text.

### Real bootstrap rule

The values above are planning values only until verified against current storage and explicitly authorized.

- drafts never consume a number;
- a finalized/issued number is never reused, including after Void or PDF failure;
- bootstrap is explicit, audited and may raise but never lower a series;
- real series must not be created as a normal deploy side effect.

## 4. Reissue / Void decisions

Void:

- preserves record, number, snapshot and existing artifact;
- never releases the number;
- requires reason/audit metadata.

Reissue:

- creates a new document/draft;
- receives a new number when finalized;
- receives a new snapshot;
- records a `supersedes` relationship;
- preserves the previous issued document.

The legacy `.5` convention is retired for new Documents records.

## 5. Signature contract

Final documents must include the issuer signature automatically.

- signature asset lives only in private R2;
- signature metadata/hash lives in Documents D1;
- draft preview never receives usable signature bytes;
- Draft may show a placeholder rather than the actual signature;
- signature is not hardcoded in GitHub;
- no public signature URL is created;
- previous signature assets may be retained/retired rather than overwritten.

The final workflow is automatic. Do not design a manual `download → sign → upload` process.

## 6. Current implementation state — PR #260 through #275

### ✅ PR #260 — Active Gate contract

Documents was promoted to the selected Control Center workstream.

### ✅ PR #262 — storage foundation

Implemented:

- Documents schema/triggers;
- explicit storage preparation + read-only preflight;
- dedicated `DOCS_DB`;
- private `DOCS_BUCKET`;
- safe test sequences only;
- Admin/Auth boundary for Documents routes.

No real Samuel sequence bootstrap was added.

### ✅ PR #263 — domain + finalization core

Implemented:

- immutable v1 kind registry;
- integer minor-unit calculations;
- Spanish amount-in-words;
- canonical JSON + SHA-256 snapshot hashing;
- `sdlive.document.snapshot/1`;
- sequence formatting/contracts;
- D1 atomic finalization core using sequence CAS and draft revision guard;
- `finalizeKey` idempotency;
- supersedes relation handling;
- explicit audited sequence bootstrap primitive that may raise but never lower a series;
- `pdf_status=pending` semantics so PDF failure does not release a reserved number.

Important: this is a **domain/storage primitive**, not a production-enabled Admin Finalize workflow.

### ✅ PR #264 — profiles + private signature settings

Implemented:

- issuer profile CRUD;
- client billing profile CRUD;
- private PNG signature upload;
- signature metadata/hash and active asset relationship;
- retirement/history behavior;
- Documents Settings workspace;
- numbering safety display;
- test-sequence verification.

### ✅ PR #265 — draft editor + preview

Implemented:

- draft CRUD;
- optimistic `draftRev` concurrency;
- registry/editor shell;
- document-local issuer/client overrides;
- autosave;
- line items;
- preview API;
- renderer `cc-co-es@1`;
- renderer `invoice-intl-en@1`;
- sandboxed preview.

Draft guarantees:

- watermark `BORRADOR` / `DRAFT`;
- no definitive document number;
- no real signature bytes;
- no number consumption.

### ✅ PR #266 — Admin brand/navigation

Documents joined the shared Admin visual/navigation system.

Canonical primary order:

`Dashboard → Finance → Documents → Calendar → Site Editor → Inbox`

### ✅ PR #267 — settings hardening

Production-smoke fixes included:

- issuer active state;
- bank profile fields;
- address preservation;
- canonical client profile IDs;
- client default kind/currency;
- preservation of metadata not yet exposed by UI;
- inactive issuers excluded from New Draft;
- client defaults applied on selection.

### ✅ PR #268 — cleanup/deletion UX

Implemented:

- issuer selection/new/delete;
- client delete;
- draft delete;
- draft-only deletion guard;
- permanent preservation of issued/finalized/void records;
- dependency checks for profiles;
- cleanup of private signature asset for unused issuer when appropriate.

### ✅ PR #269 — editor/renderer polish

Implemented:

- ordered localized bank details;
- issue city/date placement;
- money with two decimals;
- document PO/reference;
- due date;
- terms;
- notes;
- quantity/unit/rate/line-total editor controls;
- responsive line-item layout;
- canonical issuer ID preference.

### ✅ PR #270 — optional quantity + date ranges

Implemented:

- optional quantity (`0`/blank = hidden/not applicable);
- optional unit;
- line date from/to;
- date range rendering;
- snapshot normalization preserving quantity/unit/end date;
- original-expense currency/amount metadata limited to Invoice.

### ✅ PR #271 — CC layout + no-date UX

Implemented:

- centered `Por concepto de` heading;
- CC table/layout refinement;
- line type/unit metadata;
- explicit `Sin fecha / No date` control;
- date-range clearing semantics.

### ✅ PR #272 — simple concept mode

CC automatically supports compact concepts + values when structured metadata is unused.

### ✅ PR #273 — Itemize toggle + General rate

CC gained an explicit `Itemize line items` toggle.

- Itemized: per-line pricing/details.
- Non-itemized: a single `General rate / total` drives the document amount.
- Invoice remains itemized-only.

### ✅ PR #274 — concepts in non-itemized mode

Non-itemized CC preserves one or many editable concept lines while hiding quantity/unit/rate/date/PO/per-line totals. Structured line data remains underneath for later reactivation of Itemize.

### ✅ PR #275 — document visual system polish

Implemented:

- document typography standardized to two families;
- blank Visual Brand renders no branding;
- per-document `Show SD•Live logo` option using an existing repo asset;
- standard document wordmark `SD•Live` + `Creative Audio` + rule;
- city/date header organization;
- removed `Atentamente`;
- issuer email in signature block;
- `Por concepto de` before Project / PO metadata;
- aligned Project / PO metadata;
- footer `SD•Live Documents`;
- Invoice visual consistency.

Product name remains **SD.Live**. `SD•Live` is a visual wordmark treatment inside documents where enabled.

## 7. Current document behavior

### Cuenta de Cobro · CO · ES

The editor/renderer can represent both simple and detailed cases.

#### Simple / non-itemized

Example structure:

`Por concepto de`

- Diseño de sonido
- Programación QLab

`La suma de: $ X`

When not applicable, do not force:

- quantity;
- unit;
- dates;
- per-line PO;
- line rates;
- per-line totals.

The user controls itemization explicitly.

#### Detailed / itemized

May use:

- quantity;
- unit;
- line type;
- date/date range;
- PO/reference per line;
- rate;
- line totals.

### Invoice · International · EN

Remains itemized and supports:

- professional services;
- expenses/reimbursements;
- mixed line kinds;
- quantity/unit/rate;
- date/date range;
- PO/ref;
- original currency/original amount informational metadata;
- USD totals;
- bank information when enabled.

No implicit currency conversion is allowed.

## 8. Snapshot/finalization core contract

The existing `finalizeDocument()` core is intended to:

1. re-read the current draft server-side;
2. require a valid series matching issuer/type;
3. build a final snapshot from draft + resolved issuer/client/signature context;
4. use the current sequence number;
5. atomically CAS-increment the sequence and change the exact draft revision to finalized;
6. persist immutable snapshot JSON/hash/template version;
7. persist finalize idempotency key and audit/source rows;
8. establish supersedes behavior when present;
9. return the finalized row;
10. leave `pdf_status=pending` for a later artifact step.

Retries with the same valid `finalizeKey` must return the already finalized result rather than consume another number.

If an artifact later fails, the number stays consumed and PDF generation retries from the frozen snapshot.

## 9. What is NOT production-enabled yet

The following remain pending despite the core primitive existing:

- Admin Finalize endpoint/route;
- user confirmation UX;
- explicit prospective-number confirmation;
- API-level authorization/fail-closed path for irreversible Finalize;
- user-visible conflict/retry behavior;
- real series bootstrap;
- real-number-consuming finalize smoke;
- final signature injection into an artifact pipeline;
- Browser/PDF rendering;
- private final PDF persistence/retrieval;
- final viewer/download UI;
- complete finalized/void/reissue registry UX.

Therefore docs and UI must not say `Finalize complete` merely because `finalizeDocument()` exists internally.

## 10. Immediate prerequisite — production visual review

Before exposing irreversible Finalize, authenticated production should be checked with representative drafts after PR #275:

- CC simple;
- CC non-itemized with multiple concepts;
- CC detailed;
- Invoice services + expenses;
- blank visual brand;
- SD.Live branding without logo;
- branding with logo;
- bank details on/off.

Current GitHub Actions CI for `main`/PR #275 is green. GitHub does not by itself prove the latest Cloudflare deployment or authenticated Documents rendering, so deployment/visual smoke remains a separate verification step.

## 11. Next runtime milestone — Finalize production gate

The next recommended bounded PR is **Finalize API + confirmation UX using test series only**.

Scope should include:

- authenticated Admin Finalize route;
- server-side allowed-kind/issuer/status validation;
- exact `draftRev` expectation from the confirmation screen;
- fresh sequence peek and prospective number display without consumption;
- generated `finalizeKey` per confirmation attempt;
- explicit irreversible confirmation;
- call into the existing `finalizeDocument()` core rather than reimplementing numbering;
- conflict/error mapping (`stale draft`, `sequence changed`, duplicate/retry, invalid signature/profile context);
- registry/editor transition from Draft to Finalized state;
- regression tests for double click/network retry/no double-number consumption;
- test series only for runtime smoke.

Explicitly out of this first Finalize gate unless separately reviewed:

- real `samuel:CC` / `samuel:INV` bootstrap;
- real document issuance;
- Browser binding;
- PDF generation;
- Finance prefill;
- Void/Reissue UI completion.

This separation keeps numbering correctness reviewable before artifact generation adds another failure domain.

## 12. Real sequence gate

Before any real bootstrap:

1. inspect current Documents storage state;
2. verify historical/current numbering outside display strings;
3. confirm the proposed next values with the owner;
4. use the explicit audited bootstrap operation;
5. ensure it cannot decrement or collide with issued rows;
6. record actor/time/note;
7. never perform bootstrap as deploy code.

No real bootstrap is authorized by this roadmap update.

## 13. PDF milestone after Finalize gate

Only after Finalize API/UX is reviewed and safe:

- add `BROWSER` binding when implementation actually requires it;
- use the canonical renderer from the frozen snapshot;
- inject the active private signature;
- generate final PDF;
- store in private `DOCS_BUCKET`;
- persist artifact key/hash/status without exposing the private R2 key to the browser;
- expose authenticated download with `Cache-Control: no-store`;
- retry artifact generation from the immutable snapshot;
- never release/reuse the number after artifact failure.

## 14. Final registry/lifecycle milestone

Complete lifecycle UX for:

- Draft;
- Finalized / Generated;
- Void;
- Superseded relationship;
- Reissue;
- download/history/events;
- client history.

Future `Sent` / `Paid` labels may be added only with a clear relationship to Finance source-of-truth; Documents must not invent a parallel payment ledger.

## 15. Finance integration milestone

Read-only prefill rules when implemented:

- client matching through approved aliases;
- line description from work context;
- work dates from source span;
- amount default from `Valor bruto`;
- currency from source currency;
- durable `REGISTRO.ID` as source reference;
- no automatic mutation after finalization;
- zero Sheets writes.

`Cobro terceros` may inform editor context but must never silently change contractual billed amount.

## 16. Legal/accounting review

Colombian tax/retention wording is template-versioned and should be reviewed with an accountant/legal professional before being treated as authoritative production wording.

Do not describe this feature as DIAN electronic invoicing.

- Cuenta de Cobro is Cuenta de Cobro.
- International Invoice is a commercial international document, not Colombian electronic invoicing.

## 17. Security tests / invariants

Tests and code review must preserve:

- no public `MEDIA_BUCKET` signature/PDF usage;
- no signature bytes/private R2 keys in settings responses;
- no Sheets/AppSheet write path from Documents;
- draft preview never reads the real signature asset;
- drafts never consume numbers;
- sequence CAS + unique `(series_key, number)` protection;
- idempotent finalize retry;
- stale draft revision conflict;
- immutable finalized snapshot/number;
- no finalized deletion;
- explicit audited real bootstrap only;
- artifact failure never frees a number.

## 18. Historical import / future scope

After the working product is stable:

- optional approved historical import preserving historical identifiers/artifacts;
- Quote/Cotización kinds;
- additional issuers/jurisdictions;
- deeper workflow metadata such as Sent/Paid if source-of-truth design is approved.

Historical import never consumes new-series numbers.

## 19. Exact continuation

1. Merge the docs-reconciliation PR only after CI is green **and the owner explicitly authorizes the merge**.
2. Reconfirm `main` after merge.
3. Verify authenticated production visual behavior after PR #275 if not already verified.
4. Open one bounded runtime PR for **Finalize Admin API + confirmation UX using test series only**, calling the existing finalization core.
5. Do not bootstrap real sequences, issue a real document, add Browser/PDF or perform irreversible production operations without separate explicit authorization/scope.
