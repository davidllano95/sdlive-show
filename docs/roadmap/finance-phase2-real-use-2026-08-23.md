# SD.Live Control Center — Finance Phase 2 real-use handoff

**Updated:** 2026-08-23 — America/Bogota  
**Scope:** current continuation point for the SD.Live Control Center / Finance track.  
**Relationship:** additive current-state handoff for `docs/roadmap/sdlive-control-center.md`, `PROJECT_STATUS.md` and `ROADMAP_MASTER_CHECKLIST.md`. Where those older files still describe Finance workspace separation as pending, this file records the later completed milestones below.

## Current active gate

**Finance Phase 2 remains read-only and is now through its core production QA checkpoint. Finance Phase 3 write-back remains BLOCKED.**

The immediate objective is to keep `/admin/finance/` useful in real work, improve only observed UX gaps, and preserve Google Sheets + AppSheet as the finance source/workflow owners.

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

### PR #73 — action-card worklists

Real-use testing showed that the top status cards need to answer not only “how much?” but “what exactly do I do next?”. Read-only drilldowns now exist for:

- **Por facturar / To invoice** → exact records ready for invoice/account submission and the action to send the account;
- **Cobrable ahora / Collectible now** → exact collectible records and the action to follow up/collect;
- **Flujo bloqueado / Workflow blocked** → exact records plus explicit reason codes/actions, including work date today/future/invalid and missing LiventX evaluation/signature.

The drilldown is intentionally lazy-loaded only when a card is opened so the dedicated Finance workspace keeps the lightweight startup behavior validated after PRs #68–#70. It remains read-only and does not expose `Notas`, `NUM CONTACTO` or internal row IDs.

Production real-use QA passed for all three cards. Workflow wording was then refined to match the actual operating steps:

- evaluation blocker → **Enviar evaluación / Send evaluation**;
- signature blocker → **Firmar factura / Sign invoice**.

The worklist UI also uses the Admin/SD.Live brand accent variables (`--accent`, `--accent-rgb`) instead of an unrelated standalone highlight color.

### PR #74 — worklist copy + SD.Live branding

- Updated LiventX blocker actions to the real operating language: **Enviar evaluación / Send evaluation** and **Firmar factura / Sign invoice**.
- Restyled worklist drilldowns using the existing Admin/SD.Live accent variables.
- Preserved lazy loading, read-only behavior, COP/USD separation and browser privacy guardrails.
- Production smoke of the refined wording and branded worklist styling passed.

### Current UX milestone — Aging drilldowns + calculator Clear

- **Aging 0–30 / 31–60 / 61+** is implemented as a read-only drilldown for both COP and USD.
- Each Aging range opens the exact sanitized unpaid accounts that compose the bucket and shows client, project, net amount, sent date, days unpaid and current workflow state.
- The Aging detail combines the already-sanitized `workQueues.collectible` and `workQueues.blocked` payloads; it does **not** add a new Finance API, expose new source fields or change the Aging calculation/source of truth.
- Aging bucket reconstruction mirrors the existing dashboard rule and ignores missing/null `daysUnpaid` instead of coercing it to zero.
- Collectible rows show the follow-up/collection action; blocked LiventX rows preserve exact workflow actions such as **Enviar evaluación** and **Firmar factura**.
- Aging remains lazy/on-demand and uses the existing branded Finance worklist modal.
- The pass-through calculator now includes **Limpiar / Clear**, which resets currency to COP, clears invoice/bank totals, returns to one empty third-party row and clears calculated results.
- Clear is browser-local only; it does not introduce persistence, API calls or Finance write-back.
- Production smoke for these two additions is still required after deployment.

## Production QA checkpoint completed

The following real-use validation is complete on production:

- [x] Fresh production smoke of `/admin/finance/` on desktop.
- [x] Fresh production smoke of `/admin/finance/` on iPhone.
- [x] Year selector.
- [x] ES/EN toggle.
- [x] Invoice-date rule with real current/future records.
- [x] **Por facturar** worklist against real production data.
- [x] **Cobrable ahora** worklist against real production data.
- [x] **Flujo bloqueado** worklist and blocker reasons against real production data.
- [x] Refined workflow wording and SD.Live-branded worklist styling.
- [x] Pass-through calculator with a real-use case: COP 1,000,000 invoiced, COP 900,000 received, COP 300,000 third-party gross → 10% effective retention, COP 630,000 own net, COP 270,000 third-party payout, COP 900,000 reconciliation.
- [ ] Production smoke of one non-empty **Aging** bucket and its exact account list/actions.
- [ ] Production smoke of **Limpiar / Clear** in the pass-through calculator.

## Near-term Finance UX backlog

These are eligible improvements, not automatic authorization:

- [x] Make **Aging 0–30 / 31–60 / 61+** interactive so each bucket opens the exact accounts inside it. Implementation complete; production smoke pending.
- [ ] Make **Data quality** warnings interactive so each warning opens the exact rows that need correction. This is now the highest-value next drilldown.
- [ ] Make **Received all-time** interactive to inspect already-paid records, payment date, gross, fees and received amount without turning Admin into a write owner.
- [ ] Make **Top debtors** interactive so a client opens the individual outstanding accounts that make up the balance.
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

1. Production-smoke one non-empty **Aging** bucket and verify its exact accounts/actions.
2. Production-smoke **Limpiar / Clear** in the pass-through calculator.
3. If continuing Finance UX, implement **Data quality** drilldowns next.
4. Keep Phase 2 in real-use observation and only fix observed data/UX semantics issues.
5. Only after enough trust, explicitly decide whether to design Phase 3 draft-first/idempotent write-back or pivot to another Control Center module.

Availability/WhatsApp remains an independently eligible track, but it is not activated by this handoff.