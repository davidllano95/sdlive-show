# SD.Live — current-state handoff after Rental editor closeout

**Date:** 2026-08-31 — America/Bogota  
**Current runtime baseline:** PR #157 = `74b5eaed01ed324b7f5f1af82dea27721a3b5509`  
**Admin stabilization:** CLOSED/PASS  
**Public post-integration audit:** CLOSED/PASS  
**Rental image-editor parity:** CLOSED/PASS  
**Issues:** #126 CLOSED, #124 CLOSED, #156 CLOSED  
**Active stabilization gate:** none

## Latest accepted runtime evidence

### Rental image editor — PR #157 / issue #156

The full Rental image-editing path was reconciled after Production Tools exposed a preview/public mismatch.

Accepted behavior:

- standard equipment cards respond to Replace / Library / Image size / Horizontal position / Vertical position;
- Production Tools use the same presentation semantics rather than a separate broken selector path;
- Event Labeler was edited in production, saved and published successfully;
- BetaThree PA remains one canonical media/framing control driving both visible units together;
- Behringer WING standard-card controls passed representative production smoke;
- Save Draft / Publish boundaries remain unchanged;
- current public card geometry/CSS remains authoritative;
- Rental pricing, inventory, availability, preset composition and quote math remain outside CMS ownership.

## Stable closed areas

Do not repeat these audit/smoke sequences without regression evidence:

- Finance reliability PR #141;
- Admin stabilization issue #126;
- public post-integration visual issue #124;
- Rental image-editor parity issue #156;
- Calendar controlled create;
- Site Schedule V2 + automatic Show Day + Location;
- Google Calendar projection/read-only overlay through the current V2 store.

## Current selection point

There is no automatic next runtime module. Deliberately select one coherent roadmap candidate.

Strong current candidates:

- **Availability-Aware Contact / AI** — weekly service hours + travel mode + expiring manual away; route visitors to human WhatsApp or AI qualification/handoff while preserving Contact/Rental fallbacks;
- **SD.Live Patch** — patch sheet / signal-flow / show-documentation workspace;
- controlled Calendar edit/workflow actions;
- Finance Document Generator;
- Rental inventory availability / double-booking / advanced quote workflow;
- Show Day Primary/Secondary concurrency;
- CRM/AI provider evaluation (Attio / Dapta.ai) only after ownership/cost/privacy decisions.

## Availability/AI notes recovered from backlog

The existing concept is broader than a fixed `business hours` banner:

1. **manual away override** — highest priority, short and expiring, ideally controllable from the owner's verified WhatsApp;
2. **travel mode** — temporary timezone + end date;
3. **weekly service hours** — default baseline;
4. **contact routing** — human WhatsApp when reachable, AI assistant when unavailable, Contact/Rental forms always preserved;
5. **AI role** — FAQ + lead qualification + bilingual first response + human handoff, never pricing/finance/catalog authority;
6. **lead ownership** — normalized leads pass through an SD.Live-owned boundary rather than living only in the AI vendor;
7. adjacent backlog: Basic CRM/pipeline, client-facing availability link, Rental availability/conflict detection and internal follow-up/reminder automation.

Detailed spec: `docs/roadmap/availability-aware-contact-widget.md`.

## New-chat rule

Read in this order:

`current main + verified production → schema/config → this checkpoint → PROJECT_STATUS.md → README.md → selected module spec → ROADMAP_MASTER_CHECKLIST.md`.

Do not reactivate old OAuth, visual-audit or Rental-editor gates from historical docs. Promote exactly one next module before runtime work.
