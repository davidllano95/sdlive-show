# SD.Live Track — Field / Source-of-Truth Mapping Closeout

**Date:** 2026-08-22 — America/Bogota  
**Control Center:** Step 5 — Finance integration Phase 1  
**Result:** CLOSED / PASS  
**Next gate:** Step 6 — read-only, Admin-only finance insights

## Decision

The current finance architecture remains **Google Sheets + AppSheet** for Phase 2. AppSheet remains the field/offline capture and workflow surface; Google Sheets remains the persistent finance data store and formula owner. The first SD.Live `/admin` integration is **read-only** and must read the underlying Google Sheet/API. No D1 finance copy, write-back, bidirectional sync or parallel financial source of truth is authorized by this closeout.

## Evidence snapshot

The 2026-08-22 `SD.Live Track.xlsx` snapshot and current AppSheet configuration were cross-checked directly.

- 12 workbook tabs audited; `REGISTRO` is the persistent finance table.
- 57 real records and 57 unique persisted IDs at the checkpoint.
- AppSheet exposes 30 columns for `REGISTRO`: `_RowNumber`, 27 physical Sheet columns (`A:AA`) and 2 AppSheet virtual columns.
- 11 physical columns are calculated by Google Sheets.
- `ID` is the AppSheet Key and uses `UNIQUEID()` as Initial Value when a new row is created.
- `Fee Monto` and `Fee %` are AppSheet virtual/App-formula fields and are not persisted in Google Sheets.
- Current Actions, forms and Bots were inspected in AppSheet; the three Bots are notification-only and do not mutate `REGISTRO`.

## Field-level ownership map

Phase 2 keeps the current writer/owner for every field. `/admin` may read approved fields only; it does not become a writer.

| Field / datum | Persistence | Current writer / calculation owner | Phase 2 owner | Direction to future `/admin` | Scope / sensitivity | Notes |
|---|---|---|---|---|---|---|
| `_RowNumber` | AppSheet/system | AppSheet system | AppSheet system | Exclude | Internal technical | Positional helper; never use as durable identity. |
| `Fecha trabajo` | Sheet A | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only operational | Included in `Nuevo Trabajo`; standard Edit remains possible. |
| `Mes` | Sheet B | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Derived from `Fecha trabajo`; never write from Admin. |
| `Año` | Sheet C | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Derived; never write from Admin. |
| `Cliente` | Sheet D | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only business | Included in `Nuevo Trabajo`; exact `LiventX` value participates in workflow conditions. |
| `Proyecto / Show` | Sheet E | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only business | Editable in `Nuevo Trabajo`, standard Edit and `Pago_Form`. |
| `Rol` | Sheet F | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only business | Included in `Nuevo Trabajo`. |
| `Moneda` | Sheet G | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only finance | Editable in `Nuevo Trabajo`, standard Edit and `Pago_Form`; preserve COP/USD separation. |
| `Valor bruto` | Sheet H | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only finance | Editable in `Nuevo Trabajo`, standard Edit and `Pago_Form`. |
| `Impuestos / Fees` | Sheet I | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Derived from persisted payment values/state; Admin must not maintain a parallel copy. |
| `Valor Neto` | Sheet J | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Derived by Sheets; read-only to Admin. |
| `Estado` | Sheet K | User + **AppSheet workflow Actions** | AppSheet workflow / Sheet persistence | Sheet → Worker → Admin | Admin-only finance/workflow | User-selectable at creation/edit; also written by `Enviar Cuenta`, `Evaluar`, `Firmar`, `Set_Pagado`. |
| `Fecha cuenta enviada` | Sheet L | AppSheet `Enviar Cuenta` + manual edit capability | AppSheet workflow / Sheet persistence | Sheet → Worker → Admin | Admin-only finance | `Enviar Cuenta`: sets `Estado="Cuenta enviada"` + `TODAY()` only when `Estado="Pendiente Envio"`. |
| `Fecha evaluación` | Sheet M | AppSheet `Evaluar` + manual edit capability | AppSheet workflow / Sheet persistence | Sheet → Worker → Admin | Admin-only workflow | `Evaluar`: `TODAY()` + `Estado="Evaluada"`; only `Cliente="LiventX"` and blank evaluation date. |
| `Fecha firma` | Sheet N | AppSheet `Firmar` + manual edit capability | AppSheet workflow / Sheet persistence | Sheet → Worker → Admin | Admin-only workflow | `Firmar`: `TODAY()` + `Estado="Firmada"`; only `Cliente="LiventX"` and blank signature date. |
| `Fecha pago` | Sheet O | AppSheet `Set_Pagado` + manual edit capability | AppSheet workflow / Sheet persistence | Sheet → Worker → Admin | Admin-only finance | `Set_Pagado`: `Estado="Pagado"` + `TODAY()` when not already paid and `Fecha cuenta enviada` is present. |
| `Método de pago` | Sheet P | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only finance | Editable in `Nuevo Trabajo`, standard Edit and `Pago_Form`. |
| `Días sin pagar` | Sheet Q | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Aging-derived/current-date field; never write from Admin. |
| `Notas` | Sheet R | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only business | Editable in `Nuevo Trabajo`, standard Edit and `Pago_Form`. |
| `Month Number` | Sheet S | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Internal/reporting | Derived helper; may be used for ordering, not written by Admin. |
| `Año Pago` | Sheet T | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Internal/reporting | Derived from `Fecha pago`. |
| `Month Number (pago)` | Sheet U | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Internal/reporting | Derived helper. |
| `Mes de pago` | Sheet V | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Derived payment-month label. |
| `Rango Aging` | Sheet W | **Google Sheets formula** | Sheets | Sheet → Worker → Admin | Admin-only finance | Derived aging bucket. |
| `ID` | Sheet X | **AppSheet Initial Value `UNIQUEID()`** | AppSheet identity / Sheet persistence | Sheet → Worker internal | Internal identifier | Durable row identity and AppSheet Key; use this instead of `_RowNumber`. Do not display unnecessarily. |
| `Valor Recibido` | Sheet Y | User via AppSheet | Unchanged | Sheet → Worker → Admin | Admin-only finance | Captured in `Pago_Form`; standard Edit remains possible. |
| `MES PAGO KEY` | Sheet Z | **Google Sheets formula** | Sheets | Sheet → Worker internal | Internal/reporting | Derived helper; read only if needed by reporting. |
| `NUM CONTACTO` | Sheet AA | User via AppSheet / standard Edit | Unchanged | Omit from first dashboard unless needed | **Personal contact data** | Not in `Nuevo Trabajo`; keep private and behind Access. |
| `Fee Monto` | Virtual | **AppSheet App formula** | AppSheet; optional Worker recompute for display | No persisted sync | Admin-only finance | Not present in Sheet. If Phase 2 needs it, recompute read-only from authoritative persisted inputs; do not create D1 ownership. |
| `Fee %` | Virtual | **AppSheet App formula** | AppSheet; optional Worker recompute for display | No persisted sync | Admin-only finance | Same rule as `Fee Monto`; no persisted duplicate solely for dashboard convenience. |

## Verified workflow ownership

### Record creation

`Nuevo Trabajo` is an AppSheet Form over `REGISTRO`. It writes these user fields in the current manual column order:

1. `Fecha trabajo`
2. `Cliente`
3. `Proyecto / Show`
4. `Rol`
5. `Moneda`
6. `Valor bruto`
7. `Estado`
8. `Método de pago`
9. `Notas`

Saving creates the row, AppSheet assigns `ID=UNIQUEID()`, and Sheets owns the downstream physical formulas. `Form Saved` uses the normal Go Back behavior; it does not run a separate data Action.

### Billing / collection Actions

- `Enviar Cuenta` → set `Estado="Cuenta enviada"` and `Fecha cuenta enviada=TODAY()`; only when `[Estado]="Pendiente Envio"`; confirmation enabled.
- `Evaluar` → set `Fecha evaluación=TODAY()` and `Estado="Evaluada"`; only for exact `Cliente="LiventX"` with blank evaluation date; confirmation enabled.
- `Firmar` → set `Fecha firma=TODAY()` and `Estado="Firmada"`; only for exact `Cliente="LiventX"` with blank signature date; confirmation enabled.
- The individual `Firmar` Action does not itself require `Fecha evaluación`; the separate audited collection rules are responsible for preventing LiventX from entering collection before both evaluation and signature are complete.

### Payment workflow

`Pagado+Valor` is a grouped Action and runs in this order:

1. `Set_Pagado`
2. `Go to Pago_Form`

`Pagado+Valor` is available only when `NOT(IN([Estado], {"Pagado", "Pendiente Envio"}))` and asks for confirmation.

`Set_Pagado` writes `Estado="Pagado"` and `Fecha pago=TODAY()` when `[Estado]<>"Pagado"` and `Fecha cuenta enviada` is not blank. `Go to Pago_Form` then opens the same row by durable `ID` with `LINKTOROW([ID], "Pago_Form")`.

`Pago_Form` is a hidden auxiliary Form over the existing `REGISTRO` row. Its manual field list is `Valor bruto`, `Proyecto / Show`, `Valor Recibido`, `Moneda`, `Método de pago`, `Notas`; saving performs normal Go Back and no additional business Action.

**Known workflow characteristic:** the row is marked `Pagado` before `Pago_Form` is saved. This is documented behavior, not changed by Step 5. Any future write-back design must either preserve it deliberately or redesign it explicitly with migration/rollback evidence.

### General edit path

`Edit_Job` is navigation only: `LINKTOROW([ID], "Todos")`. `Todos` is a hidden Deck over `REGISTRO`; row selection opens the row detail and the standard system `Edit` / `Delete` actions remain available. Phase 2 `/admin` must not duplicate those writes/deletes.

## Bots / automation ownership

The three current AppSheet Bots were inspected:

- `Enviar nueva cuenta de cobro`
- `Cobro 7 dias+`
- `Cobro 14-30 dias`

All three execute **Notification** steps only. No Bot performs `set values`, row add/delete, data Action or other mutation of `REGISTRO`.

**Future backlog, not active work:** the owner reports the current AppSheet push reminders have not been received in practice. Before changing finance logic, diagnose push delivery/recipient configuration. A later notification-delivery improvement may send the same existing reminder rules through **email and WhatsApp** as additional channels. Those channels must remain notification-only, reuse the existing finance conditions rather than fork business logic, and must not become a second financial source of truth.

## Phase 2 read contract

The first `/admin` implementation may read the Sheet/API and derive presentation-only aggregates such as:

- pending invoices / accounts receivable;
- COP and USD split;
- aging / collection priority;
- deductions / fees where supported by authoritative inputs;
- relevant jobs/events from the mapped finance data.

Rules:

- `/admin` only, behind existing Cloudflare Access;
- no public finance endpoint;
- no mutation of Google Sheets/AppSheet;
- no D1 finance mirror;
- no bidirectional sync;
- do not use `_RowNumber` as identity;
- do not persist AppSheet virtual fields merely to display them;
- if a display metric must be recomputed in the Worker, it must be a read-only derivation from mapped authoritative fields and covered by tests.

## Gate transition

- Step 5 — field/source-of-truth mapping: **CLOSED / PASS**.
- Step 6 — read-only, Admin-only finance insights: **F / ACTIVE GATE**.
- Availability/WhatsApp remains the explicit eligible parallel track; eligibility does not make it active automatically.
- Finance write-back, D1 finance ownership and bidirectional sync remain unauthorized until later phases explicitly satisfy their prerequisites.
