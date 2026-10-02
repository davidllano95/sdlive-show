# SD.Live Patch — canonical product/data contract

**Started:** 2026-09-28 — America/Bogota  
**Status:** **ACTIVE DESIGN / DISCOVERY — NO SCHEMA OR RUNTIME AUTHORIZED**  
**Canonical product/design contract:** this file  
**Historical precursor:** `docs/roadmap/future-sdlive-patch-2026-08-27.md`  
**Activation handoff:** `docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md`

> This document is the evolving canonical contract for SD.Live Patch while discovery is active. It records approved product decisions, boundaries, terminology, examples, unresolved questions and sequencing. It does **not** authorize D1 tables, migrations, APIs, Cloudflare resources, production state or runtime UI.

## 1. Product statement

SD.Live Patch is the technical source of truth for describing a show's signal system:

- what operational signals exist;
- how they are captured;
- how they travel through devices and infrastructure;
- how they are assigned to physical/network I/O;
- how they map into one or more consoles;
- how output purposes are generated and routed;
- what technical state was planned, connected and verified;
- what exact state was used at a named moment/event.

The same structured technical model should eventually project into views such as:

- Input List;
- Output List;
- Stage I/O;
- console-specific input tables;
- Patch Sheet;
- Easy Patch / routing matrix;
- Pre-production workspace;
- Operation / show-day workspace;
- Line Check;
- house-vs-artist diff/repatch list;
- Visual Patch;
- printable/shareable exports.

Those views are projections of one technical model. They are not separate sources of truth.

## 2. What Patch is not

Patch is not:

- a generic spreadsheet replacement;
- a clone of Patchy or another third-party product;
- a console show-file editor;
- a live mixing/control engine;
- Dante Controller or another AoIP controller replacement;
- Inventory source of truth;
- REGISTRO/AppSheet event source of truth;
- Finance source of truth;
- a drawing tool where freehand graphics define routing;
- a cable inventory/asset-tracking system.

Visual Patch, when built, remains a projection of structured data. Drag/drop must never be the only way to edit the system.

## 3. Current discovery sequence

The current sequence is:

1. Product Concept;
2. Patchy/workflow benchmark;
3. User Workflows;
4. Terminology;
5. MVP Scope;
6. Data Contract;
7. UX Contract;
8. validate against 1–2 real SD.Live patches/riders as fixtures;
9. Product Spec;
10. Technical Roadmap;
11. Schema;
12. Implementation.

Earlier activation docs proposed starting by auditing 3–5 real patch/rider examples. That remains useful validation material, but the current sequence deliberately defines the product/model first and then uses real patches to break/validate it before schema approval.

No schema/runtime milestone begins until this contract is sufficiently stable and validated.

## 4. Source-of-truth boundaries

### 4.1 Patch

Patch will own structured technical state such as sources, feeds, console assignments, outputs, devices, ports/endpoints, infrastructure, internal routing, connections, operational verification state, versions/snapshots and technical notes/files when those capabilities are implemented.

Exact schema/table names are **not approved**.

### 4.2 REGISTRO / AppSheet

REGISTRO/AppSheet remain the source of truth for event/operations identity and workflow.

Patch may link to a durable event ID, but must not become a second owner of:

- work dates;
- client workflow state;
- billing/Finance state;
- payment state;
- AppSheet formulas or operational business logic.

A Patch may exist without an Event and be linked later.

### 4.3 Inventory

Inventory remains a separate future domain. Patch may eventually read/reference/validate Inventory facts, but must not own stock counts, allocation or asset availability semantics.

### 4.4 Files / R2

Future Patch-managed files may include riders, stage plots, reference images, exports and technically supported console/configuration files. Storage/runtime details remain deferred until implementation planning.

## 5. Core product invariants

1. **Structured technical data is the source of truth.**
2. **Source identity is independent from physical/console assignment.**
3. **Logical console channels are independent from physical/network inputs.**
4. **Output purpose is independent from the console-specific internal path that generates it.**
5. **Devices expose real configurable ports/endpoints; do not assume symmetric I/O.**
6. **Infrastructure is not forced to be a Device.**
7. **Connections represent technical relationships, not individual cable assets.**
8. **Incomplete/TBD is valid planning state and is different from Conflict.**
9. **Configuration changes never silently destroy existing patch information.**
10. **Profiles/templates accelerate creation but never silently override an existing configured instance.**
11. **No protocol/vendor capability is invented. Unknown/unverified capabilities must remain explicitly unverified.**
12. **Console/AoIP export or write-back may exist later only through verified adapters.**
13. **Patch documents routing/configuration, not the mix.**

## 6. Patch identity, lineage and event state

### 6.1 Patch

A `Patch` is a concrete, editable, self-contained technical configuration.

A Patch can:

- exist standalone;
- be linked to an Event later;
- be reused as the starting point for another Patch;
- be derived from another Patch;
- be compared with any other Patch even when there is no lineage relationship.

Do not create fundamentally different storage entities for standalone/master/event patch types unless later evidence requires it.

### 6.2 Master is a semantic role, not a different species of object

A Patch can act as the master/canonical base for future derived work.

Expected UX concepts:

- `Start blank`;
- `Use existing Patch as starting point`.

A derived Patch can diverge without mutating the master.

Alternate plans can be siblings derived from the same master.

### 6.3 Event Patch / Working State

An Event may work from a Patch derived from a Master.

Show-day changes affect the Event working state first. They must **not** silently change the Master.

A future action may allow selected changes to be applied back to the Master deliberately.

Conceptual relationship:

```text
Master Patch
  -> Event Patch / Working State
       -> Pre-production view
       -> Operation view
       -> Performance Snapshot(s)
```

### 6.4 Pre-production and Operation are views over the same Event state

Do not duplicate the technical data into separate pre-production and operation copies.

**Pre-production view** emphasizes:

- planning;
- artist/house prep;
- cajetines/prepatches;
- alternatives;
- staged/ready/TBD information;
- system completion and conflicts.

**Operation view** emphasizes:

- current/next/changeover;
- what is connected;
- what is verified;
- important warnings;
- damaged ports/lanes in use;
- unresolved problems;
- concise show-day actions.

## 7. History and Snapshots

Patch needs both:

### 7.1 Automatic History

History records relevant technical changes over time and answers:

> What changed?

### 7.2 Manual named Snapshots

A Snapshot is a frozen named state such as:

- Rehearsal;
- Soundcheck;
- Show;
- Venue-specific performance state.

It answers:

> Exactly how was the Patch at that moment?

Snapshots preserve historical state even if the working Patch or Master later changes.

Snapshot semantics should be immutable unless later product review finds a compelling reason otherwise.

## 8. Sources, Source Groups and Feeds

Terminology in this section is approved conceptually but some final labels remain provisional.

### 8.1 Source

A `Source` is an atomic operational signal identity chosen by the user.

Examples:

- `Bass`;
- `Lead Vocal`;
- `Playback L`;
- `Playback R`;
- `OH L`;
- `OH R`;
- `Snare Top`;
- `Snare Bottom`.

A Source remains the same when physical or console routing changes.

Example:

`Bass` remains `Bass` whether it arrives at `Rio A/In 1`, `Rio B/In 24` or another console input.

A microphone/DI choice also does not redefine the Source identity.

### 8.2 Source atomicity is operational, not inferred from the instrument

The system must not decide source granularity automatically from physical reality.

Examples:

- `Snare Top` and `Snare Bottom` are normally two Sources.
- `OH L` and `OH R` are two Sources.
- a guitar cabinet with SM57 + R121 may be represented either as one Source with two Feeds or as two grouped Sources, depending on the operator's intended processing/documentation model.

The data model should avoid making later granularity changes unnecessarily destructive.

### 8.3 Source Group — provisional name

Sources may be related conceptually without forcing console stereo/linking/processing behavior.

Examples:

```text
Playback
  - Playback L
  - Playback R

Overheads
  - OH L
  - OH R

Snare
  - Snare Top
  - Snare Bottom
```

Possible future hierarchy such as `Drums > Snare > Top/Bottom` should not be blocked, but deep hierarchy is not an MVP requirement.

### 8.4 Feed — provisional concept

A Feed represents a particular capture/representation/path of a Source before downstream routing branches.

Example:

```text
Bass
  -> DI feed
  -> Amp Mic feed
```

The same Feed can branch to multiple destinations and remains the same Feed:

```text
Bass DI Feed
  -> FOH
  -> MON
  -> Record
```

Do not duplicate a Feed merely because it reaches multiple consoles/destinations.

The exact lifecycle/materialization of a Feed remains an open design question. UX should use progressive disclosure and must not show meaningless `Feed Main` rows for every simple Source.

Capture and console assignment may be completed in either order; incomplete fields are valid planning state.

## 9. Console model

### 9.1 Console Instance

A Console Instance is the concrete configured console used in a Patch.

It may be created from:

- a verified reusable profile;
- a custom reusable profile;
- a blank/manual configuration.

A blank console is valid: the user can define the real inputs, I/O, internal path families and capabilities as required.

### 9.2 Console Profile

Profiles are accelerators/validators, not authority over an existing instance.

A configured Console Instance can deviate from its source Profile for:

- installed cards;
- enabled options;
- show-specific configuration;
- actual mode/capacity.

If a Profile changes later, an existing instance must not auto-update.

Expected workflow:

- `Keep current configuration`;
- `Review & Update`;
- future selective update/diff where useful.

Profile changes never rewrite historical Snapshots.

### 9.3 Logical Console Channel

A console channel is a logical processing slot in that console.

`Ch 1`, `Ch 2`, etc. are real logical slots, but they are **not** Source identities and they are **not** inherently tied to physical input socket numbers.

The model must separate:

1. physical/network input endpoint;
2. console input routing/patch assignment;
3. logical Console Channel.

The same physical/network input may feed more than one logical channel when the console permits it.

Moving/reordering a documentation row must never silently change technical routing.

### 9.4 Per-console Input views

When the same Feed reaches multiple consoles, each console gets its own Inputs table/view.

Example:

```text
Bass DI Feed
  -> FOH Ch 15
  -> MON Ch 9
```

These views share the same underlying Source/Feed identity; they do not create duplicate Sources.

### 9.5 Mono/stereo/link behavior belongs to console representation

Atomic Sources such as `Playback L` and `Playback R` may map to:

- two independent mono channels;
- two linked channels;
- one stereo logical channel;
- other console-specific representation.

Source identity does not force one representation.

### 9.6 Mix parameters are out of scope

Patch is not a gain-staging or mixing application.

Do not model/control values such as:

- analog gain values;
- digital trim values;
- EQ;
- dynamics;
- faders;
- mix levels.

Specific routing/configuration metadata may be included when it matters to system behavior. `Gain Compensation active/inactive` is explicitly desired as a future routing/shared-preamp fact.

## 10. Outputs

### 10.1 Output Path

An `Output Path` represents the logical/system purpose of an output, independent from the socket or console-specific internal family that creates it.

Examples:

- `Main L`;
- `Main R`;
- `Subs`;
- `Front Fill`;
- `Delay`;
- `Broadcast Feed`;
- named monitor/IEM destinations where appropriate.

The Output Path identity remains the same if its physical/network endpoint changes.

### 10.2 Do not hardcode universal Bus/Group/Aux/Matrix/Main semantics

Console architectures differ.

SD.Live must not assume every platform uses the same universal taxonomy for:

- groups;
- buses;
- auxes;
- matrices;
- mains.

A console profile/instance defines the internal path families and capabilities available on that console.

The same system Output Path may be generated by different console-specific resources:

```text
Front Fill
  <- Matrix 3   on one console
  <- Bus 12     on another
  <- Main C     on another
  <- Aux 8      on another
```

The core owns purpose; the console configuration maps an internal resource to that purpose.

## 11. Devices

### 11.1 Device

A `Device` is equipment with a functional technical role in the signal system.

Examples:

- console;
- digital stagebox;
- interface;
- splitter;
- DI;
- converter;
- amplifier/processor where technically relevant.

A splitter is always a Device because it performs explicit branching/function.

### 11.2 Device Instance vs Device Profile

A Device Instance is the concrete configured device in a Patch.

A Device Profile may predefine known capabilities/ports, but a Device can always be configured manually if:

- no profile exists;
- the profile is unverified;
- the real instance differs from the standard model.

Verified and custom profiles use the same general mechanism but should preserve provenance/confidence.

### 11.3 Device capabilities are instance-aware

Do not assume a model has one fixed I/O capability under every configuration.

Available capabilities may depend on:

- sample rate;
- installed card/module;
- operating mode;
- license/capability enabled;
- firmware when it materially changes capability;
- redundancy/configuration mode.

The instance configuration determines what is actually available in that Patch.

## 12. Ports and Endpoints

### 12.1 Port definition

A `Port` is an addressable technical endpoint of a Device that can participate in routing/connections.

Devices are defined by their actual Ports, **not** by symmetric global counts such as `N inputs + N outputs`.

Valid asymmetric example:

```text
Device X
  AES In 1
  AES In 2
  AES In 3
  AES In 4
  AES Out 1
  AES Out 2
```

### 12.2 Port properties

Conceptually separate at least:

- identity/label/index;
- direction: input/output/bidirectional where appropriate;
- connector/physical form: XLR, BNC, RJ45, optical, multipin, etc.;
- signal/protocol: Analog, AES3, Dante, AES67, MADI, SoundGrid, etc.;
- capabilities;
- active configuration/mode when configurable;
- capacity/lane structure when compound.

Do not infer signal compatibility from connector shape alone.

Example:

- XLR Analog != XLR AES3.

### 12.3 Physical and virtual/network endpoints are both first-class

Ports/endpoints may be physical sockets or virtual transport channels.

Examples:

- `Analog In 12`;
- `AES Out 1`;
- `Dante Rx 45`;
- `Dante Tx 17`;
- `MADI 24`;
- `SoundGrid Ch 32`.

The model must not assume every AoIP/transport protocol behaves like Dante.

### 12.4 Transport capability is device-specific

Do not assume `Dante = 64x64` or any other global channel count.

Each Device Profile/Instance describes the real Tx/Rx or equivalent capability for its actual configuration.

Capacity and individual endpoints are separate concepts: the product can know that a device has a 64-channel capacity without forcing 64 empty rows to dominate the UI.

### 12.5 Configurable/multi-mode Ports

A single physical Port may support multiple modes/protocols.

Example:

```text
Port: XLR 1
Connector: XLR
Supported modes:
  - Analog In
  - AES3 In
Active mode:
  - AES3 In
```

It remains the same physical Port identity when its mode changes.

If a mode change makes an existing Connection invalid, preserve the Connection and mark it `Conflict / Invalid`. Never delete/rewrite it silently.

## 13. Capacity, Availability, Assignment and Condition

These are separate concepts.

### 13.1 Capacity

What the configured Device/Port can technically provide.

### 13.2 Availability

What may be used in this Patch/Event.

Approved states:

- `Available`;
- `Reserved`;
- `Unavailable`.

### 13.3 Assignment

Whether a Port/lane is currently free or assigned.

Conceptually:

- `Free`;
- `Assigned`.

### 13.4 Condition

Approved technical condition states:

- `OK`;
- `Damaged`.

Do **not** add `Unknown / Not tested` as a condition state. Testing/readiness is already represented by operational state.

A Port can validly be:

`Damaged + Available + Assigned`

because a damaged channel may still work, be intermittent or have been marked damaged by mistake.

`Damaged` therefore creates a strong warning, not a hard block.

### 13.5 Availability warnings

Approved behavior:

- `Reserved + Assigned` -> important warning, allowed;
- `Unavailable + Assigned` -> critical warning, allowed;
- `Damaged + Assigned` -> important/critical visible warning, allowed.

Patch should inform the operator without assuming it knows more than the technician on site.

### 13.6 Device-wide damage/unavailability is not the primary workflow

Operational defects normally belong to specific Ports/Lanes.

If an entire device fails in real life, it is usually replaced and often remains patched equivalently. Patch should not require a special `Replace Device` workflow merely to document that physical swap.

Only update Patch when the replacement changes technically relevant configuration/routing/capacity.

## 14. Compound Ports, multipins and lanes

A multi-channel physical connector is a compound Port with independent lanes/endpoints.

Example:

```text
Multipin A
  Lane 1
  Lane 2
  ...
  Lane 24
```

The parent represents the physical connector. Lanes represent independent signal paths.

### 14.1 Lane mappings

Mappings do not need to be continuous or 1:1.

Valid examples:

```text
Lane 1 -> Lane 1
Lane 2 -> Lane 2
Lane 4 -> Lane 4
```

or:

```text
Lane 1 -> Lane 5
Lane 2 -> Lane 6
Lane 4 -> Lane 8
```

Unused/skipped lanes are valid and must remain explicit rather than being compacted automatically.

### 14.2 Physical connector state vs lane use

A compound Port can be physically connected even when only some lanes are used.

Example:

```text
Multipin A: Connected
  Lane 1  Kick    Used
  Lane 2  Snare   Used
  Lane 3          Unused
  Lane 4  Bass    Used
```

Unused lanes do not make the parent connection incomplete.

### 14.3 Damage on compound Ports

If an entire multipin/compound Port is marked Damaged, its lanes inherit the damage warning by default.

Partial damage is represented by specific damaged lanes while the other lanes remain usable.

Damage affects warning/condition; it does not automatically create a hard technical block.

## 15. Infrastructure / Cabling

Infrastructure is distinct from Device.

Examples:

- wall plates;
- cajetines;
- floor pockets;
- patch panels;
- fixed venue runs;
- subsnakes;
- multipairs/multicores;
- fanouts/breakouts;
- extensions.

These transport/present signal paths without being forced into Device semantics.

### 15.1 Infrastructure can expose Ports/Endpoints

Example:

```text
Stage Wallplate / XLR 12
  <-> Fixed Run
FOH Panel / XLR 12
```

The wallplate/panel can expose connectable endpoints without being modeled as Devices.

### 15.2 Fixed vs Temporary connections

Connections may be classified operationally as:

- `Fixed` — installed/permanent infrastructure;
- `Temporary` — show/event connection that is physically made for the event.

Fixed infrastructure participates in signal flow but does not normally require `Connected` to be re-confirmed on every event.

Temporary connections participate in the show-day planned/connected/verified workflow.

### 15.3 Optional Venue Infrastructure Profile

Reusable fixed venue mapping is valuable, but it must not become mandatory for ordinary patches.

A simple show should still be able to represent a concise route without documenting every wall plate or permanent cable run.

## 16. Stage Position

`Stage Position` represents a physical zone such as:

- Drum Riser;
- Stage Left;
- Stage Right;
- FOH;
- Amp World.

It can group Sources and technical resources located there.

Stage Position is **not** itself a routing endpoint and does not own magical port counts.

Its technical capacity is derived from resources located/assigned there, such as:

- subsnakes;
- wall plates;
- stageboxes;
- distribution points.

## 17. Connections

### 17.1 Connection definition

A `Connection` is an explicit point-to-point technical relationship between endpoints.

Examples:

```text
J48 XLR Out -> Rio A / In 12
Rio A Dante Tx 12 -> CL5 Dante Rx 12
Subsnake A / Ch 3 -> House Multicore / Ch 3
```

### 17.2 Branching/splits use multiple Connections

A split is not a special magical Connection type.

A splitter Device exposes its input/output Ports and branching is represented by multiple point-to-point Connections.

Example:

```text
Splitter Input 12
  -> Output A12 -> FOH
  -> Output B12 -> MON
  -> Output C12 -> Broadcast
```

### 17.3 Grouped physical actions

A multipin connection may appear as one physical action in Operation while representing multiple lane-level Connections internally.

This supports festival workflows where pre-patched boxes are changed by moving one multipin rather than pretending every channel is manually repatched.

### 17.4 Connections do not track cable assets

Do not micromanage cable IDs, lengths or Inventory assets inside normal Connections.

Patch documents the technical relationship between endpoints, not which individual XLR cable from a stock room was used.

## 18. Internal Routing

External Connections and routing inside a Device are different concepts.

Example:

```text
Mic -> Rio Analog In 12       [external Connection]
Rio Analog In 12 -> Dante Tx 12 [Internal Routing]
Dante Tx 12 -> CL5 Dante Rx 12  [external Connection]
```

A Device may define Internal Routing that is:

- fixed by profile/device architecture;
- configurable in the Device Instance.

This mechanism also supports:

- stageboxes;
- interfaces;
- splitters;
- protocol bridges/converters;
- more complex AoIP devices.

## 19. Connection operational state

Technical design state and physical show-day readiness are separate.

For Temporary Connections, approved operational progression is:

- `Planned`;
- `Connected`;
- `Verified`.

Example:

```text
Kick -> Subsnake                Verified
Subsnake -> Splitter            Verified
Splitter -> Rio                 Connected
Rio -> console mapping          Planned
```

The overall route status is derived from the relevant underlying segments rather than requiring a second manually-maintained route status.

This state is expected to feed future Operation and Line Check views.

Fixed infrastructure is treated differently and normally does not require per-event `Connected` confirmation.

## 20. Incomplete/TBD vs Conflict

A partially known route is valid during planning.

Example:

```text
Kick -> Subsnake A / Ch 1 -> TBD -> FOH Ch 1
```

`Incomplete / TBD` is **not** an error.

Use `Conflict` for contradictory/impossible technical assignments.

## 21. Validation and routing rules

### 21.1 Physical input exclusivity

For a normal input endpoint:

> one physical/network input endpoint accepts at most one Feed unless the device/endpoint is explicitly modeled with different capability.

Two distinct Feeds assigned to the same ordinary input endpoint -> **hard error**.

### 21.2 Output fan-out

One logical output/path may be patched to multiple physical/network output endpoints.

Valid:

```text
Main L
  -> Local Out 1
  -> Rio Out 5
  -> Dante Tx 17
```

### 21.3 Multiple mixes into the same output endpoint

Two different logical mixes/output paths assigned simultaneously to the same ordinary physical/network output endpoint -> **hard error**.

Example:

```text
Main L -> Rio Out 1
Front Fill -> Rio Out 1
```

is invalid unless a future explicitly-modeled device capability demonstrates otherwise.

### 21.4 Compatibility validation

Patch validates endpoint compatibility using signal/protocol/capabilities/configuration, not merely connector shape.

Approved behavior:

- verified compatible -> allowed;
- verified incompatible -> hard error;
- unknown/unverified profile/capability -> warning, do not falsely block.

### 21.5 Converters/adapters must be explicit

Patch never invents a conversion to make an incompatible route look valid.

Invalid:

```text
AES Out -> Analog In
```

Valid only when the converter is explicitly present:

```text
AES Out -> AES/Analog Converter -> Analog In
```

### 21.6 Configuration changes preserve broken references

If changing Device/Port mode/capability invalidates existing routing:

- keep the existing Connection;
- mark it Conflict/Invalid;
- show what became incompatible;
- never silently delete or rewrite it.

## 22. AoIP and digital transport direction

The core must support multiple transport families without assuming one protocol model.

Potential examples include:

- Dante;
- AES67;
- SoundGrid;
- MADI;
- AES50;
- Optocore;
- AVB/Milan;
- other verified protocols required by real workflows.

Initial model requirements:

- represent physical and virtual transport endpoints;
- represent protocol/capability per Device Instance;
- represent internal routing and point-to-point/subscription intent where appropriate;
- preserve enough structure for future verified adapters/export.

Deferred protocol-specific configuration includes, where relevant:

- subscriptions;
- clock;
- sample rate rules beyond capacity effects;
- primary/secondary networks;
- VLAN;
- multicast/unicast;
- network latency;
- IP addressing;
- protocol-specific export/apply.

These are future subdomains, not MVP requirements unless a real validation fixture proves they are necessary earlier.

## 23. Future Console Sync / Control Bridge

Very future direction: Patch may write verified routing/configuration data to consoles, offline editors or network-control tools through vendor/platform adapters.

Conceptual architecture:

```text
Patch desired technical state
  -> verified platform adapter
       -> OSC / RCP / MIDI / API / proprietary verified protocol
            -> console / editor / network tool
```

The Patch core must remain protocol/vendor-independent.

Potential future write targets include only verified supported facts such as:

- channel names;
- input/output routing;
- source/channel assignments;
- stereo/link configuration;
- colors/metadata;
- network routing/subscriptions where safely supported.

This is **not** authorization to become a mixing engine. EQ, dynamics, faders, mix levels and gain-staging control remain outside the Patch product direction unless explicitly reconsidered much later.

Future writes should be previewable/diffable and never silently applied.

## 24. UX contract established so far

### 24.1 Progressive disclosure

Simple shows must remain simple.

The UI should not force every Source to expose every internal concept when unnecessary. Advanced concepts such as multiple Feeds, Infrastructure, compound Ports and transport details appear when used.

### 24.2 Flexible completion order

The user may know capture before console assignment or console assignment before capture.

Both are valid:

```text
Bass -> J48 -> channel TBD
Bass -> FOH Ch 15 -> capture TBD
```

Do not force artificial completion order.

### 24.3 Documentation reorder is not routing

Reordering rows for readability must never silently change:

- physical/network input assignment;
- Console Channel assignment;
- routing;
- Source identity.

### 24.4 Desktop / iPad / iPhone are deliberate surfaces

Desktop supports dense editing and system configuration.

iPad/iPhone should get purposeful show-day/operation interactions rather than a squeezed desktop table.

Exact responsive contracts remain open.

### 24.5 Pre-production vs Operation

Both are deliberate views over the same Event Patch working state, with different information priority. They are not duplicated datasets.

## 25. MVP / near-term / later scope

### 25.1 Model/MVP discovery now

Design now must cover enough structure for:

- Project/Patch identity;
- standalone + derived lineage;
- Master/Event semantics;
- Sources and conceptual grouping;
- Feed semantics;
- one or more Consoles;
- Logical Console Channels;
- console input routing;
- Output Paths;
- Device Instances/Profiles;
- Ports/Endpoints;
- configurable device modes/capacity;
- Infrastructure;
- Connections;
- Internal Routing;
- compound Ports/lanes;
- Fixed vs Temporary paths;
- Capacity/Availability/Assignment/Condition;
- operational Planned/Connected/Verified state;
- incomplete/TBD vs conflicts;
- history + snapshots;
- event linkage boundary;
- stable IDs/order semantics;
- validation rules;
- desktop/iPad/iPhone UX contract.

### 25.2 Near-term product surfaces after model approval

Likely include:

- fast table editor;
- bulk patching/quick fill;
- console-specific Inputs views;
- Output views;
- Stage I/O views;
- printable Patch Sheet;
- device/profile helpers;
- diff/version compare;
- house-vs-artist comparison foundation;
- show-day Operation state;
- files/references where needed.

### 25.3 Later

- Visual Patch;
- richer line check workflow / offline PWA;
- collaboration/read-only sharing/history UI;
- RF/show-tech domains;
- gear/cable quantity derivation where useful without cable asset micromanagement;
- festival/changeover tooling;
- deeper equipment profiles;
- networking and power domains;
- manuals/intelligent assistance;
- verified console/network export/apply adapters.

### 25.4 Explicitly not now

- D1 tables/migrations;
- API routes;
- runtime UI;
- new Cloudflare resources;
- production state;
- Visual Patch implementation;
- console show-file reverse engineering;
- live console mixing/control;
- Inventory ownership;
- AI/manual ingestion implementation;
- protocol-specific network controller replacement.

## 26. Patchy benchmark principles retained

Patchy is a workflow/product benchmark, not a schema or UI template.

Useful high-level benchmark ideas include:

- build rig/system;
- patch signals;
- preserve event/version state;
- share/print useful technical documents;
- progressive complexity;
- routing matrix/Easy Patch style workflows;
- live technical document mentality.

SD.Live should improve on the conceptual separation between:

- Source;
- Feed;
- Device/Port;
- Connection;
- Console Channel;
- Output Path;
- Patch data vs Patch Sheet view.

Do not copy proprietary code, branding, text or pixel-level UI.

## 27. Validation fixtures before schema approval

Before schema design, validate this contract against 1–2 real Patch/rider examples representative of actual SD.Live work.

The fixtures should intentionally try to break the model, including examples such as:

- multiple consoles;
- stagebox + local I/O;
- splitters;
- DI thru paths;
- mono/stereo/linked console representations;
- multiple feeds from one operational source;
- independent grouped sources;
- festival multipins/prepatch/changeover;
- output fan-out;
- asymmetric device I/O;
- transport/network endpoints;
- TBD planning state;
- damaged/reserved/unavailable ports;
- venue fixed infrastructure where useful.

The goal is not to fit the fixture by adding one-off fields. The goal is to verify that the general model explains the real workflow cleanly.

## 28. Open questions — discovery continues here

The following remain unresolved or intentionally provisional:

1. final terminology and exact lifecycle for `Feed`;
2. whether Source Group needs hierarchy in MVP or only future compatibility;
3. exact capture representation for microphones vs DIs vs other front-end devices;
4. 48V documentation semantics and where it belongs;
5. whether/how headamp ownership must be represented apart from Gain Compensation state;
6. exact stable-ID and ordering contract;
7. exact Event link/pinning behavior;
8. detailed console internal-path capability vocabulary;
9. Groups/DCAs and other non-output console organizational constructs;
10. exact files/notes/contacts/folders scope in MVP;
11. collaboration/sharing/security contract;
12. responsive desktop/iPad/iPhone layouts;
13. snapshot/history retention and diff UX details;
14. exact house-vs-artist comparison semantics;
15. migration/version policy after a schema eventually exists.

No schema should be inferred from the conceptual names in this document.

## 29. Decision log — 2026-09-28 discovery session

The following decisions are explicitly preserved so they are not lost if terminology evolves:

1. Patch can be standalone or derived; Master is a role/lineage concept, not a fundamentally different object type.
2. Patches can be compared even without lineage.
3. A Source keeps identity when physical input, console channel, mic or DI assignment changes.
4. Sources are atomic operational identities; stereo/linked console behavior is separate.
5. Optional Source Groups relate atomic Sources without forcing console behavior.
6. One Source may have multiple Feeds when operationally useful; one Feed can branch to multiple destinations without becoming multiple Feeds.
7. Snare Top/Bottom are normally two Sources; guitar multi-mic can intentionally be represented either as one Source/multiple Feeds or grouped Sources.
8. Capture and console assignment may be completed in either order; incomplete is valid.
9. Each console gets its own Inputs table/view while underlying Source/Feed identity remains shared.
10. Physical/network input endpoint, console routing and logical Console Channel are separate concepts.
11. Same input/feed may map to multiple logical channels when console capability permits.
12. Gain/trim/EQ/dynamics/fader/mix-level documentation/control is out of scope; Gain Compensation active/inactive is a desired routing fact.
13. Future verified console/editor write-back is desirable, but the core is protocol-independent and not a mixing engine.
14. Devices and Infrastructure are separate families.
15. Wall plates/cajetines/patch panels/subsnakes/multipairs/fanouts/fixed runs are Infrastructure.
16. A splitter is always a Device.
17. Stage Position is physical grouping; technical capacity comes from resources located there.
18. Reusable Venue Infrastructure is optional, never required for every Patch.
19. Festival multipin workflows must be representable as grouped physical actions over lane-level routing.
20. Master, Pre-production and Operation are distinct concepts; Pre-production/Operation are views over the same Event working state.
21. Event changes never silently mutate Master; future apply-back must be deliberate.
22. Automatic History and manual named Snapshots are both required concepts.
23. Output purpose is independent from physical socket and console-specific Bus/Matrix/Main/Aux taxonomy.
24. Console internal path families/capabilities are profile/instance-defined and customizable.
25. Blank/custom consoles are valid; profiles are optional accelerators.
26. Existing instances do not auto-update when a profile changes; preserve vs review/update is user-controlled.
27. Devices expose configurable asymmetric Ports; no symmetric input/output assumption.
28. Virtual/network transport endpoints are first-class Ports/endpoints.
29. AoIP capacity/configuration is device-specific; do not assume one Dante model/count.
30. Device capability may depend on sample rate, cards, mode, licenses, firmware or redundancy configuration.
31. Normal physical input conflict: two Feeds into one ordinary input endpoint is a hard error.
32. Output fan-out from one logical output to multiple output endpoints is allowed.
33. Two different logical mixes into one ordinary output endpoint is a hard error.
34. Capacity, Availability and Assignment are distinct.
35. Availability states: Available / Reserved / Unavailable.
36. Reserved+Assigned is an important warning; Unavailable+Assigned is a critical warning, both allowed.
37. Connection = point-to-point technical relationship.
38. Splits/fan-outs are represented through explicit device/infrastructure structure plus multiple Connections.
39. Routes may remain Incomplete/TBD during planning; this is not Conflict.
40. Temporary Connection operational states: Planned / Connected / Verified; route state is derived.
41. Devices can expose Internal Routing separate from external Connections.
42. Infrastructure can expose endpoints and fixed internal runs without becoming Devices.
43. Connections distinguish Fixed vs Temporary where operationally useful.
44. Individual cable asset IDs/lengths are intentionally not part of normal Connection tracking.
45. Verified incompatible endpoints create hard errors; unknown/unverified compatibility creates warnings.
46. Conversion must be represented by an explicit converter Device; Patch never invents it.
47. Connector shape, signal/protocol and direction are separate Port properties.
48. One physical Port may support multiple modes; active mode belongs to the configured instance.
49. Mode/config changes preserve now-invalid Connections and mark them Conflict instead of silently deleting them.
50. Compound Ports contain independent lanes; lane mappings may skip channels and need not be 1:1.
51. Parent compound connector physical state is separate from lane Used/Unused/TBD/Conflict state.
52. Condition is separate from Availability/Assignment/Operational state.
53. Condition states are intentionally only OK / Damaged; no `Unknown / Not tested` condition state.
54. Damaged is a strong warning, not a hard block; damaged ports/lanes may still be used.
55. A fully damaged compound Port can propagate damage warning to lanes; partial damage can live on individual lanes.
56. Device-wide failure is not a special replacement workflow by default; if replacement is technically equivalent the Patch may remain unchanged.

## 30. Exact continuation

Continue discovery with **Sources -> Feeds -> Console Channels** and reconcile the remaining provisional terminology/lifecycle into a coherent user workflow.

Then continue through remaining Output/console internal routing, stable IDs/order, files/event links and UX contracts.

After the model is sufficiently stable, validate it against 1–2 real Patch/rider fixtures. Only after those fixtures fail to expose a structural gap should Product Spec -> Technical Roadmap -> Schema begin.

**Do not create D1 tables, migrations, runtime routes, Visual Patch or production resources from this document alone.**

## 31. Continuation decisions — Sources, Feeds, Console Inputs and Festival Mode

This section records later decisions from the same discovery session and supersedes earlier provisional/open wording where they conflict. It still does **not** authorize schema/runtime implementation.

### 31.1 Feed lifecycle and identity

Every Source has at least one conceptual Feed. In the simple one-feed case, that Feed should normally remain implicit/collapsed in the UX rather than appearing as a meaningless `Feed Main` row.

Feed identity represents the operational capture/branch, not the exact microphone, DI or hardware model. Replacing capture hardware does not by itself create a new Feed.

Examples:

```text
Bass
  -> DI Feed
     J48 -> JDI
```

The Feed remains the same while the capture device changes.

Feeds are atomic/mono signal paths. Stereo/linking/multichannel behavior is represented later through grouping or console representation rather than by turning one Feed into a stereo container.

A Feed may have an optional qualifier/label when useful, such as `DI` or `Amp Mic`. The Source owns the canonical signal name; views may compose `Bass · DI` without storing a duplicate full signal name in the Feed. A sole implicit Feed needs no visible label.

### 31.2 Capture representation

Mic/DI/capture representation is intentionally flexible.

A simple capture may remain lightweight and carry technical facts such as:

- model/type;
- 48V where relevant;
- optional technical note.

Do not force ordinary capture entries to become full Devices or to carry logistics such as stands, clips or individual cable assets.

However, any capture element may be explicitly modeled as a Device when its Ports, routing, modes, branching or other technical behavior matters. This is not determined rigidly by product category: a mic may be lightweight or Device-like; a DI will often be Device-like but is not forced by a hard taxonomy rule.

A capture/device may expose multiple operational outputs or modes. Those may create multiple Feeds from the same Source without creating extra Sources automatically.

Example:

```text
Lead Vocal [Source]
  -> Performance Feed
  -> Production Talk Feed
```

This covers microphones/transmitters with alternate/talk routing or similar behavior.

### 31.3 Console input slots and channel format

A Logical Console Channel may expose one or more profile/instance-defined input slots, for example:

- Main / Alt;
- A / B;
- other platform-specific variants.

Patch should preserve assignments for all supported slots and, where the console exposes the concept, which slot/input is currently selected/active. Slot naming and behavior are console-specific rather than universal.

A Console Channel may support mono, stereo or other verified input formats. A stereo channel input slot can expose independent legs such as L/R, each receiving an atomic Feed.

Example:

```text
Ch 25 — STEREO
Main
  L -> Playback L Feed
  R -> Playback R Feed
Alt
  L -> Backup Playback L Feed
  R -> Backup Playback R Feed
```

Each input leg may receive at most one simultaneously active Feed. A Feed may still feed multiple channels/legs when the console/routing architecture permits it.

### 31.4 Canonical signal naming

The Source owns the canonical signal name. Do not create an independent editable Console Channel name that can silently diverge from the Source.

Renaming the Source updates the displayed signal name everywhere that references it: FOH, MON, Stage I/O, Patch Sheet and other projections.

Feed qualifiers remain available to distinguish multiple operational branches, e.g. `Bass · DI` and `Bass · Amp Mic`.

Future console adapters may translate/truncate the canonical name to platform limits, but that adapter-specific representation must not become a second canonical name in the Patch core.

### 31.5 Cross-Patch/Rider correspondence

Sources belonging to different Patches/Riders may be related as corresponding/equivalent without merging identities or modifying either Patch.

Example:

```text
House: Kick
  <-> Artist A: BD
  <-> Artist B: Kick In
```

Source correspondence and Feed correspondence are independent. Corresponding Sources do not imply one-to-one Feed correspondence.

Example:

```text
HOUSE Bass
  DI       <-> ARTIST Bass / DI
  Amp Mic  <-> [missing]
```

Correspondence states distinguish at least conceptual `Suggested` from `Confirmed`. Only confirmed correspondence counts as a real relation. Suggestions may be accepted or rejected without modifying Source identity.

Confirmed historical correspondences may improve future suggestions, but they must never auto-confirm a new relationship in a different Patch/Rider.

### 31.6 Single Show Mode vs Festival Mode

SD.Live Patch should support two product modes over the same technical core:

- `Single Show Mode` — ordinary one-show Patch workflow;
- `Festival Mode` — House-centered multi-rider correlation/changeover workflow.

These modes must not create separate incompatible data models.

Festival Mode is always anchored to a `House Patch`. Artist Patches/Riders remain independent Patches and correlate against that House Patch rather than being merged into it.

Several Sources from mutually exclusive Artist Patches may be assigned as alternatives to the same House Console Channel.

Valid:

```text
House Ch 1
  Artist A Patch -> Kick
  Artist B Patch -> BD
  Artist C Patch -> Kick In
```

This is not a conflict because only one Artist Patch is active at a time.

Within one simultaneously-active Patch, two different Feeds trying to occupy the same ordinary Console Channel input leg remain a conflict unless a later explicit alternation mechanism is defined.

Each Artist alternative may preserve its own complete physical routing before reaching the shared House Console Channel/handoff. Festival comparison/changeover should therefore be able to reveal not only Source-name differences but physical repatch differences.

Festival UX may project current/next/changeover views from this same data rather than storing separate duplicated routing state.

### 31.7 Guest consoles in Festival Mode

Artist Patches may include their own Console Instances. Bringing a guest console does not remove the Artist Patch from Festival Mode.

Console use is assigned by technical function/destination rather than a single boolean such as `brings own console`.

Examples:

```text
Artist A
  FOH -> Guest Console
  MON -> House Console
```

or:

```text
Artist B
  FOH -> House Console
  MON -> Guest Console
```

or guest consoles for multiple roles where required.

The House Patch defines the interconnection/handoff points and capabilities offered to guest consoles, such as splitter outputs, Dante/MADI/network endpoints or system return inputs.

Each Artist Patch maps its guest console against those House-provided handoffs.

Example:

```text
HOUSE
  Guest input handoff: Splitter B 1-48
  Guest PA return: Main L / Main R / Subs

ARTIST B
  Splitter B 1-48 -> Guest Console Inputs
  Guest Main L -> House Guest Return L
  Guest Main R -> House Guest Return R
  Guest Subs   -> House Guest Return Subs
```

The House Patch therefore owns what connection opportunities exist; the Artist Patch owns how that artist's equipment uses them.

### 31.8 Additional decision log entries

57. Every Source has at least one conceptual Feed; the single Feed is normally implicit in simple UX.
58. Feed identity is the operational capture/branch; changing capture hardware does not automatically create a new Feed.
59. Feeds are atomic/mono; stereo/multichannel behavior belongs to later grouping/console representation.
60. Capture elements may remain lightweight or be explicitly modeled as Devices when their technical behavior matters; product category alone does not force the choice.
61. Lightweight capture can carry model/type, 48V where relevant and an optional technical note; logistics/accessory tracking is not core Patch capture state.
62. Multi-output/multi-mode capture may produce multiple Feeds from one Source, including alternate/talk paths, without automatically creating additional Sources.
63. Console Channels may expose multiple profile-defined input slots such as Main/Alt or A/B; Patch may record both assignments and which is active when supported.
64. Console input slots may be mono/stereo/etc. according to verified console capability; stereo slots expose independent atomic input legs.
65. Each Console Channel input leg accepts at most one simultaneously-active Feed; one Feed may feed multiple channels/legs where supported.
66. Source owns the canonical signal name; Console Channel does not own an independent divergent signal name; Source rename propagates through projections.
67. Feed may have a short qualifier/label; views may compose Source + Feed qualifier without duplicating the Source name.
68. Sources in different Patches/Riders may have confirmed correspondence without merging identity.
69. Feed correspondence is independent from Source correspondence.
70. Suggested correspondence is not Confirmed correspondence; only confirmed relations count as real mappings.
71. Confirmed prior relationships may inform future suggestions but never auto-confirm new rider mappings.
72. Single Show Mode and Festival Mode use the same technical core; Festival Mode adds House-centered correlation/changeover semantics.
73. Festival Mode is always anchored to a House Patch; Artist Patches remain independent.
74. Mutually exclusive Artist-Patch Sources may be alternative assignments to one House Console Channel; simultaneous same-Patch conflicts remain conflicts.
75. Each Artist alternative can preserve distinct physical routing to the common House assignment/handoff.
76. Artist guest-console use is defined by function/destination (FOH, MON, Broadcast, etc.), not by one `brings own console` flag.
77. The House Patch defines available guest-console handoff points/capabilities; each Artist Patch maps its console(s) to those House-provided handoffs.

## 32. Current continuation

Continue discovery from the now-more-specific **Sources -> Feeds -> Console Channels / Festival Mode** contract. The next decisions should further close console input/routing semantics and only then move to remaining Output/console-internal routing, stable IDs/order, event links/files and UX contracts.

Earlier open-question wording for Feed lifecycle, basic capture representation and house-vs-artist comparison is partially superseded by section 31; remaining unresolved details should be narrowed rather than reopened wholesale.

After the model is sufficiently stable, validate it against 1–2 real Patch/rider fixtures. Only after those fixtures fail to expose a structural gap should Product Spec -> Technical Roadmap -> Schema begin.

**Do not create D1 tables, migrations, runtime routes, Visual Patch or production resources from this document alone.**

## 33. Node/System/Venue View contract — later discovery

This section records later approved discovery decisions and supersedes older wording that treated Visual Patch only as a distant/freeform visualization concept. Node/System/Venue views remain projections of the same structured Patch model; they are not independent routing databases and do not authorize implementation yet.

### 33.1 Visual model roles

The visual model uses a small set of conceptual roles:

- Node — an entity with identity worth moving, collapsing, selecting and inspecting;
- Port — an addressable input/output/resource that belongs to a Node;
- Relationship / Edge — a connection or relation between endpoints, not a separate box;
- Context / Container — organizational or physical context;
- Overlay — Warning, Conflict, Needs Review, Line Check and similar state.

Natural Nodes include Source, Device, Console Instance, stagebox/I/O rack, interface, splitter, relevant insert/processor device, Handoff, Output Path and structured Infrastructure where useful.

A Feed is not a Node by default. In visual views it normally appears as a Source output port/handle, especially when one Source exposes multiple Feeds.

Complex Nodes expand hierarchically by sections rather than exposing everything at once. A console may independently expand sections such as Local I/O, Network I/O, Input Channels, Internal Resources and Outputs.

Visual detail should support at least Overview, Device level and Port level / focused Route Trace.

### 33.2 Port-to-Port interaction

Dragging Port -> Port is an editing affordance over structured routing.

- If the intended connection is unambiguous and valid, SD.Live may apply it directly.
- If mapping, routing, slot choice, protocol mode or another meaningful decision is required, SD.Live must show a selector/preview.
- SD.Live must never invent a mapping merely because two objects were dropped near one another.

Deleting an Edge deletes only that Connection/relationship. It never deletes the connected Nodes or Ports.

### 33.3 Fan-out vs saved alternatives

Source fan-out is an explicit property and is OFF by default.

With Source fan-out OFF, dragging an already-routed Source/Feed to another destination means Repatch rather than silently creating a simultaneous branch.

With Source fan-out ON, the user may create an additional simultaneous branch when the actual downstream Port/resource capability allows it.

Hardware/resource fan-out belongs to the exact Port/resource where the branch occurs and is constrained by verified Profile + Instance capabilities. Unknown capability must not silently permit a second branch.

If Source fan-out is disabled while several simultaneous branches exist, SD.Live does not delete the extra routes. The user chooses which branch remains active; the others become Saved Alternatives. Saved Alternatives are inactive and therefore do not conflict. Re-enabling fan-out may offer to restore them.

This preserves the distinction: fan-out = several simultaneous active branches; alternative = several saved routing possibilities, normally one active.

### 33.4 Venue View vs System View

Venue View represents physical/spatial placement. Moving a Source between zones may update Stage Position; moving hardware may update Rack Location; existing Connections are preserved; warnings are recalculated; moving an object never silently repatches it.

System View represents signal flow / bird's-eye system topology. Node position is presentation-only. Moving Nodes has no technical routing/location meaning. Auto Arrange, Align, Distribute, Fit and similar operations are presentation-only.

Route Trace may be presented as a focused/deep System View.

### 33.5 Venue background and Zones

Venue View may optionally use a venue plan/background imported from a CAD-compatible source, PDF or image.

For the first version, the imported background is a reference visual only. SD.Live does not automatically infer walls, CAD layers or Zones from it.

Background controls may include move/scale/rotate/crop where useful, opacity, visibility, lock and replace.

Venue Zone is a structured spatial element laid over that reference.

Zones are user/show/venue configurable and must not be hardcoded to a fixed list. Venue defaults, show overrides and user presets may be supported later.

Zone identity is independent of Zone name. Renaming preserves assignments. Deleting a Zone never silently reassigns its contents.

Optional sub-zones may be enabled when needed. Hierarchy is optional; enabling hierarchy does not automatically migrate existing elements; an element may intentionally belong to a parent Zone or a deeper sub-zone; the exact drop target determines the assigned Zone/sub-zone; collapsing a Zone does not lose the deeper assignment.

Moving Zone geometry preserves membership. Moving an element between Zones changes its Stage Position or Rack Location according to element type.

When overlapping Zones could validly receive a drop, SD.Live must ask rather than guess.

Zones/sub-zones support individual Lock plus Lock All Zones / Unlock All Zones.

A locked Zone cannot be accidentally selected/moved/resized by ordinary marquee operations, remains a valid drop target, and does not make the Sources/Devices inside it unselectable.

Background lock remains independent from Zone locks.

### 33.6 Selection and snapping

Venue View should use SketchUp-like directional marquee behavior:

- left -> right: select elements fully contained;
- right -> left: select elements touched/intersected.

Unlocked Zones/sub-zones participate in selection. Locked Zones do not.

If a selected Zone and one of its contained objects are both part of a transform, SD.Live must deduplicate movement so the child is not moved twice.

Snapping may be enabled/disabled and may include Zone edges, other objects and grid. Snapping is visual only and may be bypassed temporarily. Real-world scale is not mandatory for MVP; a future Set Scale remains possible.

### 33.7 Venue Groups

Venue Group is a spatial/visual grouping concept and is explicitly different from Source Group, DCA/VCA/Control Group, Stage Position and routing itself.

A Venue Group may mix Sources and Devices.

Group movement preserves relative visual positions. When a mixed group is moved between Zones, each member recalculates location using its own anchor/type: Source -> Stage Position; Device -> Rack Location.

Members are not forced into one common Zone if their resulting anchors fall into different Zones.

MVP Venue Groups are not nested.

Expected interaction: single click selects the group as a unit; double click / Enter enters group editing; Esc exits; marquee outside a group selects the group as a unit; marquee while editing selects members.

Group operations include Group, Ungroup, Add to Group and Remove from Group. Ungroup never deletes or technically changes members.

### 33.8 Stable Member Order

A Venue Group owns a stable Member Order used by sequential patching operations.

Initial order depends on creation context: if members were created from the visual viewer, initial order follows creation order; if the Group is created from a list selection, initial order follows that list order.

After Group creation, Member Order becomes an independent stable property that the user can edit manually. Moving items on the canvas or sorting another table/view does not silently change Member Order.

### 33.9 Patch 1:1 and Repatch 1:1

Venue Groups may be used as ordered source blocks for sequential mapping against compatible destination ranges such as snake/multipin lanes, stagebox inputs, Console Channels and other compatible ordered endpoint ranges.

Patch 1:1 creates/proposes assignments for the ordered members, respects existing assignments, Reserved/Unavailable/Damaged state, compatibility and explicit skipped channels, and never silently replaces conflicting assignments.

Repatch 1:1 takes the currently-routed members and proposes moving those assignments to a new compatible range while preserving Source, Feed and other logical identity.

Both operations always show a preview before applying. The preview should classify at least NEW, REPATCH, UNCHANGED and Warning / Needs Review where applicable.

If only some members can be mapped cleanly, SD.Live may allow the safe subset to proceed while keeping problematic mappings in review rather than requiring all-or-nothing behavior.

Explicit skipped channels and non-contiguous mapping remain supported.

For a mixed Venue Group, Source-to-I/O Patch 1:1 uses only applicable Sources/Feeds; Device members are ignored for that mapping operation.

### 33.10 Duplicate vs routing alternative

When a duplication operation could affect technical routing, SD.Live must ask the user's intent instead of guessing.

Duplicate creates new independent identities for duplicated Sources/Devices/etc. Copied objects do not remain synchronized with originals. Duplicate Source semantics continue to follow the existing rule that duplicate = new independent Source identity.

Create Routing Alternative preserves the same Source/Feed/Device identities and creates a saved alternative routing possibility rather than duplicating the signals themselves.

For multi-object duplication, internal relationships between objects that are actually duplicated may be preserved where valid. Relationships to external objects are not silently copied.

The routing-alternative behavior is further constrained by Festival Mode in section 35.

## 34. Persistence, save reliability and portable SD.Live files

Patchy-style failure where a large project appears editable but stops persisting changes is an explicit anti-pattern.

### 34.1 Explicit Save + autosave

SD.Live Patch requires both explicit Save and autosave.

The user must be able to see states such as Saved, Saving..., Unsaved changes, Save failed and Offline. Cloud-sync state may be shown separately.

Saved may only be shown after the relevant persistence layer confirms the write. A frontend request merely being sent is not enough.

On save failure, dirty state remains; edits are not discarded; Retry remains available.

Saving is allowed even when the Patch is incomplete, has warnings or has conflicts. Save is persistence, not validation.

All Patch views share one underlying saved state rather than saving independent copies per view.

### 34.2 Local recovery and stale-version protection

SD.Live must keep local recovery state so closing the browser/app or losing network cannot silently discard unconfirmed work.

If a cloud/server version has changed since the user's base revision, SD.Live must not overwrite the newer revision blindly. Local changes are preserved and a review/merge path is required.

### 34.3 Local-first architecture principle

Interactive work must not depend on Cloudflare availability or Free-tier quota.

Conceptually: local working database/copy; local change queue; background/batched cloud sync through an abstract sync/storage adapter; History/Snapshots; portable backup/project file.

When cloud is unavailable or quota-limited, the product should allow continued work and expose state such as Saved locally, cloud sync pending count, last successful sync, Retry Sync and Export Backup.

Cloudflare may remain the v1 cloud provider, but domain/UI architecture must not make Cloudflare the only possible future storage backend.

### 34.4 Performance principles

The live Patch should not be stored/updated as one giant monolithic JSON blob.

The eventual implementation should be normalized/chunked/delta-oriented and support lazy loading / virtualization for large Node/System/Venue views; not rendering every Port/route/Artist simultaneously; batched/debounced writes rather than one backend write per keystroke/mouse movement; History built from change sets plus periodic snapshots/compaction rather than a full project copy for every small edit; and chunked/streamed large import/export where practical.

These are architectural constraints for later planning, not schema authorization.

### 34.5 Portable project file: .sdlive

The canonical portable project extension is .sdlive.

A .sdlive file is an SD.Live Project File, not merely a cloud export.

It must support this workflow: export project to USB/local storage; open it on another computer with no cloud dependency; edit offline; bring the file back; safely reconcile it with the original project.

The file must contain enough structured Patch/project state to restore and edit the project offline, including identity/version/base-revision and the technical model/layout needed by the project.

Optional embedded artifacts may later include supported console show files, PDFs, profile copies or other project attachments.

If the original project has not changed since the .sdlive base revision, returned changes may be applied safely.

If both the original and portable copy changed, SD.Live must use a three-way review/merge concept: base, current original and portable edited copy. It must never silently replace the whole project and lose parallel work.

The format should carry a format version and app/version compatibility information. Newer unsupported formats must not be destructively rewritten by an older app.

The .sdlive concept may later grow beyond Patch as other SD.Live modules are added.

## 35. Festival Mode — Routing Alternatives, Routing Sets and priority

Routing alternatives are useful for pre-production, changeovers and festival infrastructure planning. To keep ordinary Single Show workflow simple, the advanced grouped-alternative system defined here is Festival Mode only.

It remains planning/documentation behavior and is never show-control behavior.

### 35.1 Festival-only, offline/planning-only boundary

Routing Sets exist only in Festival Mode.

They may be designed, compared, named, activated as the currently-planned alternative inside the document, stored in .sdlive and used for pre-production/changeover analysis.

They must never directly control a connected console, trigger hardware repatching, follow live console routing state, become an automatic Apply/Sync target, or silently write +48V or any other console state.

Even if SD.Live is connected to a console for other verified adapter features, Routing Sets remain a planning layer outside that live-control contract.

### 35.2 Routing Alternatives and Routing Sets

A Routing Alternative preserves the same Source/Feed/Device identities while representing another possible route.

Multiple alternatives may be grouped into a named Routing Set, such as House Normal, Backup Stagebox, Guest Snake or Artist Priority Routing.

Routing Sets may cover one Venue Group, several Groups, multiple unrelated parts of the Patch or only a partial subset of the festival system.

The feature is optional/toggleable within Festival Mode so a simple festival plan does not need to expose it.

Where a set represents mutually-exclusive alternatives, only one set in that context is considered the selected/current planning alternative at a time.

Within a set, participation may be partial; not every Source/Group must be controlled by that set.

Creating/activating a Routing Set updates only the document's planned/effective routing context. It never touches real hardware.

### 35.3 House Routing Sets and Artist Routing Sets

Festival Mode supports both House Routing Sets and Artist Routing Sets.

House defines the festival baseline/infrastructure plan.

An Artist Patch may inherit House routing, define explicit routing overrides, have an Artist-specific Routing Set, and combine inherited House routing with only the Artist-specific portions that differ.

This allows both ordinary support acts that adapt to House and major artists whose technical plan has primacy over parts of House infrastructure.

The effective routing for an Artist is conceptually House baseline + explicit Artist overrides = Effective Artist Routing.

Artist override does not erase unrelated House routing. Only the routes/resources explicitly defined by the Artist change the effective result.

### 35.4 Routing priority visibility is optional

Festival Mode keeps the House/Artist/effective relationship in the model, but the detailed provenance is not forced into every view.

A visual toggle such as Show Routing Priority / Overrides may switch between a clean view showing only Effective Routing and a detailed view showing House route, Artist Override, Effective route and provenance badges such as Inherited from House / Artist Override / Needs Review.

### 35.5 Artist Routing Priority

Each Artist may have an explicit Artist Routing Priority toggle.

When OFF, House allocation/baseline is primary and Artist requirements outside House allocation create Warning / Needs Review.

When ON, explicit Artist-defined routing has planning priority over House where the Artist has actually defined an override; House must be reviewed/adapted around those explicit requirements.

Priority is never inferred automatically from artist size, rider complexity or name.

Artist Routing Priority does not mean the Artist can override every House resource. House Locked remains authoritative.

## 36. Festival Mode — House Locked resources

House Locked protects House-owned infrastructure/resources from Artist overrides.

It is intentionally different from Reserved. Reserved means allocated/held for a purpose and may still be deliberately reassigned after review. House Locked means an Artist Patch may not overwrite this House-controlled resource.

Examples may include PA handoffs, continuity, broadcast paths, protected Dante channels or other fixed House infrastructure.

### 36.1 Scope and authority

House Locked is granular. It may apply to one resource/Port, a range, an I/O Bank or another containing technical scope where appropriate.

Only House context can create, remove or change a House Lock.

From an Artist Patch, House Lock is visible and participates in validation but is read-only.

Artist Routing Priority never bypasses House Locked.

### 36.2 Inheritance and exceptions

House Lock may inherit downward from a containing/range rule.

House may create explicit unlock exceptions for individual Ports or ranges.

The effective rule follows most-specific wins.

Example: Dante Tx 1-32 House Locked; Exception 17-24 unlocked; Tx 20 direct House Lock. Effective result: Tx 20 is locked because the direct rule is more specific.

Whenever a more-specific rule overrides an inherited lock/exception, SD.Live must show a Warning explaining the overlap and effective result. This is not a Conflict because the result is deterministic, but it must not remain hidden.

The inspector should make the origin of the effective state understandable, for example Direct / Inherited from range / Exception.

### 36.3 Existing Artist Patches are never rewritten by later House Lock changes

If House later locks or unlocks resources already referenced by Artist Patches, Artist routing is preserved; no Artist route is deleted or silently moved; Warning / Needs Review is recalculated; House/Festival overview should identify affected Artists/routes.

This rule applies to House Lock changes and exception changes.

## 37. Festival Mode — derived Changeover

Changeover is a central Festival Mode workflow.

A Changeover is generated by comparing the Effective Routing of two Artist contexts: Artist A -> Artist B.

It is a derived view, not a third editable Patch.

If Artist A or Artist B changes, the Changeover recalculates automatically.

### 37.1 Changeover classifications

Operationally useful classifications include at least UNCHANGED, REPATCH, NEW, REMOVE / FREE, HOUSE, HOUSE LOCKED and WARNING / NEEDS REVIEW.

Confirmed Source/Feed correspondence across Artist Riders should be used so the system can distinguish a real repatch from an unrelated new input where possible.

Changeover comparison must incorporate House inheritance, Artist overrides, Artist Routing Priority, Routing Sets, House Locked resources and confirmed cross-Patch Source/Feed correspondence.

The operator should see the actual required operational difference, not have to manually reason through all provenance layers.

### 37.2 Changeover checklist layer

Although Changeover routing is derived, the view may own an operational checklist layer.

Generated actions may expose states such as Pending, In Progress, Done and Needs Review.

This checklist state does not change the underlying routing.

If the Changeover recalculates, an action that is still exactly the same preserves its operational status, including Done; an action whose underlying technical requirement changed returns to Pending/review; obsolete derived actions disappear or are marked obsolete according to later UX design.

This avoids erasing progress because of an unrelated rider correction while also preventing stale completed checks from remaining valid after their actual task changed.

### 37.3 Manual Changeover tasks

Users may add manual tasks that SD.Live cannot infer from routing, for example move Guest Snake to Stage Left, confirm phantom requirement with Artist engineer, connect guest-console returns or label a multipin.

Manual tasks belong specifically to the technical Changeover workflow, not to a general production/project-management task system.

## 38. Later decision log — visual workflow, persistence and Festival Mode

78. Visual system modeling uses Node / Port / Relationship / Context / Overlay roles rather than making every concept a Node.
79. Feed is normally a Source port/handle in visual views, not a separate Node.
80. Complex Nodes expand by independently collapsible sections.
81. Port-to-Port drag applies directly only when unambiguous; otherwise SD.Live asks for mapping/selection.
82. Source fan-out is explicit and OFF by default; OFF implies Repatch rather than silent branching.
83. Hardware/resource fan-out belongs to actual Port/resource capability, not to an unlimited Node-level switch.
84. Disabling fan-out preserves extra branches as inactive Saved Alternatives instead of deleting them.
85. Venue View has physical-location meaning; System View layout is presentation-only.
86. Venue backgrounds may use CAD/PDF/image references but are not auto-parsed into structured Zones in v1.
87. Venue Zones/sub-zones are user-configurable structured spatial elements; Zone identity survives rename.
88. Zone geometry movement preserves membership; moving an element between Zones changes Stage Position/Rack Location.
89. Zones and background have independent lock behavior.
90. Venue marquee selection follows left-to-right contained / right-to-left intersected behavior.
91. Venue Groups are spatial/visual groups, distinct from Source Groups and console control groups.
92. Venue Groups may mix Sources and Devices; each member recalculates its own physical location when moved.
93. MVP Venue Groups are not nested.
94. Venue Group Member Order is stable and independent from canvas position/table sorting.
95. Visual-created groups initially use creation order; list-created groups initially use list order.
96. Venue Groups support Patch 1:1 and Repatch 1:1 with mandatory preview and explicit skipped/non-contiguous mapping support.
97. Duplicate vs Create Routing Alternative is an explicit user choice whenever duplication could imply routing.
98. Explicit Save and autosave are both required.
99. Saved/Saving/Unsaved/Save failed/Offline must reflect confirmed persistence state, not optimistic frontend requests.
100. Local recovery must protect unsynced work; stale cloud revision must never be overwritten blindly.
101. Patch interaction is local-first; cloud sync is not an interactive dependency.
102. Free-tier/cloud outage must not stop local editing/saving.
103. Live Patch state must not be implemented as one giant constantly-rewritten JSON/blob.
104. Large visual views require lazy loading/virtualization and batched writes.
105. .sdlive is the canonical portable SD.Live Project File extension.
106. .sdlive must support offline editing and safe three-way reconciliation when both original and portable copies changed.
107. Advanced grouped Routing Alternatives/Routing Sets are Festival Mode only.
108. Routing Sets are planning/offline behavior and never directly control connected consoles/hardware.
109. Festival Mode supports both House Routing Sets and Artist Routing Sets.
110. Artist Patches may inherit House routing and override only explicitly-defined portions.
111. Routing Sets may span multiple Groups/parts of the system and may be partial.
112. Detailed House/Artist/Effective provenance is a visual toggle, not mandatory permanent clutter.
113. Artist Routing Priority is an explicit per-Artist toggle and is never inferred.
114. Artist priority applies only to explicit Artist overrides and does not bypass House Locked.
115. House Locked is separate from Reserved and is editable only in House context.
116. House Lock may inherit across a range/container and supports individual/range exceptions.
117. Most-specific House Lock/exception rule wins; overlapping specificity overrides create Warning with visible effective-state provenance.
118. Changing House Lock later never rewrites existing Artist Patches; it only recalculates Warning/Needs Review.
119. Changeover A -> B is a derived comparison of Effective Routing, not an editable third Patch.
120. Changeover classifies at least Unchanged, Repatch, New, Remove/Free, House, House Locked and Warning/Needs Review.
121. Derived Changeover actions may have operational checklist state without altering routing.
122. Recalculation preserves checklist state for technically-identical actions and resets changed actions.
123. Manual technical Changeover tasks are allowed without turning Patch into general task/project management.

## 39. Current continuation — supersedes section 32 where inconsistent

Discovery remains active.

The current contract is now sufficiently rich that the next design work should prioritize validation against real fixtures rather than adding speculative schema.

Recommended continuation:

1. exercise Node/System/Venue View against a real show Patch;
2. exercise Festival Mode against a real House + multiple Artist rider/changeover example;
3. test the model with guest consoles, House handoffs, Artist Routing Priority, House Locks and at least one Routing Set;
4. identify genuine structural failures rather than adding fields for cosmetic differences;
5. only after fixture validation, move toward Product Spec -> Technical Roadmap -> Schema.

Still explicitly not authorized from this roadmap alone: D1 schema/tables; migrations; production runtime routes; console-control behavior for Routing Sets; automated hardware repatching; REGISTRO integration design; production deployment changes.
