# SD.Live Patch — discovery checkpoint and evaluation

**Date:** 2026-09-28 — America/Bogota  
**Branch:** `docs/sdlive-patch-discovery-contract`  
**Status:** ACTIVE DESIGN / DISCOVERY — NO SCHEMA OR RUNTIME AUTHORIZED  
**Canonical base contract:** `docs/roadmap/sdlive-patch.md`

> This checkpoint preserves decisions closed after the latest canonical-contract update and evaluates discovery readiness. It does not authorize schema, migrations, runtime UI, production resources, Visual Patch, console-control implementation or REGISTRO integration.

## 1. Console preamp, phantom and input-routing decisions

### 1.1 Shared headamp ownership

When a physical preamp/headamp is shared by more than one console or destination, Patch may document which console/device owns or controls that headamp.

- Headamp ownership is optional and only appears where relevant.
- Gain Compensation is documented per destination/console when the platform supports it.
- Patch does not store analog gain values or perform gain staging.

Example:

```text
Rio A / In 12
Headamp owner: MON

FOH CL5 -> Gain Compensation ON
MON CL5 -> Gain Compensation OFF
```

### 1.2 48V belongs to the physical phantom domain

48V is a property/state of the physical preamp/phantom-supplying domain, not independently of Source or Console Channel.

If multiple consoles/views reference the same physical phantom domain, they reflect one shared 48V state. A change at the controlling side is visible everywhere that references that same domain.

If a splitter or architecture creates isolated phantom domains, Patch must respect the real physical capability rather than synchronizing unrelated states.

A console/view without authority over the shared headamp/phantom domain shows 48V read-only.

### 1.3 Alternate input slots

Profile-defined alternatives such as Main/Alt or A/B may contain different Feeds or Sources within the same Patch without conflict when the console architecture treats them as mutually exclusive alternatives.

Conflict is evaluated within each simultaneously-active input leg/slot, not merely because two alternative slots contain different assignments.

## 2. Console architecture and organizational constructs

### 2.1 Stereo representation follows the selected console

Stereo representation is not global SD.Live behavior. The Console Profile/Instance determines whether the platform uses:

- native stereo channels/resources;
- linked mono channels/resources;
- both options;
- another verified representation.

Native stereo may be one logical resource/fader exposing L/R legs. Linked mono remains multiple logical channels/resources.

The previously approved naming behavior is preserved:

- native stereo uses one common projected functional name for the stereo resource while exposing its L/R legs;
- linked mono keeps the individual Source names on the separate channels while indicating the link relationship.

Changing Console Instance may produce an adaptation proposal, but Patch never silently rewrites stereo/link representation or existing assignments.

### 2.2 Optional DCA/VCA/Control Groups

Patch may optionally document membership/assignment to DCA, VCA, Control Group or equivalent constructs when the selected console exposes them.

- The Console Profile/Instance defines which constructs exist.
- They are organizational/control resources, not Output Paths.
- Patch does not store their live fader levels or processing.
- A Patch remains complete without documenting them.

### 2.3 Optional Mute Groups

Mute Groups are likewise optional, console-defined organizational/control constructs.

Patch may document membership but does not require the momentary live Muted/Unmuted state as permanent design state.

## 3. Console internal routing boundary

### 3.1 Structural routing is in scope

Patch may document routing between internal console resources when it materially describes the signal topology.

Examples:

```text
Main LR -> Matrix 1 -> Main PA
Bus 12 -> Matrix 4 -> Front Fill
```

Multiple resources may feed another resource:

```text
Main LR ------\
Playback Bus ---+-> Matrix 1 -> Broadcast
MC Bus --------/
```

Patch records that those routes exist, not the contribution levels.

### 3.2 Mix composition is out of scope

Normal channel-to-mix send membership is not part of Patch when it would reconstruct the mix itself.

Patch may document:

```text
IEM 1 Bus -> IEM 1 Output Path -> Rio Out 9 -> PSM900 Tx 1
```

but not the normal mix composition:

```text
Kick -> IEM 1
Snare -> IEM 1
Vocal -> IEM 1
```

nor send levels.

### 3.3 Console resource families are not universal

The core must not assume every console has the same universal families such as FX Return, Matrix, Group, DCA, etc.

The Console Profile/Instance defines what resource families exist and what routing between them is valid.

An FX engine may return through a dedicated FX Return on one platform, a normal input channel on another, or another verified structure.

### 3.4 Inserts

Inserts may be documented when they affect technical routing, including:

- insert point;
- send/return;
- internal/external endpoint routing;
- inserted Device where relevant.

Processing parameters remain out of scope.

### 3.5 Direct Outs and routing metadata

Direct Outs may be documented, including destination and tap point where supported.

General rule:

> Patch may store routing metadata that changes technically which signal is delivered — for example tap point, pre/post selection, insert position or equivalent source-selection metadata — when the Console Profile/Instance exposes that option.

Patch does not store level, EQ, dynamics, FX parameters, fader positions or other mix/processing values.

## 4. Internal console resource format and Output Paths

### 4.1 Internal resources may be mono/stereo/multichannel

A console internal resource can be mono, stereo or multichannel according to the actual platform architecture.

A stereo/multichannel resource may remain one logical resource/fader while exposing independent legs for routing.

Example:

```text
Stereo Matrix 1 [one logical resource]
  L -> Rio Out 1
  R -> Rio Out 2
```

This is different from two independent mono matrices.

### 4.2 Output Path granularity is operator/system-defined

An Output Path may be mono, stereo or multichannel according to how the operator needs to describe the system function.

Valid examples include:

```text
Main PA [stereo]
  L
  R
```

or independent Output Paths:

```text
PA Left
PA Right
```

or:

```text
LCR
  L
  C
  R
```

SD.Live does not force all outputs to be atomic mono nor force all related outputs into one multichannel container.

### 4.3 Fan-out is per Output Path leg

Each leg of a mono/stereo/multichannel Output Path may fan out to multiple compatible physical/network endpoints.

Example:

```text
Main PA [stereo]
L -> Rio Out 1
  -> Dante Tx 17
R -> Rio Out 2
  -> Dante Tx 18
```

### 4.4 Output naming

The Output Path owns the canonical functional name/purpose.

Console resources retain their real technical identity such as `Matrix 4`, `Bus 12` or `Main LR` and may project the Output Path name in views, but they do not create a second functional identity that can silently diverge.

Example:

```text
Matrix 4 — Front Fill
```

means `Matrix 4` is the console resource and `Front Fill` is the Output Path purpose.

### 4.5 One internal resource may feed multiple Output Paths

A single console resource may feed several distinct Output Paths when the same program signal serves several system purposes.

Example:

```text
Main LR
  -> Main PA
  -> Broadcast Program
```

The Output Paths remain distinct because their purposes differ.

### 4.6 Output Paths do not require a console origin

An Output Path may originate from any technically valid route or Device, including console, DSP, interface, playback device, guest console or other source.

## 5. Festival Mode output alternatives and redundancy

### 5.1 Alternative House output assignments by rider

In Festival Mode, a House output endpoint may have different alternative assignments for mutually exclusive Artist Patches/Riders without conflict.

Conflict still applies when two different Output Paths in the same simultaneously-active Patch attempt to occupy the same ordinary output endpoint.

### 5.2 Redundant routes

Output Paths may document real redundant/alternative architectures such as A/B, Primary/Backup or equivalent selectors/failover structures when the hardware supports them.

Patch records the designed roles/architecture. It does not require the operator to manually maintain live `Active/Standby` failover state during a show.

If live selector state is ever available automatically from an integration, it may be displayed as telemetry rather than becoming required manually-maintained Patch truth.

General UX rule:

> A fact that changes during an emergency and that nobody reasonably expects the operator to update manually should not be required manual state for the Patch to remain valid.

## 6. Stable identity, ordering and lineage

### 6.1 Identity is independent from view order

Sources, Feeds, Output Paths, Devices and other technical entities keep stable identity when reordered.

There is no universal row number controlling the Patch.

Each projection may use its own ordering, such as:

- manual documentation order;
- Console Channel order;
- Stage Position;
- name;
- another view-specific order.

Reordering a documentation view never repatches technical assignments.

### 6.2 Derived Patches are independent but remember origin

When a Patch is derived from another Patch, its elements become independently editable while retaining lineage to their origin elements for diff and future selective apply-back.

Editing the derived Patch never silently mutates the Master.

Removing an element from a derived Patch removes it only there. Diff may show it as Removed; the Master remains unchanged.

### 6.3 Later Master changes do not auto-update derivations

A derived Patch stays based on the state/version from which it was created. Later Master changes are shown as reviewable changes, never auto-applied.

### 6.4 Granular Apply to Master

A change created in a derived Patch may offer an explicit `Apply to Master` action, including immediately after creating something that the operator knows should become permanent.

Apply-back must be granular and previewable.

Example for a new Talkback:

```text
Apply to Master
[x] Source: Talkback
[x] Feed: Talkback
[x] Capture: SM58
[ ] Stage input: Rio A / In 32
[ ] FOH assignment: Ch 48
```

Conceptual/reusable changes may be preselected by default; venue-specific physical routing and console assignments should not be preselected by default.

Nothing propagates automatically.

### 6.5 Three-way conflict review

If the same fact has changed differently in Master and derived Patch since their common origin, Patch must not choose a winner automatically.

Example:

```text
Bass / FOH Channel
Original: Ch 8
Master:   Ch 10
Event:    Ch 12
```

This is a review conflict.

If only one side changed, it is simply a change available for review.

### 6.6 Names are not identifiers

Duplicate names are allowed. Identity is independent from human-readable name.

Rename preserves identity and appears as a rename in History/diff.

Delete + recreate produces a new identity even if the new item uses the exact same name.

`Duplicate` inside the same Patch creates a new independent identity using copied values as a starting point; it does not create ongoing synchronization or permanent lineage with the original.

## 7. Source Groups and view organization

### 7.1 Multiple Source Groups

A Source may belong to multiple Source Groups simultaneously.

Membership does not change routing, linking, stereo behavior or Source identity.

### 7.2 Flat groups for MVP

Source Groups remain flat in MVP. The model should not block future nesting/hierarchy if later validated, but hierarchy is not required now.

### 7.3 Source Group is not a view section

Source Groups are persistent relationships/classifications.

View sections are presentation-only organization within a particular projection such as Input List or Patch Sheet.

The same Source may be presented under different visual sections in different views without changing its technical data.

## 8. Empty/spare Console Channels

Console Channels exist independently from Sources/Feeds.

A channel may be:

- unassigned;
- unused;
- reserved as spare;
- later assigned to a Feed.

Patch does not need to create a fictitious Source named `Spare` merely to represent an empty Console Channel.

## 9. Stage Position and physical context

### 9.1 Stage Position is technical state, not presentation

View Section is presentation-only. Stage Position is persistent physical context.

Changing Stage Position can affect which I/O is physically convenient/relevant, but Patch never repatches automatically.

### 9.2 Cross-position I/O is allowed with warning

If a Source moves from one Stage Position to another while remaining patched to I/O in the old position, the existing route is preserved.

Patch may show an important physical-context warning, but this is not automatically a hard error because the operator may intentionally run a longer cable or use remote infrastructure.

The inverse also applies: assigning a Source in Stage Left to a Stage Right cajetín does not change the Source's Stage Position.

### 9.3 Device/Infrastructure location inheritance

Devices and Infrastructure may have Stage Position. Their Ports/Endpoints inherit that position by default.

An endpoint may override the parent location when it is physically exposed elsewhere.

Connections do not own a separate Stage Position; their physical context is derived from endpoints and explicit Infrastructure.

Moving a Device changes the inherited physical context of its Ports but preserves all existing Connections/assignments and recalculates warnings rather than repatching.

### 9.4 Rename/delete semantics

Renaming a Stage Position preserves identity.

Deleting a Stage Position never automatically redistributes Sources, Devices or Infrastructure using it; the user decides where those elements move or leaves them temporarily without a position.

### 9.5 Stage Position is optional

A Source, Device or Infrastructure item may be temporarily unpositioned/TBD without making the Patch invalid.

When a Source has a Stage Position, Patch may prioritize compatible Stage I/O located there during assignment while still allowing any compatible endpoint elsewhere.

## 10. Line Check / Operational Verification

### 10.1 Optional feature, OFF by default

Line Check / Operational Verification is optional per Patch and disabled by default.

A Patch can be complete without using Planned/Connected/Verified show-floor workflow.

Turning the feature off hides/disables that operational layer but preserves any existing verification data so it can be restored if re-enabled.

### 10.2 Verification is route/destination based

Line Check operates on the existing Connections/routes and does not create a second independent `Source Verified` truth.

The same Feed may be:

```text
FOH        Verified
MON        Connected
Broadcast  Planned
```

A Source/Feed-level status such as `Partially verified` or `2/3 routes verified` is derived summary only.

### 10.3 Shared-segment verification

When checking one route, only segments actually proven by that check become Verified.

Shared upstream segments may therefore become Verified for other branches, while untested downstream branches remain unchanged.

## 11. System boundary and Handoffs

### 11.1 Normal downstream boundary

The normal Output Path boundary is the system handoff. SD.Live Patch does not need to model PA processing, amplifiers, speaker distribution or arrays downstream of that handoff; that belongs to the system-tech/system-design domain.

Examples of sufficient Patch termination:

```text
Main PA L -> House System In 1
Main PA R -> House System In 2
Subs      -> House System In 3
```

If a concrete Device such as a processor is itself the agreed handoff, it may be modeled, but Patch does not need to continue beyond it.

### 11.2 Handoff definition

A Handoff is an explicit technical boundary where responsibility passes between the Patch and another system/domain.

A Handoff may be physical or virtual/network and may be an input or output boundary.

Examples include:

- analog XLR;
- Dante Tx/Rx;
- MADI;
- AES3;
- SoundGrid;
- festival guest return;
- House splitter output;
- House system input.

A valid Handoff can serve as a complete route origin or termination. Patch does not mark a route incomplete merely because the signal path outside the Handoff is intentionally unknown/out of scope.

### 11.3 Handoffs are technically typed

A Handoff is not only free text. It exposes enough real technical information to validate compatibility, such as:

- direction;
- signal/protocol;
- format;
- connector where physical;
- channel/leg structure;
- capability/capacity.

Verified incompatibility across a Handoff follows the same validation principles as other endpoints.

### 11.4 Festival Mode House Handoffs

In Festival Mode, House Handoffs belong to the House Patch. Artist Patches reference/use those House-defined Handoffs rather than duplicating their technical definition.

Different Artist Patches may reuse the same House Handoff channels/lanes because those riders are mutually exclusive.

Conflict/occupation is evaluated within the active Artist Patch context.

### 11.5 Per-rider Handoff allocation

The House Patch defines the technical capacity of a Handoff.

Festival Mode may optionally define a permitted allocation/subset for each Artist Patch/Rider.

Example:

```text
House Guest Dante Tx
Capacity: 48 channels

Artist A allocation: 1-24
Artist B allocation: 1-32
Artist C allocation: 1-16, 25-32
```

Using a technically valid House channel outside a rider's allocation should generate an allocation warning/error appropriate to the future UX, without falsely marking the underlying House endpoint as damaged or globally occupied.

If no per-rider allocation is defined, the rider may use the compatible available capacity exposed by the House Handoff.

## 12. Explicitly deferred in this phase

### 12.1 REGISTRO/Event integration

Do not design or implement REGISTRO/Event linkage, metadata synchronization, pinning or historical external metadata behavior in the current Patch discovery phase.

The separation-of-authority principle remains, but integration details are deferred until explicitly reopened.

### 12.2 System-tech downstream domain

Detailed PA downstream modeling — processors after the agreed handoff, amplifiers, speaker boxes, arrays and system distribution — is not part of the core Patch scope being designed now.

## 13. Discovery evaluation

### 13.1 What is now substantially closed

The conceptual model is now strong across:

- Patch identity, Master/derived behavior, history and snapshots;
- Sources, Feeds and Source Groups;
- capture flexibility;
- multiple consoles and console-specific input views;
- physical/network endpoints;
- Device vs Infrastructure;
- stage I/O and compound/multipin behavior;
- availability/condition/conflict semantics;
- Console Channels, alternative slots and mono/stereo representations;
- shared headamp ownership, Gain Compensation and phantom-domain behavior;
- console organizational constructs (optional DCA/VCA/Control Groups and Mute Groups);
- console internal structural routing and its boundary from mixing;
- inserts, Direct Outs and routing metadata such as tap points;
- mono/stereo/multichannel internal resources and Output Paths;
- output fan-out, alternative rider assignments and redundancy architecture;
- Festival Mode centered on a House Patch;
- cross-rider Source/Feed correspondence;
- guest consoles by function/destination;
- House Handoffs and per-rider allocations;
- stable identity vs ordering;
- derived-Patch lineage, selective apply-back and conflict review;
- Stage Position semantics and physical-context warnings;
- optional Line Check / Operational Verification;
- system handoff as normal downstream boundary.

### 13.2 Remaining discovery before fixture validation

The remaining conceptual work should be narrow rather than reopening the model wholesale. Priority items are:

1. final terminology audit (`Feed`, `Handoff`, Source Group naming and any other provisional labels);
2. exact UX contract for the main editing surfaces — especially how progressive disclosure works in Input List, Stage I/O, console Inputs, Outputs and Festival Mode;
3. exact warning/error severity taxonomy for allocation/context warnings versus hard conflicts;
4. any remaining Device/Profile capability edge cases needed before fixtures;
5. files/notes/reference-material scope if it materially affects the Patch core; otherwise defer;
6. snapshot/history diff UX details only to the level necessary to validate lineage decisions;
7. choose 1–2 representative real fixtures and actively try to break the model.

REGISTRO/Event integration remains intentionally deferred.

### 13.3 Readiness assessment

Discovery is **late-stage conceptual / pre-fixture validation**.

The model is sufficiently developed that continuing to invent abstractions without real fixtures now has diminishing returns. The next major quality gate should be to run 1–2 real patches/riders through the model and record where the contract fails, becomes awkward or requires one-off exceptions.

Recommended fixture coverage:

- one complex single-show or install with multiple consoles, shared stage racks/headamps, internal routing, outputs and real Stage I/O;
- one festival/guest-console case with House Patch, multiple riders, correspondence, alternative House Console assignments, guest Handoffs and changeover mappings.

Do **not** move to schema yet. After fixture validation, reconcile the failures into the canonical contract, close the remaining UX/terminology questions, then proceed Product Spec -> Technical Roadmap -> Schema.
