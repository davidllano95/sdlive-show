# Finance third-party field — AppSheet capture smoke

**Date:** 2026-09-05 — America/Bogota

## Result

AppSheet capture setup for the new structured third-party amount is **PASS**.

## Source-of-truth change

Google Sheets `REGISTRO` now has a physical optional column:

- `Cobro terceros` (added after `Fecha fin`, physical column AC at rollout time)

AppSheet regenerated the `REGISTRO` schema and the column uses the same numeric type as `Valor bruto` (`Decimal`).

## AppSheet UX

Display name:

- `Cobro por terceros (bruto)`

Validation:

```appsheet
OR(
  ISBLANK([Cobro terceros]),
  AND(
    [Cobro terceros] >= 0,
    [Cobro terceros] <= [Valor bruto]
  )
)
```

The field is optional, editable, has no Initial Value and no App formula.

It was added directly after `Valor bruto` in:

- `Nuevo Trabajo`
- `Pago_Form`

## Smoke evidence

In `Nuevo Trabajo`:

- blank value accepted;
- a value greater than `Valor bruto` is rejected by validation;
- no record had to be saved for the smoke.

## Finance integration intent

This field is structured financial data, not a `Notas` convention. Google Sheets remains the persistent Finance source of truth and AppSheet remains the mobile/offline capture surface. `/admin/finance/` may read and derive aggregates from it but must not create a D1 Finance mirror or generic Finance write-back.

The dashboard integration must preserve COP/USD separation and distinguish client-billed gross, own gross, third-party gross and real own cash flow. Tax/PILA presentation must not silently classify third-party amounts as legally excludable income without the underlying legal/accounting basis.
