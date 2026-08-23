# SD.Live — post-integration visual audit + Site Schedule cleanup

**Created:** 2026-08-23 — America/Bogota  
**Status:** REQUIRED follow-up, intentionally queued behind the current Google OAuth controlled-create gate.  
**Trigger:** run immediately after one controlled Admin create passes end-to-end in Google Sheets + AppSheet, before broad new visual feature expansion.

## Why this audit is required

Recent work materially changed several connected visual/runtime surfaces at once: Admin Calendar, Site Schedule, automatic Show Day, website-only Location, shared Home-style headers on secondary public pages, mobile Calendar/Agenda behavior and Admin workspace separation.

Individual smoke tests passed the functional gates, but functional PASS does not guarantee cross-page visual coherence. A dedicated visual audit is therefore required instead of relying on isolated screenshots or assuming that one page represents the whole system.

The audit must be **very detailed** and must treat **desktop and mobile as separate first-class layouts**, not as one desktop review plus a quick responsive check.

## Sequencing

This audit does **not** interrupt the active OAuth gate.

Required order:

1. finish Google OAuth Sheets write authorization;
2. pass one controlled Calendar create → Google Sheet → AppSheet smoke;
3. run the Site Schedule source-list cleanup described below;
4. run this full visual audit and log findings;
5. fix P0/P1 visual regressions before opening major new visual work;
6. then continue with controlled Calendar edit/workflow actions and other roadmap items.

A critical regression discovered sooner may still be fixed immediately, but the systematic audit remains required.

## Audit surfaces

### Public site — normal mode

Audit every current public route family, not only Home:

- `/`;
- `/en/`;
- `/es-co/`;
- `/theatre-sound-design-audio-post`;
- `/audio-eventos-streaming-teatro-bogota`;
- `/alquiler-sonido-wing-midas-dl32-bogota`;
- nested/current Rental/service landing variants present in the repository.

For each applicable route inspect:

- shared Home-style header structure;
- canonical SD.Live logo sizing, alignment and contrast;
- brand Location line in normal mode;
- primary navigation order, spacing, hover/focus states and anchor destinations;
- EN/ES controls and persistence;
- Start Project CTA placement and state;
- mobile menu open/close behavior, scroll locking and tap targets;
- sticky/header transitions while scrolling;
- hero top spacing below the shared header;
- typography hierarchy, line breaks and readable measure;
- section spacing, card alignment, glass panels and borders;
- CTA consistency;
- footer consistency;
- WhatsApp control position and safe-area behavior;
- Rental cart position/overlap on Colombia-facing surfaces;
- horizontal overflow, clipping and accidental page-width expansion;
- anchor offsets so content is not hidden behind the header;
- focus rings and keyboard navigation on desktop;
- touch feedback and no hover-only affordances on mobile.

### Public site — Show Day active

Repeat the relevant routes with automatic Show Day active and a real Site Schedule Location.

Verify:

- no page uses the legacy manual Show Day toggle;
- ON AIR state is visually identical/coherent across Home and secondary pages;
- Show Day logo treatment is consistent;
- configured Location appears in the intended place and does not wrap/collide unexpectedly;
- red Show Day palette is complete rather than partially mixed with normal violet state;
- buttons, borders, highlights, links and active controls retain readable contrast;
- Rental cart / WhatsApp / language controls do not clash with Show Day styling;
- shared header replacement does not create duplicate IDs, duplicated controls or unexpected spacing;
- switching language while Show Day is active preserves the active state;
- entering a secondary route directly still produces the same visual system as navigating from Home.

Known polish to verify/measure during this audit:

- normal-violet → Show Day red startup popping;
- static normal favicon while Show Day is active.

Those two items are already approved backlog; the audit should document their actual severity on desktop/mobile before implementation.

## Admin / Control Center audit

Audit all current private workspaces behind Cloudflare Access:

- `/admin/` Dashboard;
- `/admin/finance/` Finance;
- `/admin/calendar/` Calendar / Operations;
- `/admin/calendar/site-schedule/` Site Schedule;
- `/admin/editor/` Site Editor.

### Shared Admin checks

- shared violet Admin palette/tokens remain consistent;
- no module introduces stray blue/lime/orange decorative accents;
- header/workspace navigation alignment and active state;
- responsive width/centering and max-width behavior;
- panel spacing, border radii and elevation consistency;
- button hierarchy and disabled/loading/error states;
- text contrast and muted-label readability;
- no horizontal overflow;
- no control hidden behind browser safe areas or sticky elements;
- keyboard focus order on desktop;
- tap targets and spacing on mobile;
- loading states do not cause large cumulative layout shifts;
- empty/error/offline states remain legible and branded.

### Calendar / Operations specific

Desktop and mobile separately:

- month grid proportions and date-cell readability;
- multi-day/effective Site Schedule blocks across week boundaries;
- event text truncation/overflow;
- today state;
- `Next` card spacing and hierarchy;
- Calendar/Agenda mobile selector;
- month navigation;
- create form layout and validation messages;
- modal/sheet scrolling on small screens;
- long client/project/role strings;
- COP/USD/state chips where shown;
- behavior at month transitions and with several events on one day.

### Site Schedule specific

- source-work list density and search;
- selected-work state;
- original source-range summary;
- segment cards and add/remove controls;
- date input alignment;
- Show Day toggle hierarchy;
- Location field visibility/required-state feedback;
- Save / Use REGISTRO dates actions;
- validation messages for overlap, outside-range, backwards date and missing Location;
- saved state after reload;
- mobile editing without accidental horizontal scroll.

## Site Schedule source-list cleanup — required follow-up

The **Split Work / Site Schedule source selector must only show ongoing or future source work**.

Dynamic rule in **America/Bogota**:

- **ongoing:** `sourceStartDate <= today <= sourceEndDate` → visible;
- **future:** `sourceStartDate > today` → visible;
- **past:** `sourceEndDate < today` → hidden from the Split Work selector.

Important boundaries:

- filtering the editor list must **not delete** existing past Site Schedule overrides;
- historical Calendar display/data may still render past events where the Calendar itself is intentionally showing past dates;
- source-of-truth `REGISTRO` remains unchanged;
- the filter is a Site Schedule editor usability rule, not a Finance or AppSheet data-retention rule;
- search operates only across the currently eligible ongoing/future set;
- timezone must match the rest of Site Schedule/Show Day logic: **America/Bogota**.

## Desktop matrix

Minimum required widths for deliberate inspection:

- large desktop around 1440 px;
- standard desktop/laptop around 1280 px;
- compact desktop/tablet-landscape boundary around 1024 px.

At minimum smoke current Safari + Chrome behavior where available. Differences in sticky headers, form controls, date inputs, backdrop/filter rendering and font metrics must be logged rather than dismissed as browser noise.

## Mobile matrix

Minimum deliberate checks:

- iPhone-class width around 390–393 px in Safari;
- larger iPhone-class width around 430 px where available;
- narrow Android-class width around 360 px in Chrome or equivalent emulation where useful.

Inspect both top-of-page and scrolled states. Pay special attention to safe areas, browser chrome resizing, sticky headers, modals, keyboards opening over forms and controls that are only comfortable with a mouse.

## Language / market matrix

Where supported by the surface, include:

- EN and ES;
- Colombia and International visibility differences;
- normal mode and Show Day active mode.

The goal is not to multiply screenshots mechanically; it is to ensure no conditional branch has silently retained an old header, palette, spacing model or obsolete control.

## Visual severity rubric

- **P0:** blocks use, hides critical controls/data, severe overlap, broken navigation, inaccessible modal/form, or visually corrupt production page.
- **P1:** major brand/layout regression, route/header inconsistency, mobile unusability, major overflow, incorrect conditional UI or misleading state.
- **P2:** noticeable alignment/spacing/typography/transition defect that reduces polish but does not block the workflow.
- **P3:** small cosmetic refinement with low user impact.

P0/P1 findings should be fixed before broad new visual feature work. P2/P3 can be grouped into coherent polish PRs after the audit.

## Finding format

Every logged issue should include:

- route/workspace;
- state (normal/Show Day, EN/ES, COL/INT when relevant);
- browser/device/viewport;
- screenshot or concise visual evidence;
- exact reproduction steps;
- expected visual contract;
- actual result;
- severity P0–P3;
- likely owning CSS/JS/component when known;
- fix PR and post-fix desktop/mobile smoke result.

## Exit criteria

This audit closes only when:

- all public route families have been deliberately reviewed in desktop + mobile;
- all current Admin workspaces have been deliberately reviewed in desktop + mobile;
- Show Day active and normal states are both covered;
- EN/ES and COL/INT conditional branches are sampled where applicable;
- every P0/P1 finding is fixed and production-smoked;
- remaining P2/P3 items are explicitly preserved in backlog rather than forgotten;
- the Site Schedule selector no longer shows source work whose canonical end date is before today;
- README / PROJECT_STATUS / relevant roadmap/checkpoint evidence is updated with audit closeout results.
