# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-28 — America/Bogota**

Current verified production checkpoint:

`623f4a2c7e1b01f3dc6867a5d90631aff0a13659` — PR #313, `Documents: close v1 as production ready`.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged; production smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS. CORE IMPLEMENTED != PRODUCTION ENABLED.**

# ✅ Documents v1 — CLOSED / PRODUCTION READY

Canonical contract and maintenance references:

- `docs/roadmap/sdlive-documents-v1.md`
- `docs/operations/documents-v1-maintenance.md`
- `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`

Production closeout through PR #313 includes:

- [x] dedicated `DOCS_DB` + private `DOCS_BUCKET`;
- [x] immutable draft/final snapshot architecture;
- [x] issuer/client profiles and private signatures;
- [x] Cuenta de Cobro + international Invoice editor/preview;
- [x] TEST Finalize and private PDF pipeline;
- [x] real-series preflight and explicit bootstrap;
- [x] real `samuel:CC` and `samuel:INV` series active;
- [x] real Finalize enabled;
- [x] real correction/revision chains `-B / -C / ...` enabled;
- [x] revision counters independent from base numbering;
- [x] inline private PDF viewer + explicit download;
- [x] frozen v1 renderer contracts `cc-co-es@1` and `invoice-intl-en@1`;
- [x] mobile-first Documents workflow for iPhone/iPad;
- [x] TEST workspace purge tooling and clean production baseline;
- [x] production health/preflight READY.

Production numbering at closeout:

- `samuel:CC` current next = `21`;
- `samuel:INV` current next integer = `19`, display `0019`;
- `test:CC` next = `1`;
- `test:INV` next = `1`.

Documents is not the current Active Gate. Do not reopen it without regression evidence or a deliberate new feature/version. Output-affecting renderer changes require a new template version (`@2`, etc.).

# 🚧 Current Active Gate — SD.Live Patch

**ACTIVE DESIGN / DISCOVERY GATE.**

Canonical roadmap:

`docs/roadmap/future-sdlive-patch-2026-08-27.md`

Activation handoff:

`docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md`

## Product goal

Build a native SD.Live Admin workspace for:

- input patch sheets;
- output lists;
- stage I/O/device/port assignments;
- structured signal paths;
- versions/snapshots;
- show-day technical handoff;
- later artist-vs-house patch comparison/repatch workflows.

Patch is a technical-documentation/workflow domain. It must not become a second source of truth for Finance, event dates/status or Inventory stock.

## Source-of-truth boundaries

### Patch

D1 may own future Patch application state after the schema is deliberately approved.

Potential entities are conceptual until that approval:

- patch sheets;
- versions/snapshots;
- channels/inputs;
- outputs;
- devices/ports;
- structured connections;
- notes/files/event links.

### REGISTRO / AppSheet

Remain the event/operations source of truth. Patch may link to a durable event ID, but must not own or silently write:

- work dates;
- client workflow status;
- Finance/billing/payment fields;
- AppSheet formulas.

### R2

May later own Patch-managed technical files such as riders, stage plots, references and generated exports.

### Inventory

Future integration is read/validate/link only until Inventory itself has a defined source of truth. Patch must not own stock counts or allocation.

## First bounded milestone — NO RUNTIME YET

Before schema or UI implementation:

- [ ] audit **3–5 real SD.Live patch/rider examples**;
- [ ] identify recurring fields and show-day decisions actually used;
- [ ] define the minimum shared MVP model;
- [ ] decide master patch vs event snapshot/version semantics;
- [ ] lock stable IDs and channel ordering behavior;
- [ ] define how stage I/O devices and ports are represented;
- [ ] define outputs independently from inputs where appropriate;
- [ ] define conflict validation: duplicate channels, duplicate physical ports, capacity mismatches;
- [ ] define event-link contract without Finance/operations ownership drift;
- [ ] sketch the MVP UX for **Inputs + Stage I/O + Outputs**;
- [ ] approve the data contract before any D1 migration.

Do **not** begin with Visual Patch. The visual graph must be a projection of structured routing, not the underlying source of truth.

## Planned sequence after design approval

1. **MVP Patch Sheet** — Inputs + Stage I/O + Outputs + versions/snapshots.
2. **Visual Patch** — structured node/connection projection.
3. **Device Profiles** — capabilities/port constraints for actually-needed consoles/stageboxes.
4. **Show Workspace / Compare Patch** — event integration and deterministic artist-vs-house repatch workflows.

## Explicit non-goals for the first milestone

- no console show-file reverse engineering/import unless a format is explicitly verified later;
- no generic Inventory system;
- no Finance write-back;
- no clone of a third-party product UI or proprietary workflow;
- no drag-and-drop-only interaction;
- no Visual Patch before the structured model is sound.

# Finance — owner money + third-party milestone

✅ **CLOSED / PASS.**

- Google Sheets remains Finance persistence.
- `REGISTRO` remains the parent work/payment table.
- `PAGO_TERCEROS` remains the physical third-party obligation/payment ledger.
- AppSheet SD.Live Track remains the primary mobile/offline workflow.
- General Finance Admin remains read-only except the already-approved narrow third-party payment fact write.
- No generic Finance write-back, no D1 Finance mirror and no bidirectional sync.

Known Finance cleanup/debt remains backlog and does not block Patch.

# Other closed foundations

- ✅ Availability Core v1.
- ✅ Lead Core through PR #190.
- ✅ Assistant storage/backend/runtime/public widget/full E2E rollout.
- ✅ Forms Turnstile disposition.
- ✅ Calendar controlled create + multi-day.
- ✅ Site Schedule / automatic Show Day / Location.
- ✅ Show Day Admin force control.
- ✅ Admin stabilization.
- ✅ Public visual stabilization.
- ✅ Rental image-editor parity.
- ✅ Finance dashboard/third-party/owner-money milestones through PR #259.
- ✅ Documents v1 through PR #313.

# WhatsApp owner control

🟢 **CODE MERGED / ROLLOUT PAUSED.**

PR #246 is merged; Meta/Cloudflare live owner-number rollout remains intentionally paused unless explicitly reopened.

# PILA estimator

⏳ **BACKLOG / RESEARCH CANDIDATE ONLY.**

Research current Colombian legal/operational rules again if/when deliberately selected.

# Backlog after Patch

- Rental real-time availability + double-booking protection.
- Quote/Cotización kinds on the Documents foundation.
- Mobile Rental Cart total/sticky summary.
- Calendar/Projects workflow additions.
- CRM/Admin Inbox/Workspace association.
- Analytics/SEO/performance/accessibility/CMS backlog.
- Finance cleanup/debt.
- PILA estimator research/planning.

# Non-negotiable workflow

1. Inspect current `main` and current canonical docs before changing anything.
2. Use one short branch per coherent change.
3. Implement/update only the approved scope.
4. Run tests and wait for CI.
5. Open one PR.
6. If CI is green and there are no errors, squash-merge under the current standing authorization.
7. If CI or another error occurs, stop and request the failing log rather than guessing.
8. Run one representative production smoke for runtime changes when appropriate.
9. Irreversible/destructive production actions still require explicit authorization.

# Exact continuation

**Start SD.Live Patch as a design/discovery gate. In a new conversation, inspect current `main`, `PROJECT_STATUS.md`, `README.md`, this roadmap, `docs/roadmap/sdlive-control-center.md`, `docs/roadmap/future-sdlive-patch-2026-08-27.md`, and `docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md`. Do not code first. Begin by reviewing 3–5 real patch/rider examples and derive the MVP data contract for Inputs + Stage I/O + Outputs, including stable IDs, ordering, version/snapshot semantics and event linkage boundaries.**
