# SD.Live — post-integration visual audit + stabilization

**Created:** 2026-08-23 — America/Bogota  
**Updated:** 2026-08-23 — America/Bogota  
**Status:** **ACTIVE**  
**Trigger conditions already completed:** controlled Admin create PASS + Site Schedule ongoing/future source filter PASS.

## Purpose

Recent work materially changed connected public/Admin surfaces: Calendar, Site Schedule, automatic Show Day, website-only Location, shared Home-style headers on secondary pages, mobile Calendar/Agenda, Footer and Admin workspace separation.

Functional smoke does not equal visual coherence. This audit therefore treats **desktop and mobile as separate first-class layouts** and reviews both **normal and Show Day** states before the visual stabilization milestone can close.

## Sequencing — locked

The active sequence is:

1. ~~Google OAuth Sheets write authorization~~ **PASS**;
2. ~~controlled Calendar create → Google Sheet → AppSheet smoke~~ **PASS** after PR #99 row-safety recovery/hardening;
3. ~~Site Schedule source-list ongoing/future cleanup~~ **PASS — PR #100**;
4. **run this detailed public + Admin visual audit — ACTIVE**;
5. fix P0/P1 visual regressions before closing stabilization;
6. preserve P2/P3 findings explicitly and implement them in coherent order;
7. only after audit closeout continue controlled Calendar edit/workflow actions and unrelated roadmap items.

**Priority discipline:** findings discovered while reviewing the current surface may be fixed as part of the audit. Do not abandon the audit to start unrelated milestones merely because a new idea appears. Conversely, do not forget a valid P2/P3 finding; record it and implement it when its turn comes.

## Current progress snapshot

### Closed during the audit

- **PR #101 — footer legal placement:** Privacy + Cookie preferences moved to the bottom legal area.
- **PR #102 — Show Day footer brand:** footer logo follows Show Day; dot blinks on the same recording cadence as the header and respects reduced motion.
- **PR #103 — footer balance:** desktop footer layout rebalanced and long Site links split more cleanly.
- **PR #104 — copyright mark regression:** restored the branded `SD.Live` point while eliminating the stray literal period below the line.
- **PR #105 — mobile Show Day Location spacing:** added a 2 px mobile-only Show Day offset below the logo. Production user check: **A / PASS**.

### Current open findings

These are part of the active audit; they are not permission to reorder the broader roadmap.

#### Rental quote drawer/header clarity — OPEN

Observed on mobile:

- header hierarchy is too tall/verbose;
- current visible stack effectively reads four lines: `Carrito de alquiler` + `Arma tu / solicitud de / alquiler`;
- the experience still reads too much like an ecommerce cart/checkout even though the user is actually requesting a quote.

Required direction:

- compact the drawer header hierarchy;
- make the flow unmistakably a **rental quotation/request**, not an instant purchase;
- preserve transactional ownership: backend pricing/quote logic remains authoritative;
- preserve notification destination `rental@sdlive.show`;
- do not change inventory IDs, pricing math or persistence just to solve copy/layout.

Provisional severity: **P2 UX clarity/polish**, unless a deeper usability problem is found during interaction QA.

#### Trusted By / supported-brand contrast — OPEN VERIFY/FIX

User observed at least two brand marks with insufficient contrast in mobile Show Day and suspects desktop also suffers.

Required verification matrix before changing assets/styles:

- mobile normal;
- mobile Show Day;
- desktop normal;
- desktop Show Day.

Apply the smallest brand-safe treatment that improves legibility without repainting logos arbitrarily or introducing a new decorative palette.

#### Admin visual audit — OPEN

Still deliberately required for:

- `/admin/` Dashboard;
- `/admin/finance/` Finance;
- `/admin/calendar/` Calendar / Operations;
- `/admin/calendar/site-schedule/` Site Schedule;
- `/admin/editor/` Site Editor.

Admin audit remains a first-class part of this milestone and cannot be skipped because public mobile has received more screenshots so far.

## Preserved future Editor / card-system backlog — RECORDED, NOT ACTIVE

The following ideas are intentionally preserved for later implementation and **do not change the current visual-audit sequence**.

### Testimonials — consistent card geometry + long-copy handling

Desired outcome:

- testimonial cards should present a **consistent visual height/geometry** within the same layout so one long quote does not create an awkward oversized card beside shorter ones;
- long testimonials must remain fully accessible without silently truncating or deleting approved copy;
- preferred UX direction is a restrained line-clamp/preview with an obvious **Read more / Leer más** affordance that reveals the full quote elegantly (inline expansion, controlled overlay/modal or equivalent pattern to be validated when implemented);
- expansion/collapse must be keyboard/touch accessible, preserve focus, work on mobile and desktop, and avoid destructive layout jumps or horizontal overflow;
- EN/ES variants may have different text lengths, so the solution must be content-resilient rather than tuned to one language;
- do not force every testimonial to the height of the single longest quote if a more elegant progressive-disclosure pattern preserves a balanced layout.

### Generic Editor collection/card reordering

Reordering should become a **consistent first-class Editor capability** across every collection-like section where item order is meaningful, rather than being implemented ad hoc section by section.

Scope includes, where applicable:

- Testimonials;
- Trusted By / client cards;
- Supported Brands / marcas atendidas;
- Services;
- Selected Work / project cards;
- Rental presentation cards/items that are presentation-owned by CMS;
- any future repeatable card/list collection added to the Editor.

Required direction:

- preserve existing section-specific reorder behavior where it already works, but converge toward one shared interaction model;
- every applicable collection should expose a clear, intuitive way to reorder items in Admin;
- prefer explicit drag handles and/or accessible move up/down controls rather than making entire cards accidentally draggable;
- keyboard-accessible reordering is required; touch behavior must be deliberate and comfortable on mobile Admin;
- order changes belong to Draft until Publish under the existing Draft → Published contract;
- reordering must not mutate unrelated item data, IDs, media ownership or transactional/backend-owned fields;
- where a collection has market/language variants, ordering semantics must be defined deliberately rather than creating hidden divergence by accident.

This is a future **Editor UX/systemization** milestone, not permission to interrupt the current Rental/Trusted/Admin audit sequence.

## Public site — normal mode

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
- Rental quote/cart control position and overlap on Colombia-facing surfaces;
- horizontal overflow, clipping and accidental page-width expansion;
- anchor offsets so content is not hidden behind the header;
- focus rings and keyboard navigation on desktop;
- touch feedback and no hover-only affordances on mobile.

## Public site — Show Day active

Repeat relevant routes with automatic Show Day active and a real Site Schedule Location.

Verify:

- no legacy manual Show Day toggle;
- ON AIR state coherent across Home and secondary pages;
- Show Day logo treatment consistent;
- configured Location has deliberate spacing and does not wrap/collide;
- red/orange Show Day palette is complete rather than mixed unintentionally with normal violet;
- buttons, borders, highlights, links and active controls retain readable contrast;
- Rental quote/cart, WhatsApp and language controls do not clash with Show Day styling;
- shared header replacement does not create duplicate IDs/controls/spacing;
- switching language preserves Show Day state;
- direct entry to secondary routes still feels like the same visual system;
- footer logo/copyright/legal layout remains coherent in Show Day.

Known low-priority polish to measure during this audit:

- normal-violet → Show Day red startup popping;
- static normal favicon while Show Day is active.

Those are already approved backlog, not reasons to interrupt current audit order.

## Admin / Control Center audit

Audit all current private workspaces behind Cloudflare Access:

- `/admin/` Dashboard;
- `/admin/finance/` Finance;
- `/admin/calendar/` Calendar / Operations;
- `/admin/calendar/site-schedule/` Site Schedule;
- `/admin/editor/` Site Editor.

### Shared Admin checks

- shared violet Admin palette/tokens remain consistent;
- no stray blue/lime/orange decorative accents except semantic status colors;
- header/workspace navigation alignment and active state;
- responsive width/centering and max-width behavior;
- panel spacing, border radii and elevation consistency;
- button hierarchy and disabled/loading/error states;
- text contrast and muted-label readability;
- no horizontal overflow;
- no control hidden behind browser safe areas or sticky elements;
- keyboard focus order on desktop;
- tap targets and spacing on mobile;
- loading states avoid large layout shifts;
- empty/error/offline states remain legible and branded.

### Calendar / Operations specific

Desktop and mobile separately:

- month grid proportions/date-cell readability;
- multi-day/effective Site Schedule blocks across week boundaries;
- event truncation/overflow;
- today state;
- `Next` hierarchy;
- Calendar/Agenda selector;
- month navigation;
- create form layout/validation;
- modal/sheet scrolling on small screens;
- long client/project/role strings;
- currency/state chips where shown;
- month transitions and multiple events/day.

### Site Schedule specific

- source-work density/search;
- selected-work state;
- original source-range summary;
- segment cards/add-remove controls;
- date inputs;
- Show Day hierarchy;
- Location visibility/required feedback;
- Save / Use REGISTRO dates;
- overlap/outside-range/backwards/missing-Location errors;
- saved state after reload;
- mobile editing without horizontal scroll.

## Site Schedule source-list cleanup — CLOSED/PASS

PR #100 implemented the editor-only filter in **America/Bogota**:

- ongoing: `sourceStartDate <= today <= sourceEndDate` → visible;
- future: `sourceStartDate > today` → visible;
- past: `sourceEndDate < today` → hidden from Split Work selector.

Boundaries preserved:

- no deletion of historical overrides;
- historical Calendar may still show past events;
- `REGISTRO` unchanged;
- AppSheet unchanged;
- Finance timing / Issue #83 unchanged;
- search only runs across the eligible ongoing/future set.

Production user check: **A / PASS**.

## Desktop matrix

Minimum deliberate widths:

- large desktop ~1440 px;
- standard desktop/laptop ~1280 px;
- compact desktop/tablet-landscape boundary ~1024 px.

At minimum smoke Safari + Chrome where available. Differences in sticky headers, form controls, date inputs, backdrop/filter rendering and font metrics should be logged.

## Mobile matrix

Minimum deliberate checks:

- iPhone-class ~390–393 px Safari;
- larger iPhone-class ~430 px where available;
- narrow Android-class ~360 px Chrome/equivalent emulation where useful.

Inspect top-of-page and scrolled states, safe areas, browser chrome resizing, sticky headers, modals/drawers, keyboards over forms and touch comfort.

## Language / market matrix

Where supported:

- EN and ES;
- Colombia and International;
- normal and Show Day.

The goal is not mechanical screenshot multiplication; it is to ensure no conditional branch retained an old header, palette, spacing model or obsolete control.

## Severity rubric

- **P0:** blocks use, hides critical controls/data, severe overlap, broken navigation, inaccessible form/drawer or visually corrupt production.
- **P1:** major brand/layout regression, route/header inconsistency, mobile unusability, major overflow, incorrect conditional UI or misleading state.
- **P2:** noticeable alignment/spacing/typography/UX clarity defect that reduces polish but does not block workflow.
- **P3:** small cosmetic refinement with low impact.

P0/P1 must be fixed before the audit closes. P2/P3 remain explicitly tracked and may be grouped into coherent polish PRs.

## Finding format

Each logged issue should include:

- route/workspace;
- state (normal/Show Day, EN/ES, COL/INT when relevant);
- browser/device/viewport;
- screenshot or concise visual evidence;
- reproduction steps;
- expected contract;
- actual result;
- severity;
- likely owning CSS/JS/component when known;
- fix PR + post-fix desktop/mobile smoke.

## Exit criteria

The audit closes only when:

- all public route families are deliberately reviewed desktop + mobile;
- all current Admin workspaces are deliberately reviewed desktop + mobile;
- Show Day active and normal states are both covered;
- EN/ES and COL/INT branches are sampled where applicable;
- every P0/P1 finding is fixed and production-smoked;
- remaining P2/P3 items are explicitly preserved;
- Site Schedule selector no longer shows completed source work — **already PASS**;
- Rental quote drawer/header clarity is resolved or explicitly deferred with rationale/severity;
- low-contrast Trusted By/supported-brand cases are verified in both modes/device classes and fixed if reproducible;
- README / PROJECT_STATUS / roadmap/checkpoint evidence is updated at closeout.