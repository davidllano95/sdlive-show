# Finance owner-money + third-party UX closeout — 2026-09-26

**Status:** CLOSED / CI PASS / SHEETS-APPSHEET ALIGNMENT PASS / PRODUCTION SMOKE PASS  
**Production `main` at closeout:** `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09` · PR #258  
**Scope:** Finance management semantics, reconciliation facts, third-party paid history and Finance tab UX.  
**Next implementation gate:** **not selected yet**. Review the reconciled backlog before choosing the next workstream.

## What is now closed

### Owner-money management semantics

Google Sheets keeps the full transaction facts intact while management reporting derives owner-attributable economics.

Canonical management model:

- `ownerGenerated = Valor bruto - Cobro terceros`
- for a valid paid parent: `factor = Valor Recibido / Valor bruto`
- `thirdPartyPayable = Cobro terceros * factor`
- `ownerCashReceived = Valor Recibido - thirdPartyPayable`

The full ratio is used for money calculations; rounded display percentages are not monetary inputs.

### Raw/full transaction facts remain available

The following remain raw/full facts for reconciliation, accounting and later tax/legal review:

- `Valor bruto`
- `Valor Recibido`
- `Cobro terceros`
- payment/work dates and currency

Management semantics do **not** decide statutory tax or PILA treatment.

### Google Sheets / AppSheet alignment

Owner-verified audit and implementation results:

- `OWNER_FINANCE` is a derived reporting layer; it is not AppSheet source of truth.
- `REGISTRO` schema and historical facts were not rewritten.
- `PAGO_TERCEROS` physical J/K payment facts were not rewritten by the reporting change.
- AppSheet only removed the stale `Valid If` from `PAGO_TERCEROS.Neto estimado tercero calc`.
- `Neto estimado tercero calc` continues to use the direct full-ratio calculation.
- owner-facing Sheet dashboard/pivots now use owner generated / owner cash / owner receivable as appropriate.
- full bank/billed totals remain in a separate reconciliation block.

Production regression control remains:

- parent gross `900000`
- bank received `893106`
- third-party gross `450000`
- third-party payable `446553`
- owner cash received `446553`

### Finance Admin runtime

PR #257 made owner-attributable money primary while preserving full transaction totals separately and added the read-only registered third-party payment history.

PR #258 moved third-party-specific operational UI into a dedicated Finance tab:

- `Overview` is the default daily view;
- `Third parties` exposes reconciliation + obligations + registered payment history when needed;
- returning to `Overview` hides the third-party operational sections;
- full transaction facts remain in `Overview` because they also serve bank/accounting/tax reconciliation.

Owner production smoke for #257 and #258: **PASS**.

## Third-party history data contract

The physical schema currently stores per obligation:

- cumulative `Valor pagado tercero`;
- one `Fecha pago tercero` value.

Therefore the Admin history is a **registered cumulative payment fact per obligation**, not an append-only event log of every partial payment. Do not describe it as event-level payment history unless the physical data model is intentionally redesigned later.

The view remains read-only and includes persisted paid obligations even after they disappear from the active obligations queue.

## Source-of-truth boundaries preserved

- Google Sheets = Finance persistence.
- `REGISTRO` = parent work/payment table.
- `PAGO_TERCEROS` = physical child obligation/payment ledger.
- AppSheet SD.Live Track = primary mobile/offline Finance workflow.
- D1 is not a Finance mirror.
- General Finance Admin remains read-only.
- Only approved Finance write exception: explicit third-party `Marcar pagado`, writing only `PAGO_TERCEROS.J:K` after fresh server-side validation.
- Generic Finance write-back, D1 Finance mirroring and bidirectional Finance sync remain blocked.
- Assistant remains isolated from Finance.

## Known non-blocking Finance debt

These are **not active gates**; review them when selecting future work:

1. Google Sheets dashboard helper areas `CLIENTES_COP`, `PENDIENTES` and `HER_PENDIENTES` have fixed client filters that can omit newly added clients.
2. The Sheet dashboard monthly chart ranges are fixed to January–March and should become dynamic before relying on them as a complete year visualization.
3. `PENDIENTES` intentionally covers a narrower collection-state subset than total owner receivable; labels should continue to distinguish collection workflow from all outstanding owner receivables.
4. Row `154d9a77` (U. El Rosario at the 2026-09-26 audit) is a data-quality REVIEW because bank received exceeded gross with no third-party allocation. The raw cash fact is preserved rather than silently corrected.
5. Third-party payment history is cumulative-per-obligation, not event-level partial-payment history.

## PILA status

A Colombian PILA estimator is **only a backlog idea/research candidate** at this point.

It is not the selected next gate and no implementation commitment has been made. If selected later, current legal/operational rules must be researched again at implementation time and the tool must not infer statutory contribution treatment merely from owner-management fields.

## Candidate next workstreams

No order is approved yet. Candidate areas include:

- Finance cleanup/debt listed above;
- Rental real-time availability and double-booking protection;
- Mobile Rental Cart total/sticky summary;
- Rental quote/PDF automation + shared document-generation foundation;
- Calendar/Projects workflow additions;
- SD.Live Patch;
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS backlog;
- PILA estimator research/planning, only if explicitly selected.

## Exact continuation

**Inspect current `main` at/after `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`. Finance owner-money and third-party operational UX are CLOSED/PASS. Do not automatically start PILA. Review the current backlog with the owner and select one bounded next workstream before opening a runtime branch.**
