# Finance invoice date gate — 2026-08-23

## Business rule
A row in `REGISTRO` with `Estado = Pendiente Envio` is **Por facturar / To invoice** only after its `Fecha trabajo` has passed in `America/Bogota`.

- `Fecha trabajo < today` → **Por facturar**.
- `Fecha trabajo = today` → **Flujo bloqueado** until the next calendar day.
- `Fecha trabajo > today` → **Flujo bloqueado**.
- Missing or invalid `Fecha trabajo` → **Flujo bloqueado** because invoice eligibility cannot be proven safely.

## Scope
This is a reporting/classification rule in the read-only Finance integration. It does not change Google Sheets, AppSheet state, formulas, actions, bots, D1, or write-back behavior.

Existing collection workflow rules remain unchanged: sent LiventX items without both evaluation and signature continue to count as workflow-blocked; sent and workflow-complete items remain collectible.
