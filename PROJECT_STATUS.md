# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. GitHub `main` + comportamiento verificado en producción prevalecen sobre cualquier documento.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-27 / 2026-09-28 — America/Bogota** |
| Documents runtime base verificado | **`32f371277f8ba7911c98494a5ea08767303f2a24` · PR #295** |
| Producción | `https://sdlive.show` |
| Active Gate | **SD.Live Documents v1 — real-series production gate pending** |
| Documents current code | **Draft/Preview + TEST Finalize + immutable snapshot + private signed PDF + inline viewer + TEST corrections/revisions + approved v1 visual templates merged through #295** |
| Documents irreversible state | **TEST issuance/artifacts enabled; real `samuel:CC` / `samuel:INV` bootstrap and real-number issuance remain locked** |
| PILA | **Backlog / research candidate** |
| WhatsApp owner control | **PR #246 merged; rollout intentionally paused** |
| Bloqueado | **Generic Finance write-back / D1 Finance mirror / bidirectional sync** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. `docs/operations/documents-v1-maintenance.md` for Documents maintenance/versioning;
4. checkpoint/handoff fechado más reciente;
5. este archivo;
6. `README.md`;
7. `ROADMAP_MASTER_CHECKLIST.md`;
8. docs/prompts históricos.

**Stability > novelty. `MERGED != PRODUCTION VERIFIED`. `CORE IMPLEMENTED != PRODUCTION ENABLED`.**

## Workflow obligatorio

Runtime:

`inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge when authorized → representative production smoke when applicable`

Docs-only:

`inspect → branch → docs → CI → PR → CI green → squash merge when authorized`

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
- PDF failure never releases an issued number.
- Corrections create a new document/snapshot; they never mutate the issued source.

# Current Active Gate — SD.Live Documents v1

Canonical implementation contract:

`docs/roadmap/sdlive-documents-v1.md`

Canonical maintenance/versioning guide:

`docs/operations/documents-v1-maintenance.md`

## Product goal

Private Admin registry/generator for:

- `cc-co-es` — Cuenta de Cobro · Colombia · Español;
- `invoice-intl-en` — Invoice · International · English.

Target lifecycle:

`Draft → Preview → Finalize → atomic number + immutable snapshot → signed private PDF → registry`

Correction lifecycle:

`Issued → correction draft → same base number with -B/-C/... → immutable replacement artifact`

Future Quote/Cotización kinds reuse the same foundation but are not part of the immediate MVP.

# Documents current implementation — runtime merged through PR #295

## ✅ Foundation / editor / visual system — PRs #262–#275

Implemented:

- dedicated Documents D1/R2;
- schema + immutability triggers;
- explicit storage preparation;
- kind registry;
- integer money math;
- Spanish amount-in-words;
- canonical JSON/SHA-256 snapshot;
- sequence CAS;
- `draftRev` concurrency;
- `finalizeKey` idempotency primitive;
- issuer/client profiles;
- private signature assets;
- draft CRUD/editor/registry;
- sandboxed preview;
- CC simple/itemized/non-itemized behavior;
- Invoice services/expenses/FX metadata;
- shared document visual foundation.

## ✅ TEST Finalize gate / signed artifact / viewer — PRs #276–#291

Implemented and TEST-smoked:

- authenticated TEST-only Finalize;
- prospective number preview;
- exact `draftRev`;
- UUID `finalizeKey`;
- server-side issuer/client/signature validation;
- immutable final snapshot;
- Browser Rendering PDF generation;
- private signature injection;
- private content-addressed R2 PDF;
- PDF hash/status/events;
- safe retry from frozen snapshot;
- authenticated inline PDF viewer + explicit download;
- Draft opens Preview-first;
- Finalized/Void opens issued/PDF-first without showing the draft editor;
- state reset when switching back to Draft/New Draft.

## ✅ TEST correction / revision model — PR #292

Implemented and Invoice-smoked:

- original issued document stays immutable;
- correction creates a new draft cloned from the issued source;
- revision suffixes are `-B`, `-C`, ...;
- only latest unsuperseded issued record can create the next correction;
- one open correction draft per source;
- revision has its own sequence/counter;
- revision does not consume the next base number.

Verified smoke:

`TEST-INV 0004 → TEST-INV 0004-B → TEST-INV 0004-C`

and the next independent invoice remained:

`TEST-INV 0005`

## ✅ Approved Documents visual v1 — PRs #293–#295

Approved template baselines:

- `cc-co-es@1` — **V1 APPROVED**;
- `invoice-intl-en@1` — **V1 APPROVED**.

Shared family:

- Letter;
- 30pt title scale;
- shared typography/accent system;
- shared lower payment/signature geometry;
- 108px applied signature treatment;
- footer at page bottom.

Intentional Cuenta de Cobro identity retained:

- bordered rounded `La empresa` card;
- bordered rounded `Debe a` card;
- tinted rounded `La suma de` card;
- `Por concepto de`;
- Colombian retention certification;
- simple/non-itemized/itemized modes.

Future output-affecting changes must use a new template version rather than silently mutating historical v1 rendering. See the maintenance guide.

# Documents behavior now

## Cuenta de Cobro

Supports:

- simple concept mode;
- non-itemized one/multiple concepts with one General rate / total;
- detailed itemized mode with optional quantity/unit/date/range/PO/rate/line total;
- bank details on/off;
- private signature on final;
- legal retention block.

Approved title/number presentation:

`Cuenta de Cobro No. <display number>`

## Invoice

Supports:

- professional services;
- expenses/reimbursements;
- quantity/unit/rate;
- date/date range;
- PO/reference;
- arbitrary ISO 3-letter original expense currency;
- informational FX convention `1 USD = x original currency`;
- bank details on/off;
- private signature on final.

Approved title/number presentation:

`Invoice No. <display number>`

# What remains pending

## 1. Final TEST smoke for Cuenta de Cobro revisions

Before promoting revision behavior beyond TEST, verify the same invariant already proven for Invoice:

`TEST-CC n → TEST-CC n-B → TEST-CC n-C`

and confirm the next independent Cuenta de Cobro remains `n+1`.

## 2. Real-series preflight

Planned next base values remain:

- `samuel:CC` → proposed next `21`;
- `samuel:INV` → proposed next integer `19` / display `0019`.

Before bootstrap:

- inspect actual production `DOCS_DB` state;
- verify historical/current numbering;
- verify active real signature privately;
- verify display patterns against the approved v1 templates.

**Known pre-production issue to resolve:** current planned bootstrap `displayPattern` strings still include the textual labels `CUENTA DE COBRO No.` / `Invoice No.`, while the approved v1 templates now render those labels themselves. Do not bootstrap real series until the stored display-number contract is reconciled so labels cannot duplicate.

## 3. Explicit real bootstrap / first real issuance

Requires owner authorization after preflight.

Then:

- bootstrap via the audited primitive only;
- issue one controlled real CC;
- issue one controlled real Invoice;
- verify number, snapshot, signature, private PDF, viewer and registry.

No real bootstrap as deploy side effect.

## 4. Real correction/revision enablement

Current `-B/-C` correction logic is TEST-series-only. Decide and review separately before enabling for real series.

## 5. Remaining lifecycle UX

Still useful after real issuance:

- Void UX/reason/history polish;
- supersedes/superseded-by chain display;
- document events/history;
- client history;
- optional lifecycle labels that do not create a parallel Finance ledger.

## 6. Finance read-only integration

Future prefill may read `REGISTRO` and default billed amount from `Valor bruto`, but Documents performs zero Sheets/AppSheet writes.

## 7. Legal/accounting review

Colombian retention/tax wording remains template-versioned and should be reviewed with an accountant/legal professional before being treated as authoritative. Do not present Documents as DIAN electronic invoicing.

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
- **SD.Live Patch** — selected major workstream after Documents is closed/production-ready.
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.
- Finance cleanup/debt.
- PILA estimator research/planning when deliberately selected.

# Exact continuation point

**Documents visual v1 is approved through PR #295. Next: complete the TEST Cuenta de Cobro revision smoke, then perform a read-only real-series/signature preflight. Reconcile the planned real display patterns before any bootstrap. Real `samuel:CC` / `samuel:INV` sequence bootstrap, real-number issuance and enabling real corrections remain separate explicit production gates. For any future renderer or lifecycle change, read `docs/operations/documents-v1-maintenance.md` first.**
