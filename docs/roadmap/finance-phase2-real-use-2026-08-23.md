# SD.Live Control Center — Finance Phase 2 real-use handoff

**Updated:** 2026-08-23 — America/Bogota  
**Scope:** current continuation point for the SD.Live Control Center / Finance track.  
**Relationship:** additive current-state handoff for `docs/roadmap/sdlive-control-center.md`, `PROJECT_STATUS.md` and `ROADMAP_MASTER_CHECKLIST.md`. Where those older files still describe Finance workspace separation as pending, this file records the later completed milestones below.

## Current active gate

**Finance Phase 2 remains read-only and in real-use observation / UX hardening. Finance Phase 3 write-back remains BLOCKED.**

The immediate objective is to make `/admin/finance/` trustworthy and useful in real work without changing the finance source of truth.

## Architecture now in production code

- `/admin/` = lightweight Control Center Dashboard.
- `/admin/finance/` = dedicated Finance / SD.Live Track workspace.
- `/admin/editor/` = Site Editor.
- Finance does **not** auto-boot inside the root Dashboard.
- Cloudflare Access remains the Admin security boundary.
- Google Sheets `REGISTRO` remains finance persistence/formula owner.
- AppSheet **SD.Live Track** remains offline capture/workflow.
- Finance Admin reads the underlying Google Sheet/API server-side with read-only scope.
- COP and USD remain strictly separated.
- No D1 finance mirror.
- No finance write-back endpoint.
- Browser-facing finance payloads do not expose `Notas`, `NUM CONTACTO`, internal row IDs or OAuth secrets.

## Milestones completed on 2026-08-23

### PR #68 — Admin/Finance freeze hardening

- Removed the Finance i18n global DOM `MutationObserver` that could repeatedly retrigger translation work.
- Protected Finance language persistence from `localStorage` failures.
- Desktop Chrome freeze / Page Unresponsive symptom passed after this change.

### PR #69 — mobile startup isolation proof

- On compact screens Finance stopped auto-loading with the root Dashboard.
- iPhone test proved the base Admin loads normally without simultaneous Finance startup.
- Manual Finance load on the same iPhone also remained fluid.
- Conclusion: the issue was startup contention from colocating subsystems, not broken Access or inherently unusable Finance rendering.

### PR #70 — permanent workspace separation

- Finance moved to its own sibling route `/admin/finance/`.
- Root `/admin/` remains lightweight.
- Site Editor navigation includes Finance.
- Existing finance API, calculations, EN/ES, COP/USD and Tax Reserve semantics were preserved.

### PR #71 — invoice eligibility by event/work date

Business rule is now explicit and deterministic in `finance-api.js`:

- `Estado = Pendiente Envio` + `Fecha trabajo < hoy` → **Por facturar / To invoice**.
- `Fecha trabajo = hoy` → **Flujo bloqueado / Workflow blocked**.
- `Fecha trabajo > hoy` → **Flujo bloqueado / Workflow blocked**.
- Missing or invalid `Fecha trabajo` → **Flujo bloqueado** as a fail-safe.
- “Hoy” is resolved in `America/Bogota`.
- A future/today pending invoice contributes its **Valor Neto** to Workflow blocked, not To invoice.
- Existing LiventX rule remains: a sent account does not become collectible until both evaluation and signature are complete.

### PR #72 — pass-through money / third-party retention calculator

A browser-local calculator now lives inside `/admin/finance/` for payments that include money collected on behalf of third parties.

Inputs:

- currency COP/USD;
- total invoiced/charged;
- total actually received in bank;
- one or more third parties with gross amounts.

Outputs:

- total retentions;
- effective retention rate;
- own gross amount;
- own allocated retentions;
- own net received;
- third-party gross;
- third-party allocated retentions;
- total payable to third parties;
- per-third-party payout detail.

**Core rule:** the same effective retention rate is applied proportionally to the user's gross share and to every third party. The user must not absorb the third party's share of the retentions.

Reconciliation invariant:

`own net received + total net payable to third parties = total bank receipt`

Guardrails:

- calculator only; no persistence;
- no Google Sheets/AppSheet write;
- no Finance API write;
- no automatic parsing/exposure of free-form `Notas`;
- allocation is an internal management reconciliation and does not determine the legal/tax owner of a withholding certificate.

## Current validation still worth doing

- [ ] Fresh production smoke of `/admin/finance/` on desktop after the latest deploy.
- [ ] Fresh production smoke of `/admin/finance/` on iPhone after the latest deploy.
- [ ] Verify year selector still behaves correctly.
- [ ] Verify ES/EN toggle after the dedicated-workspace changes.
- [ ] Test the pass-through calculator with at least one real payment case from SD.Live Track and confirm the reconciliation matches the bank receipt and intended third-party transfer.
- [ ] Confirm the new invoice-date rule moves real future/today events out of Por facturar and into Flujo bloqueado as expected.

## Near-term Finance UX backlog

These are eligible improvements, not automatic authorization:

- [ ] Consider making third-party result wording more operational, e.g. `No pagar más de / Pay no more than`, if useful after real-use testing.
- [ ] If pass-through money becomes common, design **structured fields** for third-party ownership instead of parsing `Notas`. Do not expose free-form notes to the browser merely to automate this calculator.
- [ ] AppSheet mobile deep-link integration may be added later once the correct App Link is obtained.
- [ ] Continue Finance reminder delivery observation; old rollback bots stay disabled and should not be deleted casually.

## Explicitly blocked

- Finance Phase 3 write-back.
- Bidirectional Sheets/Admin sync.
- D1 finance rewrite or mirror.
- Automatic extraction of third-party amounts from free-form `Notas` without a deliberate privacy/data-model decision.
- Any change that makes Admin the finance persistence owner.

## Next recommended sequence

1. Production-smoke the dedicated Finance workspace on desktop and iPhone.
2. Test PR #71 invoice classification against real current/future records.
3. Test PR #72 calculator with a real third-party payment.
4. Fix only observed Finance UX/data-semantics issues.
5. Keep Phase 2 in real-use observation.
6. Only after enough trust, explicitly decide whether to design Phase 3 draft-first/idempotent write-back or pivot to another Control Center module.

Availability/WhatsApp remains an independently eligible track, but it is not activated by this handoff.
