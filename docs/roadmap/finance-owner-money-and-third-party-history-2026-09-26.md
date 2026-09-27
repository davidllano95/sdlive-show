# Finance owner money + third-party paid history — 2026-09-26

**Status:** CLOSED / PRODUCTION VERIFIED  
**Merged through:** PR #257 (`08a6b9ab021b562a5054edf1e7f130c20ceb45f4`) for owner-money/history, plus PR #258 (`45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`) for tabbed third-party UX.  
**Consolidated handoff:** `docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md`

## Purpose

Reconcile Finance management analytics so owner-facing numbers represent money economically attributable to the owner while full billed/received transaction facts remain available for accounting, bank reconciliation and tax review.

Also provide a read-only registered **Paid to third parties** view sourced from the physical `PAGO_TERCEROS` ledger.

This milestone is complete. PILA is **not** automatically the next gate.

## Owner-money requirement — implemented

Raw/full facts remain intact:

- `Valor bruto`
- `Valor Recibido`
- `Cobro terceros`
- full client/payment dates and currency facts

Canonical management derivation:

- `ownerGenerated = Valor bruto - Cobro terceros`
- for valid paid rows: `factor = Valor Recibido / Valor bruto`
- `thirdPartyPayable = Cobro terceros * factor`
- `ownerCashReceived = Valor Recibido - thirdPartyPayable`

Monetary calculations use the full ratio and do not use rounded display percentages as intermediates.

Management metrics derive owner-only economics without overwriting the underlying full transaction totals.

Legal/tax/PILA treatment is not inferred solely from `Cobro terceros`.

## Sheets / AppSheet result

The owner-verified audit and update established:

- `OWNER_FINANCE` is a derived reporting layer and is not an AppSheet operational table.
- `REGISTRO` schema/historical facts remain unchanged.
- owner-facing Sheet dashboard/pivots use owner generated, owner cash received and owner receivable where appropriate.
- full billed/bank-received values remain separately available for reconciliation.
- AppSheet only removed the stale `Valid If` from `PAGO_TERCEROS.Neto estimado tercero calc`.
- the App formula remains direct full-ratio math.

Production control case:

- parent gross `900000`
- bank received `893106`
- third-party gross `450000`
- third-party payable `446553`
- owner cash received `446553`

## Paid to third parties history view — implemented

The read-only Admin history answers:

> Who has a registered third-party payment, how much is currently registered as paid, when, and for which work?

Canonical source: physical `PAGO_TERCEROS` facts, joined to `REGISTRO` only for parent context.

### Inclusion rule

Include rows with an actual persisted third-party payment fact:

- `Valor pagado tercero > 0`
- payment date shown from `Fecha pago tercero` when present

Current debt status is not the inclusion rule. Fully paid rows remain visible historically even after they disappear from the operational obligations queue.

### Visible fields

- `Tercero`
- `Fecha pago tercero`
- `Valor pagado tercero`
- `Moneda`
- `Cliente`
- `Proyecto / Show`

Private notes, phone numbers and raw internal row identities are not exposed merely for this view.

### UX

- dedicated third-party history/table view;
- filterable by year, third-party name and currency;
- newest registered payment date first;
- totals separated by currency;
- no write controls in the historical table.

PR #258 subsequently placed third-party-specific operational content behind a dedicated `Third parties` Finance tab while `Overview` remains the default daily view.

## Important schema limitation

The current physical ledger stores, per obligation:

- cumulative `Valor pagado tercero`;
- one `Fecha pago tercero` value.

Therefore this view is a **registered cumulative payment fact per obligation**. It is **not** an append-only event-level ledger of every partial payment.

The original acceptance wording about preserving every payment event is superseded by this explicit data-model limitation. Event-level partial-payment history would require a deliberate physical schema redesign later.

## Acceptance checks — result

1. ✅ Fully paid third-party rows remain available in the registered paid-history view after leaving active obligations.
2. ✅ Name, registered date, amount, currency, client and project reconcile to persisted facts.
3. ✅ Rows remain per obligation/name; no claim is made that every partial-payment event is preserved.
4. ✅ Filter totals remain currency-separated and derive from persisted `Valor pagado tercero` facts.
5. ✅ Historical view remains read-only and does not broaden the Finance write surface.
6. ✅ Owner-money dashboard changes and third-party payment history remain conceptually separate.
7. ✅ Owner production smoke passed.
8. ✅ Third-party tab production smoke passed.

## Closeout

This roadmap is complete. Future Finance work should be selected from the reconciled backlog in `PROJECT_STATUS.md` / `ROADMAP_MASTER_CHECKLIST.md` rather than assuming PILA is next.
