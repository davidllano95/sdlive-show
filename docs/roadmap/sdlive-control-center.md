# 14.5 — SD.Live as Control Center

**Reconciled:** 2026-09-26 — America/Bogota  
**Status:** **SD.Live Documents v1 ACTIVE GATE**

This document owns the current Control Center sequence. Historical implementation evidence remains in dated checkpoints/specs. When this document conflicts with current `main`, `PROJECT_STATUS.md` or verified production, the higher-precedence current sources win.

## Operating architecture

SD.Live is a Control Center made of focused workspaces rather than one monolithic Admin page:

- `/admin/` — lightweight Dashboard / system overview + Show Day Visual QA;
- `/admin/finance/` — read-only Finance analytics/workflow over Google Sheets `REGISTRO`, with the approved narrow third-party payment fact write;
- `/admin/calendar/` — Calendar / Operations over the same `REGISTRO`, including controlled create and Google sync;
- `/admin/calendar/site-schedule/` — website-only Site Schedule / Show Day / Location state in D1;
- `/admin/editor/` — Site Editor / CMS using D1 + R2;
- `/admin/documents/` — **current Active Gate**, dedicated signed-document registry/generator with its own private storage boundary.

All remain behind Cloudflare Access.

## Source-of-truth guardrails

- Google Sheets `REGISTRO` remains operations/finance persistence + formula owner.
- AppSheet **SD.Live Track** remains the mobile/offline Finance workflow client.
- D1 does not become a Finance mirror.
- General Documents integration with Finance is read-only in v1.
- Documents prefill uses contractual `Valor bruto`, not owner-management metrics.
- D1 `site_schedule_state` owns website-only split blocks / Show Day / Location.
- Google Calendar is a secondary projection/read-only overlay, not operational truth.
- Rental pricing, availability rules and quote math remain backend-owned.
- Formula-owned Sheet columns are never written by generic Admin forms.
- Generic Finance write-back remains blocked except for already-approved bounded actions.
- Issued document snapshots/numbers are immutable and live outside the Finance source of truth.

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

### 13. Availability / Lead / Assistant foundations — ✅ CLOSED/PASS
Availability Core v1, Lead Core and the public Assistant rollout are operational. WhatsApp owner control code is merged but its live Meta/Cloudflare rollout remains intentionally paused.

### 14. Finance third-party + owner-money reconciliation — ✅ CLOSED/PASS
Structured third-party obligations/payment operations, owner-money management semantics, registered payment history and Overview/Third parties tabs are production-verified through PR #258; documentation reconciliation closed in PR #259.

## Current Active Gate — SD.Live Documents v1

Canonical contract:

`docs/roadmap/sdlive-documents-v1.md`

Documents v1 creates a reusable signed-document foundation instead of a one-off PDF button.

Initial document kinds:

- Cuenta de cobro · Colombia · ES;
- Invoice · International · EN.

Core product properties:

- legal issuer v1 = Samuel David Llano Muñoz;
- optional/discreet `sd•live · Creative Audio` branding, removable if it confuses the legal issuer;
- every draft field editable;
- Preview before issue;
- automatic signature only on final artifact;
- immutable finalized snapshot;
- system-controlled sequential numbering;
- permanent registry;
- private D1/R2 storage boundary;
- read-only Finance prefill;
- future Quote/Cotización reuse of the same engine.

### Numbering transition

Historical Cuenta de cobro numbering was client-scoped. New Documents v1 accounts intentionally switch to a **global per-issuer series** for stronger traceability:

- `samuel:CC` begins at 21 after test-series validation/explicit bootstrap;
- `samuel:INV` continues the existing global invoice series at 19.

Historical numbers remain unchanged as legacy and are never re-used or renumbered.

### Documents implementation order

0. Docs / Active Gate.
1. Storage foundation.
2. Domain + atomic numbering.
3. Issuer/client profiles + private signature + sequence setup.
4. Draft editor + preview + v1 templates.
5. Finalize + signed PDF + private artifact flow.
6. Finance read-only prefill/linking.
7. Reissue with PO + registry completion.
8. Approved legacy import.

No PR implicitly creates production storage or consumes real document numbers. Those remain explicit operational steps.

## Later eligible workstreams

Documents v1 is currently selected. The following remain eligible after this gate or if Documents is explicitly paused:

1. Rental real-time availability / double-booking protection.
2. Quote/Cotización kinds on the Documents foundation.
3. Mobile Rental Cart total/sticky summary.
4. SD.Live Patch.
5. Controlled Calendar edit/workflow additions.
6. CRM / Admin Inbox / Workspace association.
7. Finance cleanup and analytics debt.
8. PILA estimator research/planning when deliberately selected.

## Availability-Aware Contact / AI relationship

Availability/AI is closed as a foundation and must not silently gain ownership over unrelated domains.

Its architectural boundary remains:

`Public site / WhatsApp → SD.Live-owned availability + validation boundary → optional AI provider → existing lead/contact handoff`

The AI layer may qualify and route leads, but it must not own or invent:

- Rental prices/catalog/inventory availability;
- finance/control-center data;
- project history or capabilities not grounded in approved sources;
- owner availability state.

Owner availability remains SD.Live-owned state.

## Billing/reminder follow-up

Issue #83 still covers the AppSheet/reminder alignment around canonical `Fecha fin`. Notification delivery hardening may add email/WhatsApp channels later, but reminder conditions must remain sourced from the same approved finance rules.

Documents v1 does not replace or alter those reminder/payment workflows.

## Next-action rule

For Documents v1:

1. inspect current `main` + `PROJECT_STATUS.md` + `docs/roadmap/sdlive-documents-v1.md`;
2. implement exactly one planned PR scope;
3. tests/CI green;
4. squash merge under the owner's standing merge authorization when scope is correct;
5. run exactly one representative production smoke for runtime work when the plan calls for it;
6. keep production-sensitive resource creation/bootstrap actions explicit and separate.

**Stability > novelty.** Closed gates are not repeated without regression evidence.
