# Finance owner money + third-party paid history — 2026-09-26

## Purpose

Before the 2026 PILA estimator, reconcile Finance management analytics so owner-facing numbers represent money economically attributable to the owner while full billed/received transaction facts remain available for accounting, bank reconciliation and tax review.

This work must also add a historical **Paid to third parties** view sourced from the physical `PAGO_TERCEROS` ledger.

## Owner-money requirement

Keep raw/full facts intact:

- `Valor bruto`
- `Valor Recibido`
- full client/payment dates and currency facts

Management metrics may derive owner-only economics, but must never overwrite or hide the underlying full transaction totals.

Do not infer legal/tax/PILA treatment solely from `Cobro terceros`.

## Paid to third parties history view

Add a read-only historical view in `/admin/finance/` that answers:

> Who have we paid, how much, when, and for which work?

Canonical source: physical `PAGO_TERCEROS` facts, joined to `REGISTRO` only for parent context.

### Inclusion rule

Include rows with an actual persisted third-party payment fact:

- `Valor pagado tercero > 0`
- payment date shown from `Fecha pago tercero` when present

Do not use current debt status as the inclusion rule. Fully paid rows must remain visible historically even though they disappear from the operational obligations queue.

### Minimum columns

- `Tercero`
- `Fecha pago tercero`
- `Valor pagado tercero`
- `Moneda`
- `Cliente`
- `Proyecto / Show`

Useful optional context:

- `Bruto tercero`
- canonical estimated payable for that child
- parent `Valor bruto`
- parent `Valor Recibido`
- payment status / reconciliation note only when derived deterministically

Do not expose private notes, phone numbers or raw internal row identities in the browser.

### UX

- visible as a dedicated history/table section, separate from the current obligations card;
- filterable by year, third-party name and currency when practical;
- default newest payment first;
- show totals by currency for the current filter;
- preserve COP and USD separately; never combine currencies into one numeric total;
- no write controls in this historical view.

### Semantics

This is **cash actually paid to third parties**, based on persisted payment facts. It is not the same as:

- third-party gross commitment;
- current debt;
- third-party payable/collected estimate;
- owner revenue.

The existing operational obligations queue remains responsible for what is still owed and for the bounded `Marcar pagado` action.

## Acceptance checks

1. A fully paid third-party row remains visible in historical paid view after disappearing from obligations.
2. Name, payment date, amount, currency, client and project reconcile with Sheets/AppSheet.
3. Multiple payments/names are not collapsed in a way that loses payment history.
4. Totals by currency equal persisted `Valor pagado tercero` facts for the selected filter.
5. The view is read-only and does not broaden the Finance write surface.
6. Owner-money dashboard changes and third-party historical payments remain conceptually separate.
