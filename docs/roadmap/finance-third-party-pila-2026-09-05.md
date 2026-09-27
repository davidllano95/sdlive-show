# Finance structured third-party amounts + PILA calculator — 2026-09-05

**Updated:** 2026-09-26 — America/Bogota  
**Status:** **THIRD-PARTY PORTION CLOSED / PILA PLANNING RETAINED AS HISTORICAL BACKLOG ONLY**  
**Sequencing:** superseded by `PROJECT_STATUS.md`, `ROADMAP_MASTER_CHECKLIST.md` and `docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md`.  

> This file is retained because it contains the original third-party/PILA planning context. It is **not** approval to start PILA automatically and its legal/parameter notes must be re-researched before any implementation.

## Current source-of-truth boundary

- Google Sheets remains Finance persistence.
- `REGISTRO` remains the parent work/payment table.
- `PAGO_TERCEROS` is the physical child ledger for third-party obligations/payments.
- AppSheet remains the primary mobile/offline workflow writer.
- `/admin/finance/` remains read-only for general Finance data/analytics.
- One explicit, narrow write exception is approved: an explicit third-party `Marcar pagado` action may record a real payment by writing only physical `PAGO_TERCEROS` columns `J = Valor pagado tercero` and `K = Fecha pago tercero` after server-side revalidation.
- No derived third-party value may be written from Finance Admin.
- Generic Finance write-back, D1 Finance mirroring and bidirectional sync remain blocked.

## Third-party milestone — CLOSED / PASS

The implementation described by the original roadmap is now complete and production-verified.

Completed sequence includes:

- structured `REGISTRO.Cobro terceros`;
- canonical proportional-retention model;
- physical `PAGO_TERCEROS` child ledger integration;
- AppSheet derived-field cleanup to Virtual Columns/direct-ratio monetary math;
- selected-year/monthly backend reconciliation;
- COP reconciliation by third-party name;
- operational `Esperando pago del cliente` / `Listo para pagar` obligations;
- bounded J/K `Marcar pagado` write path;
- production write smoke PASS;
- owner-money reporting separation from full transaction totals;
- registered third-party paid-history view;
- `Overview` / `Third parties` Finance tabs with production smoke PASS.

Canonical management model:

- `invoiceGross = Valor bruto`
- `bankReceived = Valor Recibido`
- `thirdPartyGross = Cobro terceros`
- `factor = bankReceived / invoiceGross`
- `thirdPartyPayable = thirdPartyGross * factor`
- `ownerGenerated = invoiceGross - thirdPartyGross`
- `ownerCashReceived = bankReceived - thirdPartyPayable`

Invariant for a valid paid allocation:

`ownerCashReceived + thirdPartyPayable = bankReceived`

Displayed percentage fields may be rounded, but money calculations use the full ratio.

## Current third-party history limitation

`PAGO_TERCEROS` stores cumulative `Valor pagado tercero` and one `Fecha pago tercero` per obligation. The Admin history therefore represents a registered cumulative paid fact per obligation and does not preserve every partial-payment event as an append-only log.

## PILA concept — backlog / research candidate only

The original idea was a separate browser-local/year-versioned planning calculator in `/admin/finance/` with no writes to Google Sheets, AppSheet or D1.

That concept remains potentially useful, but it is **not the selected next workstream**.

If the owner explicitly selects it later, begin from fresh legal/operational research rather than treating this dated planning document as a current legal specification.

### Intended product boundaries if revived

- planning/estimator tool, not a PILA operator;
- no Finance source-of-truth writes;
- contribution rules versioned by year;
- exact legal/operational sources displayed or documented;
- unsupported scenarios fail clearly rather than guess;
- management fields such as `Cobro terceros`, owner generated or owner cash must not automatically be mapped to statutory contribution income.

### Historical calculation modes considered

The earlier plan contemplated at least:

1. **Prestación de servicios personales**
   - monthly gross contract income excluding IVA;
   - legally applicable IBC methodology and minimum/maximum rules;
   - health, pension and any additional applicable contribution components.

2. **Cuenta propia / contrato diferente a prestación de servicios**
   - monthly gross income excluding IVA;
   - legally supported cost treatment;
   - resulting net income and applicable IBC methodology;
   - health, pension and any additional applicable contribution components.

These are planning categories only. Current rules must be verified again before coding.

### Historical parameter notes — NOT CANONICAL

Earlier research in this project mentioned values/thresholds for 2026, including SMMLV, maximum IBC, health/pension rates, FSP, ARL and optional CCF treatment, plus the need to consider Decree 0379 of 2026.

Those notes are intentionally **not restated here as current implementation constants**. If PILA is selected, re-verify each parameter and effective-date rule from authoritative Colombian sources before writing deterministic tests or production code.

## Interaction with third-party money

Do **not** automatically include or exclude `Cobro terceros` from a statutory PILA base simply because Finance tracks it as pass-through money for management purposes.

Finance may provide owner-management figures as context, but the legally relevant amount must be determined from the actual arrangement and then-current rules.

## Guardrails retained from the original plan

- Google Sheets/AppSheet remain source of truth for Finance facts.
- No D1 Finance mirror.
- Preserve COP/USD separation except where a feature is intentionally COP-only.
- Do not parse `Notas` to infer amounts.
- Do not expose private notes/contact data/raw IDs merely to support analytics.
- Reuse canonical pass-through math for management reporting.
- Generic Finance write-back remains blocked.
- PILA parameters, if implemented, must be versioned by contribution year.

## Current continuation

**Do not continue directly from the old PILA sequence in this file. Finance third-party/owner-money work is CLOSED/PASS through PR #258. Return to `PROJECT_STATUS.md` and `ROADMAP_MASTER_CHECKLIST.md`, review the backlog with the owner, and only revive PILA if it is explicitly selected as the next bounded workstream.**
