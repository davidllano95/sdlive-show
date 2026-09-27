# Future Finance Document Generator — historical precursor

**Status:** **PROMOTED / SUPERSEDED BY SD.Live Documents v1**  
**Originally recorded:** 2026-08-25 — America/Bogota  
**Promoted:** 2026-09-26 — America/Bogota

This file preserves the original roadmap direction that led to the active SD.Live Documents workstream. It is no longer the implementation contract.

Current canonical contract:

`docs/roadmap/sdlive-documents-v1.md`

Current project status:

`PROJECT_STATUS.md`

## What from this note remains valid

The original direction was to add an Admin-side document generator capable of creating, storing and exporting professional commercial/financial documents from existing operational data while **not** creating a second Finance source of truth.

That direction is now implemented as the broader **SD.Live Documents** module rather than as a Finance-only PDF utility.

Core principles preserved in the active contract:

- reuse existing data first;
- Finance/REGISTRO remains source-owned by Sheets/AppSheet;
- document drafts may prefill from Finance but do not write back in v1;
- issuer/client/line-item data is editable per draft;
- server-side validation remains authoritative;
- preview before finalization;
- stable document IDs and history;
- immutable/reproducible finalized snapshots;
- PDF storage/versioning designed before operational use;
- email/send remains a separate auditable future action;
- Rental-derived quotations must reuse authoritative backend pricing rather than duplicate it.

## Scope evolution

The original note grouped three concepts:

- Cuenta de cobro;
- Cotización;
- Factura.

The approved v1 scope is narrower and more precise:

1. **Cuenta de cobro · Colombia · ES**
2. **Invoice · International · EN**

The previous separate service-vs-expense invoice idea is replaced by one flexible Invoice template capable of mixing services, per diem, transport and reimbursable expenses in a single line-item model.

Future, not v1:

- Cotización · CO · ES;
- Quote · INTL · EN;
- email/send actions;
- accepted-quote lifecycle;
- second issuer;
- receipt appendices.

These future kinds/actions reuse the same Documents registry, numbering, snapshot, profile, renderer and private artifact foundations.

## Cuenta de cobro direction carried forward

The active Documents contract supports:

- one or more work items in one account;
- editable client/project/date/amount/concept;
- per-line purchase-order/OC references;
- issuer profile;
- optional bank/payment details;
- versioned Colombian retention/legal text;
- system-controlled numbering;
- automatic signature;
- preview;
- permanent registry;
- reissue with a new number + supersedes relation.

Historical client-scoped numbering remains untouched. New Documents v1 Cuenta de cobro records intentionally use a global per-issuer sequence for traceability.

## Invoice direction carried forward

The active Invoice v1 is an international English document with:

- flexible service/reimbursement line items;
- issuer/client/engagement details;
- optional due date/terms/PO;
- bank/payment information;
- original-currency reimbursement metadata where useful;
- automatic signature;
- global sequential numbering continuing the existing invoice series.

## Cotización / Quote direction retained for later

Future quote creation may support:

- manual quote creation;
- quote from Rental request/cart;
- quote from client/project data;
- services/equipment line items;
- quantities, rates, days and discounts;
- COP/USD support;
- subtotal/tax/total presentation;
- validity date;
- terms/conditions and exclusions;
- branded PDF;
- revisions;
- later Draft/Sent/Accepted/Rejected/Expired lifecycle if explicitly approved;
- duplicate/revise quote;
- downstream document creation without retyping lines.

Rental remains authoritative for Rental pricing/availability rules.

## Colombian electronic invoice warning remains unchanged

A locally generated PDF must **never** be represented as a legally valid Colombian electronic invoice merely because it looks like one.

Before activating real Colombian electronic invoicing, separately evaluate and verify at implementation time:

- DIAN electronic-invoicing requirements applicable to the issuer;
- numbering/resolution requirements;
- taxes and issuer responsibilities;
- authorized provider/API requirements where applicable;
- CUFE/QR/XML and other mandatory artifacts;
- cancellation/credit-note/debit-note workflows;
- immutable audit/version history.

The current `invoice-intl-en` document is an international commercial invoice template and does not claim to be a Colombian DIAN electronic invoice.

## Shared engine direction — now adopted

The original recommendation to prefer one shared document model/rendering engine over unrelated generators is now an explicit architectural decision.

The active Documents v1 contract includes:

- optional sd•live visual branding while Samuel remains the legal issuer;
- Issuer Profile;
- Client Profile;
- private signature asset;
- flexible line items;
- currency/date/document formatting;
- atomic numbering;
- preview;
- Draft/Finalized/Void lifecycle;
- supersedes relation;
- permanent registry/events;
- private PDF storage;
- responsive Admin creation experience.

## Source-of-truth constraints — still mandatory

- Google Sheets / SD.Live Track retain Finance ownership.
- Documents does not write formula-owned or operational Finance fields in v1.
- No D1 Finance mirror.
- Billed documents prefill contractual `Valor bruto`, not owner-management calculations.
- Server-side Rental totals remain authoritative for future Rental quotes.
- Finalized document snapshots remain historically reproducible when source/profile/template defaults later change.
- Email delivery, if added later, is a separate explicit action.

## Exact continuation

**Do not implement from this historical note. Use `docs/roadmap/sdlive-documents-v1.md` and current `PROJECT_STATUS.md`. The old Future Finance Document Generator roadmap has been promoted into the active SD.Live Documents v1 workstream.**
