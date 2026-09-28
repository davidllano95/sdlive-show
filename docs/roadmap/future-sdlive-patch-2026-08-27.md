# SD.Live Patch — Active design / discovery roadmap

**Added:** 2026-08-27 — America/Bogota  
**Promoted to active gate:** 2026-09-28 — after Documents v1 production-ready closeout  
**Status:** **ACTIVE DESIGN / DISCOVERY GATE**  
**Working name:** **SD.Live Patch**

> This roadmap is now active for product/data-model discovery. It does **not** by itself authorize schema migration or runtime implementation. The first gate is to derive the MVP model from real SD.Live patch/rider examples.

## Product intent

Build a native SD.Live Admin tool for patch sheets, signal-flow documentation and show-day technical handoff, inspired by the workflow category represented by tools such as Patchy, but designed around SD.Live's existing operations architecture instead of as a standalone duplicate system.

The product should feel like a first-class **show workspace module**, not a generic spreadsheet replacement.

Primary goals:

- maintain a clean input/output patch sheet;
- represent the real signal path, not only channel numbers;
- make stage I/O and console I/O conflicts visible;
- support fast show-day editing, versions and snapshots;
- generate useful shareable/printable technical documentation;
- link a patch to an existing SD.Live work/event without creating a second operations source of truth;
- eventually support house-vs-artist patch comparison and repatch lists.

## Activation context

The prior blocking work is closed:

- Admin/Calendar stabilization is closed;
- Finance owner-money/third-party work is closed;
- Documents v1 is **PRODUCTION READY** through PR #313;
- Documents real series are active and TEST workspace is clean.

Therefore Patch is now the selected major workstream, beginning with data-model discovery.

## Source-of-truth contract

### D1 — future Patch application state

D1 is the intended owner of Patch entities and structured technical state **after** the MVP schema is deliberately approved.

Conceptual entities may include:

- `patch_sheets`;
- `patch_versions`;
- `patch_channels` / inputs;
- `patch_outputs`;
- `patch_devices`;
- `patch_ports`;
- `patch_connections`;
- `patch_notes`;
- `patch_event_links`.

These names remain conceptual until the data contract is approved. No migration is authorized by this document alone.

### R2 — managed technical files

R2 may own uploaded/generated technical files such as:

- riders;
- stage plots;
- reference images;
- exported PDFs;
- console/show files where future support is technically appropriate and explicitly verified.

### REGISTRO / AppSheet — event identity only

REGISTRO/AppSheet remain the operational event source of truth.

A Patch may link to a durable REGISTRO event ID, but Patch must not become a second owner of:

- work dates;
- client workflow state;
- billing/Finance fields;
- AppSheet formulas;
- payment state.

A patch can exist independently of an event and later be attached/reused.

### Inventory — separate future domain

Patch may eventually consume or validate Inventory availability/assignment information, but must not own stock counts, allocations or equipment source-of-truth semantics.

## Core model — signal path, not only channel list

The system should eventually be able to represent a path such as:

`Source → Mic/DI → Stagebox input → Console input → Channel → Group/DCA → Output path`

Example:

`Kick → Audix D6 → Stagebox A / In 1 → Console In 1 → Ch 1 → Drums DCA → Main LR`

The structured model must preserve source identity when console/stagebox mappings change.

## Current gate — derive the MVP from real shows

Before writing schema or editor code:

1. audit **3–5 real SD.Live patch/rider examples**;
2. list every field/decision actually used on show day;
3. separate recurring core data from venue/show-specific notes;
4. define the minimum shared model for **Inputs + Stage I/O + Outputs**;
5. decide master patch vs event snapshot/version semantics;
6. lock stable IDs and ordering/reorder behavior;
7. define device/port identity and assignment rules;
8. define output identity independently from input channels where appropriate;
9. define conflict/capacity validation;
10. define event-link semantics without creating a second operations source of truth;
11. sketch desktop/iPad/iPhone behavior;
12. only then approve a schema/runtime milestone.

The first conversation after activation should therefore be **analysis/design**, not coding.

## Phase 1 — MVP Patch Sheet

Minimum useful show-day product, subject to confirmation from the real-example audit.

### Inputs

Candidate per input/channel fields:

- stable channel/item ID;
- channel number/order;
- source/name;
- performer/instrument where useful;
- mic / DI;
- phantom power / 48V;
- stage input;
- console input;
- direct out where applicable;
- group/DCA;
- notes.

### Outputs

Support structured outputs such as:

- Main L/R;
- Subs;
- front fills / delays / matrices;
- wedges;
- IEM sends;
- broadcast/record feeds;
- other named outputs.

### Stage I/O

Represent devices and ports:

- stageboxes;
- local console I/O;
- digital snakes/tie lines where appropriate;
- available vs assigned inputs/outputs.

### Editing UX

Candidate requirements:

- fast table/list editing;
- drag handle for reorder;
- accessible Move Up / Move Down fallback;
- duplicate-channel and duplicate-port warnings;
- autosave with explicit saved/error state;
- desktop-first complex editing;
- useful iPad/iPhone show-day mode designed deliberately, not as a squeezed desktop table.

### Versions / snapshots

Examples:

- v1;
- rehearsal;
- soundcheck;
- show;
- Bogotá 2026;
- venue-specific revision.

A snapshot/version must preserve the technical state used for a performance even if the master patch later changes.

## Phase 2 — Visual Patch

Add a visual signal-flow workspace capable of representing:

`Source → Device/Port → Device/Port → Console Channel → Destination`

Requirements:

- connections are persisted structured data, not freehand pixels;
- visual nodes are projections of the underlying patch model;
- moving a node visually must not silently change technical routing;
- invalid/double-assigned ports are surfaced clearly;
- accessibility must not rely on drag-and-drop alone.

**Do not begin Phase 2 until the Phase 1 structured data model is production-proven.**

## Phase 3 — Console / device profiles

Future device profiles may model relevant I/O constraints for platforms such as:

- Yamaha;
- DiGiCo;
- Allen & Heath;
- Behringer/Midas;
- Waves;
- other consoles/stageboxes actually needed by SD.Live workflows.

Profiles should describe capabilities/ports; they must not fabricate unsupported show-file interoperability.

Potential validation example:

> Patch defines 52 required inputs, but the selected console/stagebox configuration exposes only 48 mapped inputs.

## Phase 4 — Show Workspace integration

Longer-term direction: an SD.Live event can expose a unified technical workspace such as:

- Overview;
- Calendar;
- Patch;
- Stage I/O;
- Files / Rider;
- Site Schedule;
- Finance link/context;
- Equipment / Inventory when that future module exists.

This must remain modular: opening an event workspace must not cause Finance, CMS, Patch and other heavy runtimes to execute unnecessarily.

## Patch comparison / festival workflow

High-value future feature:

Compare an **Artist Patch** against a **House Patch** and generate a deterministic repatch/cross-patch list.

Example concept:

| Artist | Artist ch | House ch | Status |
| --- | ---: | ---: | --- |
| Kick | 1 | 1 | Match |
| Snare | 2 | 2 | Match |
| Bass | 8 | 12 | Repatch |
| Vocal | 21 | 17 | Repatch |

Potential output:

- changed channel assignments;
- changed stagebox ports;
- missing/extra sources;
- conflicts;
- concise repatch checklist for festival/house tech handoff.

## Documents / sharing

Future Patch output may include:

- printable landscape patch sheet PDF;
- input list;
- output list;
- stage I/O list;
- repatch list;
- bounded read-only share link;
- CSV import/export where identity and validation can be preserved safely.

Patch PDFs are technical documentation only and do not create a new source of truth.

## Event linkage

Preferred future relationship:

`REGISTRO durable ID → Patch Sheet / selected Patch Version`

An event may:

- reuse a touring/master patch;
- pin a specific snapshot/version;
- fork a venue-specific revision without destroying the master.

Creating or editing a Patch must never write generic fields back into REGISTRO/AppSheet.

## Relationship to Documents

Documents v1 is closed and production-ready. Patch may reuse architectural lessons such as:

- stable immutable snapshots;
- private managed artifacts;
- responsive Admin UX;
- explicit source-of-truth boundaries.

Do not couple Patch numbering/state to legal/financial Documents numbering.

## Non-goals / invariants

- Do not clone another product's UI or proprietary implementation.
- Do not use Google Sheets as the Patch database.
- Do not create a second source of truth for REGISTRO/AppSheet event workflow.
- Do not couple Patch data to Finance formulas.
- Do not move Rental pricing/quote logic into Patch.
- Do not infer or modify console show files unless a future format is explicitly verified and safely supported.
- Do not make drag-and-drop the only way to operate the editor.
- Do not make Visual Patch the source of truth.
- Do not create a Patch schema before the real-example audit and data contract are approved.

## Roadmap sequence

**Current discovery gate → MVP Patch Sheet → Visual Patch → Device Profiles → Show Workspace / Compare Patch**

## Exact continuation

**Open a new conversation, inspect current `main` plus the canonical status/roadmap/handoff docs, and begin by reviewing 3–5 real SD.Live patch/rider examples. Derive and document the minimum shared model for Inputs + Stage I/O + Outputs, stable IDs/order, versions/snapshots, conflict validation and event-link boundaries. Do not code or migrate D1 until that model is approved.**
