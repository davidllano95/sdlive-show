# SD.Live Control Center — Finance Phase 2 real-use handoff

**Updated:** 2026-08-23 — America/Bogota  
**Scope:** current continuation point for the SD.Live Control Center / Finance track.  
**Relationship:** additive current-state handoff for `docs/roadmap/sdlive-control-center.md`, `PROJECT_STATUS.md` and `ROADMAP_MASTER_CHECKLIST.md`. Where those older files still describe Finance workspace separation as pending, this file records the later completed milestones below.

## Current active gate

**Finance Phase 2 remains read-only and is through its core production QA checkpoint. Finance-wide Phase 3 write-back remains blocked, except that a future controlled Calendar / Operations Hub write-path has now been explicitly requested by the user and is authorized for design after its schema gate is completed.**

The immediate objective is to keep `/admin/finance/` useful in real work, improve observed UX gaps, and preserve Google Sheets + AppSheet as the finance source/workflow owners.

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
- No generic finance write-back endpoint.
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

### PR #76 — Aging drilldowns + calculator Clear

- **Aging 0–30 / 31–60 / 61+** is implemented as a read-only drilldown for both COP and USD.
- Each Aging range opens the exact sanitized unpaid accounts that compose the bucket and shows client, project, net amount, sent date, days unpaid and current workflow state.
- The Aging detail combines the already-sanitized `workQueues.collectible` and `workQueues.blocked` payloads; it does **not** add a new Finance API, expose new source fields or change the Aging calculation/source of truth.
- Aging bucket reconstruction mirrors the existing dashboard rule and ignores missing/null `daysUnpaid` instead of coercing it to zero.
- Collectible rows show the follow-up/collection action; blocked LiventX rows preserve exact workflow actions such as **Enviar evaluación** and **Firmar factura**.
- Aging remains lazy/on-demand and uses the existing branded Finance worklist modal.
- The pass-through calculator now includes **Limpiar / Clear**, which resets currency to COP, clears invoice/bank totals, returns to one empty third-party row and clears calculated results.
- Clear is browser-local only; it does not introduce persistence, API calls or Finance write-back.
- Production QA passed for a non-empty Aging bucket and for the full **Limpiar / Clear** reset behavior.

### Current implementation — Data quality drilldowns

The five existing Data quality warnings are being converted from counters into actionable read-only worklists:

- **Paid rows missing received amount** → identify the exact paid record and register the amount actually received.
- **Unsupported currencies** → identify the exact record and correct `Moneda` to COP or USD.
- **Unpaid rows missing aging** → identify the exact record and review `Días sin pagar` / Aging.
- **Paid rows missing payment date** → identify the exact record and enter/correct the payment date.
- **Invalid payment durations** → identify the exact record and review invoice-sent/payment dates.

Implementation guardrails:

- only warnings with count > 0 become interactive;
- detail is lazy-loaded only on click/tap;
- drilldowns reuse the branded SD.Live modal pattern;
- sanitized detail never includes `Notas`, `NUM CONTACTO`, persisted row `ID` or OAuth secrets;
- no Sheets/AppSheet write is added by this milestone;
- production smoke remains required after merge.

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
- [x] Production smoke of a non-empty **Aging** bucket and its exact account list/actions.
- [x] Production smoke of **Limpiar / Clear** in the pass-through calculator, confirming COP reset, empty totals, one blank third-party row and cleared results/breakdown.
- [ ] Production smoke of one non-zero **Data quality** warning and its exact record/action list.

## Near-term Finance UX backlog

These are eligible improvements, not automatic authorization unless explicitly noted:

- [x] Make **Aging 0–30 / 31–60 / 61+** interactive so each bucket opens the exact accounts inside it. Implementation and production smoke complete.
- [~] Make **Data quality** warnings interactive so each warning opens the exact rows that need correction. Implementation in progress; production smoke pending.
- [ ] Make **Received all-time** interactive to inspect already-paid records, payment date, gross, fees and received amount without turning Admin into a write owner.
- [ ] Make **Top debtors** interactive so a client opens the individual outstanding accounts that make up the balance.
- [ ] Consider making third-party result wording more operational, e.g. `No pagar más de / Pay no more than`, if useful after real-use testing.
- [ ] If pass-through money becomes common, design **structured fields** for third-party ownership instead of parsing `Notas`. Do not expose free-form notes to the browser merely to automate this calculator.
- [ ] Continue Finance reminder delivery observation; old rollback bots stay disabled and should not be deleted casually.

## Authorized next major module — Calendar / Operations Hub

The user explicitly requested that Admin evolve into a practical command center even when the AppSheet app is not available. This is now an authorized requirement, but it must pass a schema/source-of-truth gate before any write endpoint is created.

Required capabilities:

1. **Calendar view inside Admin** showing SD.Live Track jobs/events.
2. **Multi-day events** must display as a continuous date span in both Admin and AppSheet.
3. **Create/edit from Admin** so a job/event can be entered without opening AppSheet.
4. Admin must write into the **same Google Sheets `REGISTRO` source** used by SD.Live Track; do not create a competing persistence source.
5. The Admin form should expose all **human-editable/source fields** required by the workflow. Formula/derived columns remain owned by Sheets and must not be manually overwritten merely to “fill every column.”
6. New records must remain compatible with AppSheet sync and existing Finance calculations/workflows.
7. The Admin Dashboard must include a **direct mobile launch link to SD.Live Track/AppSheet**.
8. AppSheet itself must be configured so multi-day events render correctly in its Calendar view.

### Calendar schema gate before implementation

The verified `REGISTRO` schema currently contains `Fecha trabajo` but no explicit verified end-date field. Therefore:

- do not invent or overload an unrelated column for event end date;
- first define the shared start/end date model and determine which new field, if any, must be added to Sheets/AppSheet;
- update AppSheet column configuration and Calendar Start/End mapping against that shared model;
- map each Admin form field as **user input / formula / workflow-managed / read-only** before enabling writes;
- define validation and idempotency around the persisted `ID` key so retries cannot create duplicate events;
- preserve COP/USD separation and LiventX workflow semantics.

### Write authorization boundary

The request for Calendar create/edit is explicit authorization to design and implement a **controlled Calendar/operations write-path** after the schema gate. It does **not** automatically authorize generic Finance Phase 3 write-back, arbitrary cell editing, bidirectional mirroring, or moving persistence away from Google Sheets.

### AppSheet launcher dependency

A direct Dashboard → AppSheet button is required, but the repository and previous project context do not currently contain the exact SD.Live Track **App Link / app URL / app ID**. Do not guess it. Wire the button once the real AppSheet link is available.

## Explicitly blocked unless separately authorized

- Generic Finance Phase 3 write-back outside the Calendar/operations scope described above.
- Arbitrary spreadsheet-cell editing from Admin.
- D1 finance rewrite or mirror.
- Automatic extraction of third-party amounts from free-form `Notas` without a deliberate privacy/data-model decision.
- Any change that makes Admin the finance persistence owner instead of Google Sheets.

## Next recommended sequence

1. Finish and production-smoke **Data quality** drilldowns.
2. Start the **Calendar schema/source-of-truth mapping**: multi-day start/end model plus editable-vs-derived fields.
3. Correct **AppSheet multi-day Calendar configuration** against that model.
4. Build the Admin **read-only Calendar view** first and verify rendering/date spans.
5. Add the controlled **create/edit write-path** with validation + idempotent persisted ID handling.
6. Add the Dashboard → **SD.Live Track/AppSheet** launcher once the exact App Link is supplied/recovered.
7. Only after that, decide whether Received all-time / Top debtors or broader Finance Phase 3 work is the next priority.

Availability/WhatsApp remains an independently eligible track, but it is not activated by this handoff.