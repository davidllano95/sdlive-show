# SD.Live Patch — activation handoff

**Date:** 2026-09-28 — America/Bogota  
**Status:** **ACTIVE DESIGN / DISCOVERY GATE**  
**Previous milestone:** Documents v1 closed / production-ready through PR #313  
**Purpose:** let a new conversation resume Patch work without reconstructing context from chat history.

## 1. Current project state

Documents v1 is closed and production-ready.

At the Documents closeout checkpoint:

- `samuel:CC` current next = `21`;
- `samuel:INV` current next integer = `19`, display `0019`;
- `test:CC` next = `1`;
- `test:INV` next = `1`;
- TEST workspace = clean;
- production health = READY;
- `cc-co-es@1` + `invoice-intl-en@1` are frozen historical renderer contracts;
- real `-B / -C / ...` corrections are enabled and independent from the base series.

Do not reopen Documents unless there is a regression or an explicit new Documents feature/version.

## 2. Active workstream

The selected next major workstream is **SD.Live Patch**.

Canonical product/design roadmap:

`docs/roadmap/future-sdlive-patch-2026-08-27.md`

Patch is currently in a **design/discovery gate**, not a schema/runtime gate.

The goal is a native SD.Live Admin workspace for:

- Inputs / patch sheet;
- Stage I/O devices + ports;
- Outputs;
- structured signal paths;
- versions/snapshots;
- show-day technical handoff;
- later Visual Patch;
- later artist-vs-house comparison/repatch workflows.

## 3. First required milestone

Before coding or migrations:

1. collect/review **3–5 real patch/rider examples** used in actual workflows;
2. identify recurring fields and real show-day decisions;
3. define the minimum shared model for **Inputs + Stage I/O + Outputs**;
4. decide master patch vs event snapshot/version semantics;
5. define stable IDs and reorder behavior;
6. define device/port identity and assignment rules;
7. define outputs independently where appropriate;
8. define validation/conflicts/capacity rules;
9. define event-link boundaries without taking ownership from REGISTRO/AppSheet;
10. sketch desktop/iPad/iPhone behavior;
11. document/approve the data contract;
12. only then start a schema/runtime PR.

Do **not** start with Visual Patch or a D1 migration.

## 4. Source-of-truth boundaries

### Patch

Future Patch D1 state may own technical entities such as patch sheets, versions, channels, outputs, devices, ports, structured connections and technical notes.

Exact schema/table names are not approved yet.

### REGISTRO / AppSheet

Remain the event/operations source of truth.

Patch may link to a durable event ID but must not own or silently write:

- work dates;
- client workflow status;
- billing/Finance state;
- payment state;
- AppSheet formulas.

### R2

May later hold Patch-managed technical files such as riders, stage plots, reference images and exports.

### Inventory

Separate future domain. Patch may later validate/reference Inventory, but must not own stock counts or allocations.

### Rental

Patch does not own Rental pricing, quote math or booking availability.

## 5. Product invariants

- The structured technical model is the source of truth.
- Visual Patch, when built later, is a projection of structured routing.
- Moving visual nodes must not silently change technical routing.
- Do not clone another product's proprietary UI/implementation.
- Do not use Google Sheets as the Patch database.
- Do not make drag-and-drop the only editor interaction.
- Do not fabricate console/show-file interoperability.
- Keep Patch modular inside the broader SD.Live Control Center.

## 6. Planned roadmap sequence

1. **Current discovery/data-contract gate**.
2. **MVP Patch Sheet** — Inputs + Stage I/O + Outputs + versions/snapshots.
3. **Visual Patch**.
4. **Device Profiles**.
5. **Show Workspace / Compare Patch**.

## 7. GitHub workflow

Repository:

`davidllano95/sdlive-show`

Use the **GitHub connector directly**. Do not ask the owner to perform manual GitHub actions that the connector can perform.

Before any change:

1. inspect current `main`;
2. read canonical docs;
3. compare docs with current code before proposing a runtime change;
4. if there is a discrepancy, diagnose it first rather than blindly continuing.

One coherent PR at a time.

Standing merge rule:

- if CI is green and there are no errors, squash-merge automatically;
- if CI or another error occurs, stop and ask for the failing log rather than guessing/correcting blindly.

Production-sensitive/destructive actions still require explicit owner authorization.

## 8. Canonical docs to read in the new conversation

Read, in this order:

1. `PROJECT_STATUS.md`
2. `README.md`
3. `ROADMAP_MASTER_CHECKLIST.md`
4. `docs/roadmap/sdlive-control-center.md`
5. `docs/roadmap/future-sdlive-patch-2026-08-27.md`
6. this file
7. `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md` only as background for the closed previous milestone.

Do not use older checkpoints to override these canonical sources.

---

# Copy/paste prompt for the next conversation

```text
Quiero empezar el siguiente gran workstream de SD.Live: SD.Live Patch.

Repositorio:
davidllano95/sdlive-show

IMPORTANTE:
Usa el conector de GitHub directamente para inspeccionar y trabajar en el repo. No me mandes a hacer manualmente tareas de GitHub que puedas hacer tú.

ANTES DE HACER CUALQUIER CAMBIO:
1. Inspecciona current main.
2. Lee, en este orden:
   - PROJECT_STATUS.md
   - README.md
   - ROADMAP_MASTER_CHECKLIST.md
   - docs/roadmap/sdlive-control-center.md
   - docs/roadmap/future-sdlive-patch-2026-08-27.md
   - docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md
   - docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md solo como contexto del milestone anterior ya cerrado.
3. Cruza esos docs con el código actual antes de proponer implementación.
4. Si encuentras una discrepancia, diagnostícala primero. No sigas automáticamente.

ESTADO ACTUAL:
- Documents v1 está CLOSED / PRODUCTION READY y no es el gate actual.
- PR #313 dejó el checkpoint final de Documents.
- samuel:CC estaba en next 21 al cierre.
- samuel:INV estaba en next 19 / display 0019 al cierre.
- TEST workspace quedó limpio con test:CC y test:INV en next 1.
- Templates cc-co-es@1 e invoice-intl-en@1 están congelados como contratos históricos.
- El siguiente workstream seleccionado es SD.Live Patch.

GATE ACTUAL:
SD.Live Patch está en DESIGN / DISCOVERY.
NO quiero que empieces codificando ni creando tablas D1.

PRIMER OBJETIVO:
Ayúdame a diseñar el MVP a partir de 3–5 ejemplos reales de patch/riders que yo te voy a dar.

Quiero que empecemos por:
- Inputs / patch sheet
- Stage I/O / devices / ports
- Outputs
- stable IDs
- orden/reorder de canales
- master patch vs event snapshot/version
- validaciones de conflictos y capacidad
- vínculo con REGISTRO sin crear un segundo source of truth
- UX desktop + iPad/iPhone

INVARIANTES:
- REGISTRO/AppSheet siguen siendo source of truth de evento/operaciones.
- Patch no debe escribir Finance ni apropiarse de billing/payment/client workflow state.
- Patch no debe ser source of truth de Inventory.
- Visual Patch vendrá después y será una proyección de datos estructurados, no la fuente de verdad.
- No clonar UI/implementación propietaria de terceros.
- No inventar interoperabilidad con show files/consolas que no esté verificada.
- No hacer drag-and-drop la única forma de operar.

WORKFLOW GITHUB:
- Un PR coherente a la vez.
- Antes de código: inspecciona main + docs + código relevante.
- Si CI queda verde y no hay errores, haz squash & merge automáticamente.
- Si CI o cualquier otro error falla, DETENTE y pídeme el log; no adivines la corrección.
- No hagas acciones destructivas/productivas irreversibles sin autorización explícita.

PRIMERA TAREA DE ESTA CONVERSACIÓN:
No programes todavía.
1. Resume el contrato actual de SD.Live Patch a partir de los docs.
2. Dime exactamente qué información quieres extraer de cada uno de mis 3–5 patch/riders reales.
3. Propón una plantilla de auditoría para comparar esos ejemplos y derivar el modelo mínimo compartido.
4. Después vamos ejemplo por ejemplo hasta cerrar el data contract del MVP.
```
