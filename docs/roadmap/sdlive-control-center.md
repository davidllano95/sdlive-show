# 14.5 — SD.Live as Control Center

**Reconciled:** 2026-08-31 — America/Bogota
**Status:** **CURRENT BASELINE CLOSED/PASS — NO ACTIVE STABILIZATION GATE**

This document owns the current Control Center sequence. Historical implementation evidence remains in dated checkpoints/specs. When this document conflicts with current `main`, `PROJECT_STATUS.md` or verified production, the higher-precedence current sources win.

## Operating architecture

SD.Live is a Control Center made of focused workspaces rather than one monolithic Admin page:

- `/admin/` — lightweight Dashboard / system overview + Show Day Visual QA;
- `/admin/finance/` — read-only Finance analytics/workflow over Google Sheets `REGISTRO`;
- `/admin/calendar/` — Calendar / Operations over the same `REGISTRO`, including controlled create and Google sync;
- `/admin/calendar/site-schedule/` — website-only Site Schedule / Show Day / Location state in D1;
- `/admin/editor/` — Site Editor / CMS using D1 + R2.

All remain behind Cloudflare Access.

## Source-of-truth guardrails

- Google Sheets `REGISTRO` remains operations/finance persistence + formula owner.
- AppSheet **SD.Live Track** remains the mobile/offline workflow client.
- D1 does not become a Finance mirror.
- D1 `site_schedule_state` owns website-only split blocks / Show Day / Location.
- Google Calendar is a secondary projection/read-only overlay, not operational truth.
- R2 owns managed CMS media.
- Rental pricing, availability rules and quote math remain backend-owned.
- Formula-owned Sheet columns are never written by generic Admin forms.
- Generic Finance Phase 3 write-back remains blocked until a separate explicit contract is approved.

## Closed sequence

### 1. Performance/media baseline — ✅ CLOSED
Responsive image/media delivery and related public performance work passed production verification.

### 2. Security baseline — ✅ CLOSED
Contact/Rental rate limiting, CSP/browser headers and Admin access boundaries are established.

### 3. Finance audit / repair-vs-rewrite — ✅ CLOSED
Decision: **repair + integrate; do not rewrite**. AppSheet offline behavior is preserved.

### 4. SD.Live Track rename — ✅ CLOSED
User-facing rename completed without unnecessary schema/internal-ID churn.

### 5. Source-of-truth mapping — ✅ CLOSED
Field ownership and durable identity were mapped; `ID` remains the durable key.

### 6. Finance read-only Admin — ✅ CLOSED/PASS
Dedicated `/admin/finance/` is production-smoked. PR #141 freeze regression remains closed and DOM-wide Finance `MutationObserver` patterns remain prohibited.

### 7. Multi-day operations + Admin Calendar — ✅ CLOSED/PASS
Canonical `Fecha trabajo` + `Fecha fin` spans are supported in AppSheet/REGISTRO and Admin Calendar.

### 8. Controlled Calendar create — ✅ CLOSED/PASS
Authenticated create writes only approved source fields and preserves formula ownership.

### 9. Site Schedule + automatic Show Day + Location — ✅ CLOSED/PASS
D1 website presentation blocks drive public Show Day state in America/Bogota; Admin QA override is separate and temporary.

### 10. Google Calendar integration — ✅ CLOSED/PASS
`sam@sdlive.show` is the secondary projection/read-only overlay. Site Schedule V2 block reconciliation is aligned with the same D1 store used by Admin/Show Day.

### 11. Admin + public stabilization — ✅ CLOSED/PASS
Issues #126 and #124 are completed after representative desktop/mobile production smoke.

### 12. Rental image-editor parity — ✅ CLOSED/PASS
PR #157 / issue #156 fixed and production-verified image editing across standard equipment cards, synchronized PA and Production Tools.

## Current roadmap selection point

There is **no automatic next feature**. Select one module deliberately before runtime work begins.

### Strong eligible candidates

1. **Availability-Aware Contact / AI** — weekly service hours + travel mode + expiring manual away state; human WhatsApp when reachable, AI qualification/handoff when unavailable. Detailed spec: `docs/roadmap/availability-aware-contact-widget.md`.
2. **SD.Live Patch** — patch sheet / signal-flow / show-documentation workspace. Detailed spec: `docs/roadmap/future-sdlive-patch-2026-08-27.md`.
3. **Controlled Calendar edit/workflow actions** — narrow safe source edits and explicit workflow actions, not a generic Sheet editor.
4. **Finance Document Generator** — Cuenta de cobro / Cotización / invoice draft generation without creating a second finance truth.
5. **Rental availability / double-booking / advanced quote workflow** — requires an explicit inventory/reservation source-of-truth first.
6. **Show Day Primary/Secondary concurrency** — explicit presentation priority when multiple active Show Day blocks overlap.
7. **CRM / AI vendor evaluation** — Attio and Dapta.ai remain candidates only; evaluate ownership, privacy, volume and cost before adoption.

## Availability-Aware Contact / AI relationship

Availability/AI is no longer blocked by the old stabilization sequence. It is **eligible**, but still requires deliberate promotion.

Its architectural boundary is:

`Public site / WhatsApp → SD.Live-owned availability + validation boundary → optional AI provider → existing lead/contact handoff`

The AI layer may qualify and route leads, but it must not own or invent:

- Rental prices/catalog/inventory availability;
- finance/control-center data;
- project history or capabilities not grounded in approved sources;
- owner availability state.

Owner availability remains SD.Live-owned state.

## Billing/reminder follow-up

Issue #83 still covers the AppSheet/reminder alignment around canonical `Fecha fin`. Notification delivery hardening may add email/WhatsApp channels later, but reminder conditions must remain sourced from the same approved finance rules.

## Next-action rule

Before starting any candidate module:

1. read current `main` + `PROJECT_STATUS.md` + latest checkpoint;
2. confirm source-of-truth and integration dependencies;
3. promote exactly one coherent module to Active Gate;
4. implement in a short branch/PR;
5. green CI;
6. one representative production smoke for runtime work.

**Stability > novelty.** Closed gates are not repeated without regression evidence.
