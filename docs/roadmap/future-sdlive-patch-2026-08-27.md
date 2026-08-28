# Future — SD.Live Patch

**Added:** 2026-08-27 — America/Bogota  
**Status:** FUTURE / NOT ACTIVE  
**Working name:** **SD.Live Patch**  
**Activation gate:** do not start implementation until the current Admin/Google Calendar OAuth + production smoke work is closed and the active stabilization documentation is reconciled.

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

## Source-of-truth contract

### D1 — Patch application state

D1 should own Patch entities and structured technical state, for example:

- `patch_sheets`
- `patch_versions`
- `patch_channels`
- `patch_outputs`
- `patch_devices`
- `patch_ports`
- `patch_connections`
- `patch_notes`
- `patch_event_links`

Exact schema is future design work; table names above are conceptual, not migration approval.

### R2 — Managed technical files

R2 should own uploaded/generated files such as:

- riders;
- stage plots;
- reference images;
- exported PDFs;
- console/show files where future support is technically appropriate.

### REGISTRO / AppSheet — Event identity only

REGISTRO/AppSheet remain the operational event source of truth.

A Patch may link to a durable REGISTRO event ID, but Patch must not become a second owner of:

- work dates;
- client workflow state;
- billing/finance fields;
- AppSheet formulas;
- payment state.

A patch can exist independently of an event and later be attached/reused.

## Core model — signal path, not only channel list

The system should be able to represent a path such as:

`Source → Mic/DI → Stagebox input → Console input → Channel → Group/DCA → Output path`

Example:

`Kick → Audix D6 → Stagebox A / In 1 → Console In 1 → Ch 1 → Drums DCA → Main LR`

This model should preserve source identity when console/stagebox mappings change.

## Phase 1 — MVP Patch Sheet

Minimum useful show-day product:

### Inputs

Per input/channel:

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

- fast table/list editing;
- drag handle for reorder;
- accessible Move Up / Move Down fallback;
- duplicate-channel and duplicate-port warnings;
- autosave with explicit saved/error state;
- desktop-first complex editor with a useful mobile/read-only or bounded show-day mode decided during design.

### Versions / snapshots

Examples:

- v1;
- rehearsal;
- soundcheck;
- show;
- Bogotá 2026;
- venue-specific revision.

A snapshot must preserve the technical state used for that performance even if the master patch later changes.

## Phase 2 — Visual Patch

Add a visual signal-flow workspace capable of representing:

`Source → Device/Port → Device/Port → Console Channel → Destination`

Requirements:

- connections are persisted structured data, not freehand pixels;
- visual nodes are projections of the underlying patch model;
- moving a node visually must not silently change technical routing;
- invalid/double-assigned ports are surfaced clearly;
- accessibility must not rely on drag-and-drop alone.

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

- Overview
- Calendar
- Patch
- Stage I/O
- Files / Rider
- Site Schedule
- Finance link/context
- Equipment / Inventory when that future module exists

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

Output may include:

- changed channel assignments;
- changed stagebox ports;
- missing/extra sources;
- conflicts;
- concise repatch checklist for festival/house tech handoff.

## Documents / sharing

Future output should include:

- printable landscape patch sheet PDF;
- input list;
- output list;
- stage I/O list;
- repatch list;
- read-only share link protected by an appropriate bounded access model;
- CSV import/export where it preserves identity and validation safely.

PDF generation is documentation only and does not create a new source of truth.

## Event linkage

Preferred future relationship:

`REGISTRO durable ID → Patch Sheet / selected Patch Version`

An event may:

- reuse a touring/master patch;
- pin a specific snapshot/version;
- fork a venue-specific revision without destroying the master.

Creating or editing a Patch must never write generic fields back into REGISTRO/AppSheet.

## Relationship to future Inventory

Patch and Inventory should be designed to integrate later but remain separate domains.

Examples of future useful cross-checks:

- patch requires 12 wireless channels but only 8 are available for the event;
- patch references two DL32 units and Inventory has only one unallocated;
- patch references a microphone model not assigned to the event.

Inventory remains its own single source of truth; Patch consumes availability/assignment information rather than owning stock.

## Non-goals / invariants

- Do not clone another product's UI or proprietary implementation.
- Do not use Google Sheets as the Patch database.
- Do not create a second source of truth for REGISTRO/AppSheet event workflow.
- Do not couple Patch data to Finance formulas.
- Do not move Rental pricing/quote logic into Patch.
- Do not infer or modify console show files unless a future format is explicitly verified and safely supported.
- Do not make drag-and-drop the only way to operate the editor.
- Do not start this module while the current Admin/Calendar stabilization gate is still open.

## First implementation milestone when activated

Before coding:

1. audit 3–5 real SD.Live patch/rider examples;
2. define the minimum shared data model from those real shows;
3. decide master patch vs event snapshot semantics;
4. lock stable IDs and ordering contract;
5. prototype Input List + Stage I/O + Outputs only;
6. validate it against a real rehearsal/show workflow;
7. only then begin Visual Patch and console profiles.

## Roadmap sequence

When promoted from FUTURE:

**MVP Patch Sheet → Visual Patch → Device Profiles → Show Workspace / Compare Patch**

Until promoted, this document is a product/design checkpoint only and authorizes no schema migration or runtime work.
