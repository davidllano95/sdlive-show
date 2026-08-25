# Future Finance Document Generator

Status: **Future roadmap / not active**

Date recorded: **2026-08-25 — America/Bogota**

This document preserves a future SD.Live Finance capability without promoting it into the current Active Gate.

## Goal

Add an Admin-side document generator capable of creating, storing and exporting professional SD.Live commercial/financial documents from existing operational data where possible.

Initial document types:

- **Cuenta de cobro**
- **Cotización**
- **Factura**

The module should feel like part of the existing Finance workspace rather than a second standalone finance system.

## Product direction

### 1. Reuse existing data first

Where the source data already exists, prefill documents instead of asking the user to type the same information again.

Potential sources:

- SD.Live Track / `REGISTRO`
- Finance read model
- Rental quote/request data
- future CRM/client records
- future project/event records

Reusable fields may include:

- client / company
- project / show
- work dates
- services / line items
- quantities
- currency
- gross/net values
- taxes / fees / withholdings where applicable
- notes
- billing/contact data

Do **not** create a second source of truth for event/payment state merely to generate documents.

### 2. Cuenta de cobro

Future workflow should support:

- select an existing event/work item or start manually;
- prefill client, project, date and amount;
- reusable SD.Live issuer/profile data;
- payment/bank instructions;
- concept/description;
- optional line-item breakdown;
- taxes/withholdings display where appropriate;
- document number/reference if desired;
- PDF preview;
- PDF export/download;
- optional email/send workflow;
- attach/reference the generated document from the related Finance record without changing formula-owned Sheet fields unexpectedly.

### 3. Cotización

Future workflow should support:

- manual quote creation;
- quote from Rental request/cart;
- quote from client/project data;
- reusable service/equipment line items;
- quantities, rates, days and discounts;
- COP/USD support;
- subtotal/tax/total presentation;
- validity date;
- terms and conditions;
- notes/exclusions;
- branded PDF;
- version/revision history;
- Draft / Sent / Accepted / Rejected / Expired lifecycle if later approved;
- duplicate/revise quote;
- convert an accepted quote into a downstream billing document without retyping all line items.

This broadens the existing Rental-roadmap item for an automatic PDF quotation into a reusable Finance capability rather than a Rental-only PDF generator.

### 4. Factura

The UI may eventually prepare invoice data and presentation, but **a locally generated PDF must never be represented as a legally valid Colombian electronic invoice merely because it looks like one**.

Before activating real invoicing, evaluate:

- DIAN electronic invoicing requirements applicable to SD.Live/the issuer;
- numbering/resolution requirements;
- taxes and issuer responsibilities;
- whether integration with an authorized electronic-invoicing provider/API is required;
- CUFE/QR/XML or other mandatory artifacts when applicable;
- cancellation/credit-note/debit-note workflows if required;
- immutable audit/version history.

Until compliant electronic invoicing is designed and verified, the module may only provide an explicitly non-fiscal **invoice draft / pro-forma style document** where legally appropriate.

### 5. Shared document engine

Prefer one underlying document model/rendering engine with type-specific templates instead of three unrelated implementations.

Shared capabilities should include:

- SD.Live branding/template system;
- issuer profile;
- client profile;
- line items;
- currency formatting;
- dates and document IDs;
- calculations with server-side validation;
- PDF rendering;
- preview before finalization;
- save Draft;
- revision/version history;
- duplicate document;
- status/history timeline;
- secure Admin-only access;
- responsive desktop/mobile creation experience.

## Suggested future information model

A future document record could conceptually contain:

- document ID
- document type
- document number/reference
- status
- created/updated timestamps
- issuer snapshot
- client snapshot
- linked source record IDs
- project/show reference
- currency
- line-item snapshots
- subtotal
- taxes/fees/withholdings
- total
- validity/due date where applicable
- terms/notes
- generated artifact reference
- revision/version

The exact schema must be designed only when the feature is promoted. Do not infer it from this roadmap note.

## Important architecture constraints

- Keep Google Sheets / SD.Live Track ownership rules intact until a deliberate migration/write model is approved.
- Do not write into formula-owned columns from the document generator.
- Server-side totals must remain authoritative for Rental-derived quotations.
- A document snapshot should remain historically reproducible even if client/rate data changes later.
- Generated documents need stable IDs/versioning before they are used operationally.
- Email delivery should be a separate auditable action, not an accidental side effect of previewing/generating a PDF.
- The feature remains **future backlog** and must not interrupt the current visual/Admin stabilization gate.

## Potential later enhancements

- saved client billing profiles;
- reusable service/rate catalog;
- recurring templates;
- digital acceptance of quotations;
- expiration reminders;
- quote → account-for-payment/invoice conversion;
- payment-status association;
- Drive archival;
- email templates and attachment delivery;
- automatic document naming and folder structure;
- client-facing secure document link;
- CRM association once the CRM source-of-truth is approved;
- analytics such as quote acceptance rate and quoted vs invoiced revenue.

## Promotion criteria

Do not promote this feature until:

1. the current Admin/Finance stabilization work is closed;
2. Finance source-of-truth/write ownership is explicit;
3. the initial document type and MVP workflow are selected;
4. legal/tax scope for `Factura` is clarified before implementing anything presented as a fiscal invoice;
5. PDF storage/versioning and client-data handling are designed.
