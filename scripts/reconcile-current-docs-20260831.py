from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path, old, new, label):
    text = read(path)
    if old not in text:
        raise RuntimeError(f"{label}: expected text not found in {path}")
    text2 = text.replace(old, new, 1)
    write(path, text2)


# PROJECT_STATUS.md
p = "PROJECT_STATUS.md"
replace_once(
    p,
    "| `main` al reconciliar | **PR #154 · `aacc0a60af70b9b85c8c61eb74216f1db6d329f3`** |",
    "| `main` al reconciliar | **PR #157 · `74b5eaed01ed324b7f5f1af82dea27721a3b5509`** |",
    "project baseline",
)
replace_once(
    p,
    "| Paso manual inmediato | **Seleccionar el siguiente módulo del roadmap. `SD.Live Patch` está documentado y elegible, pero no está activado automáticamente.** |",
    "| Paso manual inmediato | **Seleccionar deliberadamente el siguiente módulo. `Availability-Aware Contact / AI`, `SD.Live Patch`, Calendar workflow, Finance Document Generator y Rental availability son candidatos elegibles; ninguno está activado automáticamente.** |",
    "project next step",
)
replace_once(
    p,
    "- **PR #154:** the two visible BetaThree PA units are one canonical CMS media composition; one source/scale/X/Y control updates both units together.\n",
    "- **PR #154:** the two visible BetaThree PA units are one canonical CMS media composition; one source/scale/X/Y control updates both units together.\n- **PR #157:** Rental image-editor parity was repaired across standard equipment, PA and Production Tools; Replace/Library/size/X/Y now use the real public image containers, and published framing uses the same semantics as Admin preview. Issue #156 closed after production PASS on Event Labeler, BetaThree PA and Behringer WING.\n",
    "project PR157 closeout",
)
replace_once(
    p,
    "- Rental/PA is correctly sized/aligned; the user adjusted PA in CMS, saved, published, and confirmed the result on both desktop and mobile;\n",
    "- Rental/PA is correctly sized/aligned; the user adjusted PA in CMS, saved, published, and confirmed the result on both desktop and mobile;\n- Rental image controls are production-verified on a Production Tool (Event Labeler), synchronized PA pair and standard equipment card (Behringer WING); Save Draft/Publish parity is accepted through PR #157 / issue #156;\n",
    "project rental smoke",
)
replace_once(
    p,
    "### Other future items\n\n- SD.Live Patch — documented future patch-sheet/signal-flow/show-documentation workspace, now eligible for prioritization but not automatically active;",
    "### Other future items\n\n- Availability-Aware Contact / AI — documented 3-layer owner availability model (manual away, travel mode, weekly service hours) with human WhatsApp when reachable and AI qualification/handoff when unavailable; eligible for prioritization, not active;\n- SD.Live Patch — documented future patch-sheet/signal-flow/show-documentation workspace, now eligible for prioritization but not automatically active;",
    "project future availability",
)
replace_once(
    p,
    "- `docs/checkpoints/handoff-public-audit-closeout-2026-08-31.md` — latest checkpoint and exact continuation after closing #124.",
    "- `docs/checkpoints/handoff-current-state-2026-08-31.md` — latest checkpoint after PR #157 / issue #156 and roadmap reconciliation.\n- `docs/checkpoints/handoff-public-audit-closeout-2026-08-31.md` — historical checkpoint after closing #124.",
    "project latest checkpoint",
)
replace_once(
    p,
    "2. **Public post-integration stabilization is CLOSED/PASS through PR #154**; issue #124 is completed. Do not repeat its representative smoke unless a new regression appears.",
    "2. **Public post-integration stabilization remains CLOSED/PASS; Rental image-editor parity is additionally CLOSED/PASS through PR #157 / issue #156.** Do not repeat those smoke sequences unless a new regression appears.",
    "project continuation",
)
replace_once(
    p,
    "4. **No stabilization gate is active.** Deliberately select the next roadmap module before starting implementation. `SD.Live Patch` is documented and eligible, but not automatically active.",
    "4. **No stabilization gate is active.** Deliberately select the next roadmap module before starting implementation. `Availability-Aware Contact / AI` and `SD.Live Patch` are both documented and eligible; neither is automatically active.",
    "project continuation candidates",
)

# README.md
p = "README.md"
replace_once(
    p,
    "- Public post-integration visual stabilization — **CLOSED/PASS through PR #154**; issue #124 completed after representative desktop/mobile production smoke.\n- **Current gate:** no stabilization gate is active; deliberately select the next roadmap module before starting implementation.",
    "- Public post-integration visual stabilization — **CLOSED/PASS**; issue #124 completed after representative desktop/mobile production smoke.\n- Rental image-editor parity — **CLOSED/PASS through PR #157**; issue #156 completed after production smoke on Event Labeler, synchronized BetaThree PA and Behringer WING.\n- **Current gate:** no stabilization gate is active; deliberately select the next roadmap module before starting implementation.",
    "readme current state",
)
replace_once(
    p,
    "The exact current continuation point lives in `PROJECT_STATUS.md` and `docs/checkpoints/handoff-public-audit-closeout-2026-08-31.md`.",
    "The exact current continuation point lives in `PROJECT_STATUS.md` and `docs/checkpoints/handoff-current-state-2026-08-31.md`.",
    "readme checkpoint",
)
replace_once(
    p,
    "- Rental PA uses one canonical CMS image/framing control for the two visible BetaThree units; source, scale and X/Y framing remain synchronized as one composition.",
    "- Rental PA uses one canonical CMS image/framing control for the two visible BetaThree units; source, scale and X/Y framing remain synchronized as one composition.\n- Rental image editing is parity-verified across standard cards and Production Tools: Replace/Library, size and X/Y act on the real public image containers, while Save Draft/Publish retain the same presentation semantics.",
    "readme cms rental parity",
)
replace_once(
    p,
    "Final user production acceptance after PRs #152–#154 confirmed:",
    "Final user production acceptance after PRs #152–#157 confirmed:",
    "readme acceptance range",
)
replace_once(
    p,
    "- Trusted By mobile glow is present.\n\nDo not restart the public visual audit unless a new regression appears.",
    "- Trusted By mobile glow is present;\n- Event Labeler, BetaThree PA and Behringer WING image controls respond correctly in Site Editor, and the Labeler change was saved/published successfully.\n\nDo not restart the public visual audit or Rental image-editor smoke unless a new regression appears.",
    "readme rental acceptance",
)
replace_once(
    p,
    "## Future roadmap highlights\n\n- `docs/roadmap/sdlive-control-center.md`: includes the documented future **SD.Live Patch** direction; Patch is eligible for prioritization but is not automatically active.",
    "## Future roadmap highlights\n\n- `docs/roadmap/availability-aware-contact-widget.md`: **Availability-Aware Contact / AI** is eligible for prioritization now that stabilization is closed. It combines weekly service hours, travel mode and expiring manual away overrides, then routes to human WhatsApp or an AI qualification/handoff surface without giving AI pricing/finance authority.\n- `docs/roadmap/sdlive-control-center.md`: includes the documented future **SD.Live Patch** direction; Patch is eligible for prioritization but is not automatically active.",
    "readme future availability",
)
replace_once(
    p,
    "- `PROJECT_STATUS.md` — exact current status and continuation point.\n- `docs/checkpoints/handoff-public-audit-closeout-2026-08-31.md` — latest handoff after closing the public post-integration audit.",
    "- `PROJECT_STATUS.md` — exact current status and continuation point.\n- `docs/checkpoints/handoff-current-state-2026-08-31.md` — latest handoff after PR #157 / issue #156 and roadmap reconciliation.\n- `docs/checkpoints/handoff-public-audit-closeout-2026-08-31.md` — historical handoff after closing the public post-integration audit.",
    "readme relevant docs",
)
replace_once(
    p,
    "Admin stabilization is **closed/PASS through PR #150** and issue #126 is completed. Public post-integration stabilization is **closed/PASS through PR #154** and issue #124 is completed. Finance PR #141 remains production-smoked PASS.\n\n**No stabilization gate is active.** Select the next roadmap module deliberately; `SD.Live Patch` is documented and eligible for prioritization but is not automatically active. Generic Finance Phase 3 write-back remains blocked.",
    "Admin stabilization is **closed/PASS through PR #150** and issue #126 is completed. Public post-integration stabilization remains **closed/PASS**, and Rental image-editor parity is **closed/PASS through PR #157 / issue #156**. Finance PR #141 remains production-smoked PASS.\n\n**No stabilization gate is active.** Select the next roadmap module deliberately. `Availability-Aware Contact / AI` and `SD.Live Patch` are documented and eligible candidates; neither is automatically active. Generic Finance Phase 3 write-back remains blocked.",
    "readme immediate continuation",
)

# ROADMAP_MASTER_CHECKLIST.md — keep historical detail, reconcile current banners and known stale flags.
p = "ROADMAP_MASTER_CHECKLIST.md"
replace_once(p, "Last reconciliation: **2026-08-22 — America/Bogota**", "Last reconciliation: **2026-08-31 — America/Bogota**", "master date")
replace_once(
    p,
    "**Targeted correction — 2026-08-23:** Section 16 now reflects the verified production architecture: Show Day is automatic/dynamic from Site Schedule + America/Bogota date. An authenticated Admin-only manual override for QA/control is preserved as future backlog. Other historical status blocks in this reconciliation remain lower-precedence than `PROJECT_STATUS.md` and current code/production behavior.",
    "**Targeted correction — 2026-08-23:** Section 16 was reconciled to automatic Show Day architecture.\n\n**Current reconciliation — 2026-08-31:** Admin stabilization, public post-integration audit and Rental image-editor parity are CLOSED/PASS; issues #126, #124 and #156 are completed. Calendar controlled create, Site Schedule/Show Day and Google Calendar projection are operational. There is no active stabilization gate. Historical inline `F` markers below are retained only where useful as chronology and do not override `PROJECT_STATUS.md`. Availability-Aware Contact / AI and SD.Live Patch are both eligible for deliberate prioritization, but neither is automatically active.",
    "master correction banner",
)
replace_once(
    p,
    "🚧 **F — Control Center Step 6: read-only, Admin-only finance insights.** P3.4, Security, the finance audit, SD.Live Track rename and field/source-of-truth mapping are closed. The decision remains **repair + integrate; no rewrite**, preserving AppSheet offline capture and Google Sheets persistence/formulas. Availability/WhatsApp remains eligible as the explicit parallel track but is not active automatically.",
    "✅ **No active stabilization gate.** Finance read-only, Calendar create, Site Schedule/Show Day, Google Calendar integration, Admin stabilization, public visual closeout and Rental image-editor parity are production-verified. Select the next module deliberately. Availability-Aware Contact / AI and SD.Live Patch are documented eligible candidates; Generic Finance Phase 3 write-back remains blocked.",
    "master active gate",
)
replace_once(
    p,
    "**Status: 🚧 F — Step 6 read-only, Admin-only finance insights is active; Steps 1–5 are closed.** Audit evidence: `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md`; field map evidence: `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md`. Decision: repair + integrate, preserve AppSheet offline capture and Sheets ownership. Required order now is read-only Admin insights → validated later write-back/bidirectional phases. Availability/WhatsApp remains the sole explicit parallel-track exception and is eligible, not active automatically.",
    "**Status: ✅ current Control Center stabilization sequence CLOSED/PASS.** Finance read-only, Calendar create, Site Schedule/Show Day, Google Calendar projection and the detailed Admin/public stabilization passes are complete. Decision remains repair + integrate, preserving AppSheet offline capture and Sheets ownership. Availability-Aware Contact / AI is now a normal eligible roadmap candidate rather than an exception blocked behind the old sequence; it is not active automatically.",
    "master control center status",
)
replace_once(
    p,
    "- ⏳ Reject a request with **0 equipment + 0 services** in both frontend and backend; service-only requests remain valid when at least one service is selected.",
    "- ✅ Empty Rental requests are rejected; service-only requests remain valid when at least one service is selected.",
    "master rental empty guard",
)
replace_once(
    p,
    "- ⏳ **P3.0 finding:** public landings do not consistently include the Home WhatsApp CTA. Add it as a shared conversion-consistency improvement when promoted, preserving destination/tracking/safe-area behavior.",
    "- ✅ Public service/SEO landings now use the shared WhatsApp conversion path where applicable; preserve destination/tracking/safe-area behavior in future changes.",
    "master whatsapp landings",
)
replace_once(
    p,
    "- 🚧 **F active:** First SD.Live integration is read-only `/admin` insight via underlying Google Sheet/API, not an assumed AppSheet API layer.",
    "- ✅ First SD.Live Finance integration is the production-smoked read-only Admin workspace over the underlying Google Sheet/API; AppSheet remains the offline workflow client.",
    "master finance active stale",
)
replace_once(
    p,
    "## 16. Automatic Show Day Mode\n\n**Status: ✅/⏳ A/D — automatic/dynamic Show Day is production PASS; Admin override remains backlog.**",
    "## 16. Automatic Show Day Mode\n\n**Status: ✅ A — automatic/dynamic Show Day and the Admin-only QA override are production PASS.**",
    "master showday status",
)
replace_once(
    p,
    "- ⏳ Native Admin calendar.\n- ⏳ Google Calendar integration.\n- ⏳ AppSheet events.\n- ⏳ Projects.\n- ⏳ Rental availability.\n- ⏳ Date/equipment conflict detection.\n- ⏳ Client availability link if valuable.",
    "- ✅ Native Admin Calendar / Operations workspace.\n- ✅ Google Calendar secondary projection + read-only overlay.\n- ✅ REGISTRO/AppSheet source events represented in Calendar.\n- ⏳ Projects.\n- ⏳ Rental inventory availability.\n- ⏳ Date/equipment conflict detection.\n- ⏳ Client-facing availability link if valuable.",
    "master calendar status",
)
replace_once(
    p,
    "## P3.1 Consent Mode parity\n\n**Status: 🚧 F — active.**",
    "## P3.1 Consent Mode parity\n\n**Status: ✅ A — closed.**",
    "master p31 status",
)

# Rewrite stale sequence document as current architecture/sequence.
control_center = r'''# 14.5 — SD.Live as Control Center

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
'''
write("docs/roadmap/sdlive-control-center.md", control_center)

availability = r'''# Availability-Aware Contact / AI

**Reconciled:** 2026-08-31 — America/Bogota  
**Status:** **ELIGIBLE ROADMAP CANDIDATE — NOT ACTIVE**

The stabilization prerequisites that previously blocked this feature are now closed. This module may be deliberately selected next, but documentation alone does not activate runtime work.

## Problem

SD.Live currently offers the same contact surface regardless of whether the owner is realistically reachable. A visitor may write during sleep hours, an event, a flight or international travel and receive no immediate context. The goal is not to pretend the business is staffed 24/7; it is to give the visitor an accurate path at any time while preserving a strong human handoff.

## Core idea

Use one SD.Live-owned availability decision to choose the contact experience:

- **human reachable:** prioritize the normal WhatsApp path;
- **human unavailable:** offer an AI assistant that can answer approved general questions, qualify the lead, capture contact/scope and set an expectation for human follow-up;
- **always:** preserve Contact/Rental forms as deterministic fallbacks.

The AI provider must never become the source of truth for owner availability.

## 3-layer availability model

### Layer 1 — expiring manual override (highest priority)

For a show, flight, meeting, sleep, focused work or any short period where a normal weekly schedule is wrong.

Desired owner commands through the verified business WhatsApp transport:

- `away 2h`
- `away 4h`
- `away until 23:00`
- `away tomorrow`
- `back`
- `status`

Every away command must resolve to an explicit `expires_at`. Indefinite away state is not allowed.

**Authorization:** commands are accepted only when the sender exactly matches `env.OWNER_WHATSAPP_NUMBER` (or a later equally explicit authenticated owner identity). Other senders always enter the customer flow.

### Layer 2 — travel mode

For multi-day travel with a temporary timezone and end date. Travel mode owns its timezone only for availability resolution and automatically falls back when it expires.

Example conceptual state:

`Travel · Europe/Madrid · through 2026-09-21`

This avoids treating Bogotá business hours as if the owner were physically in Bogotá while traveling.

### Layer 3 — default weekly service hours

Baseline weekly schedule, initially evaluated in `America/Bogota` unless travel mode is active.

The exact hours are **business configuration**, not a hard-coded architectural invariant. Example only: 08:00–20:00.

A later Admin UI should allow controlled editing of:

- days enabled;
- start/end per day;
- timezone for the default schedule;
- optional short labels such as `Available`, `Limited response`, `AI assistant only`.

## D1 source of truth

Availability should remain SD.Live-owned. A reasonable model is:

```text
availability_profile
- default_timezone
- weekly_schedule_json
- updated_at

availability_override
- mode: manual_override | travel
- timezone
- starts_at
- expires_at
- reason
- created_by
- created_at
```

The resolver computes the effective current state. An expired override is ignored automatically rather than requiring cleanup before the site becomes available again.

Do not duplicate this state in Dapta, Attio, browser storage or another chatbot vendor.

## API surface

Candidate owned endpoints:

- `GET /api/availability` — public minimal status; no private reason/details required;
- authenticated Admin endpoints for weekly schedule / travel mode if a UI is added;
- WhatsApp owner-command branch before customer AI routing.

A public response could evolve beyond a boolean while staying privacy-safe:

```json
{
  "available": false,
  "mode": "ai_assist",
  "message": "AI assistant available now. Human follow-up during the next service window."
}
```

Do not expose travel itinerary, event names or private reasons publicly.

## Frontend behavior

The site should use the same resolved state across all public contact surfaces rather than implementing separate clocks in each page.

### Reachable

- WhatsApp remains the primary quick-contact CTA;
- optional small status copy such as `Available now` only if it improves conversion without creating a support-SLA promise.

### Unavailable

- AI assistant becomes the prominent immediate-response option;
- WhatsApp may remain available as a secondary `Leave a message` path rather than disappearing completely;
- Contact/Rental forms remain available;
- the UI should communicate an expectation, not a fake live-agent state.

## AI assistant contract

The assistant may:

- answer approved FAQ/service questions;
- work bilingually EN/ES;
- identify whether the request is Live / Theatre / Sound Design / Post / Systems / Rental / other;
- collect event/project date, city/location, approximate scope, audience/headcount when relevant, contact details and preferred follow-up;
- route to Contact vs Rental;
- create/update a lead through an SD.Live-owned validation endpoint;
- summarize the conversation for human follow-up.

The assistant must not:

- invent or negotiate prices;
- become authoritative for Rental catalog, quantities or availability;
- expose Finance/Admin data;
- promise a booking or availability unless a deterministic backend source explicitly confirms it;
- invent portfolio credits, capabilities or policies;
- retain the only copy of lead/transcript data inside a vendor.

## Lead ownership

AI-captured leads should enter the same SD.Live lead lifecycle as web-form leads. The provider may transport conversation data, but final normalized lead data should pass through an SD.Live-owned endpoint.

A later CRM may own relationship/pipeline state only after that contract is deliberately approved.

## Human handoff

A useful handoff should include:

- visitor name/contact;
- language;
- source page/market;
- service/request type;
- date/location;
- concise AI-generated summary grounded in the actual conversation;
- urgency signal only when derived from explicit visitor information;
- direct link/context to continue the conversation.

The assistant should say when it is handing off rather than pretending the AI and human are the same agent.

## Optional phase-2 ideas — not required for MVP

These are compatible extensions, not current commitments:

- **Next service window:** `Human follow-up from 08:00 America/Bogota` without revealing personal calendar detail.
- **Show Day awareness:** Site Schedule may inform a generic `limited response while on show` state, but should not automatically expose event/client details and should not override a manual owner decision without an explicit precedence rule.
- **Calendar busy assist:** Google Calendar could later contribute a coarse `busy` hint, but only after deciding which calendars/events are safe to consider; it must never publish private meeting content.
- **Lead follow-up timer:** if an AI-qualified lead has not received human follow-up by a defined threshold, surface it in Admin/CRM or send an internal reminder.
- **Client availability link:** a controlled public link could show selectable callback/meeting windows without exposing the private operational calendar.
- **Channel routing:** Colombia may prefer WhatsApp; international visitors may prefer email/web chat. Market can influence CTA ordering without changing availability truth.
- **Status history/analytics:** measure qualified leads, handoff rate, response delay and conversion by available/unavailable state without turning availability into employee surveillance.

## Acceptance criteria for an MVP

- [ ] D1 migration defines one canonical availability model.
- [ ] Weekly schedule resolves correctly by timezone/day.
- [ ] Manual overrides require explicit expiry and auto-expire.
- [ ] Travel mode expires and falls back correctly.
- [ ] `GET /api/availability` is privacy-safe and reflects effective state.
- [ ] Owner WhatsApp commands are authenticated by exact owner identity before parsing.
- [ ] Public UI follows the same availability API on all relevant route families.
- [ ] Human-reachable and unavailable/AI states have clear Contact/Rental fallbacks.
- [ ] AI cannot invent price/catalog/availability/portfolio facts.
- [ ] AI receives no Finance/Control Center data.
- [ ] AI-qualified leads pass through an SD.Live-owned validation/storage boundary.
- [ ] Human handoff is tested end-to-end in EN and ES.
- [ ] Consent/privacy/script-loading behavior is reviewed before a third-party chat embed loads.
- [ ] Provider outage fails to Contact/Rental/WhatsApp rather than blocking lead capture.

## Provider dependency

Dapta.ai is a documented candidate, not an architectural requirement. Before selecting a provider, re-check current pricing, API/webhook behavior, WhatsApp transport, privacy/retention, transcript export/deletion, mobile performance, accessibility and human handoff quality.

The preferred architecture remains provider-portable:

`Public site / WhatsApp → SD.Live Worker/API boundary → optional AI provider → SD.Live lead/handoff boundary`

## Sequencing

All previous stabilization prerequisites are satisfied. To promote this module:

1. choose it explicitly as the next Active Gate;
2. verify actual WhatsApp provider/webhook architecture;
3. decide MVP weekly schedule + override data model;
4. decide whether AI is web-only first or web + WhatsApp in the same phase;
5. re-evaluate provider cost/privacy/quality;
6. implement availability truth before allowing AI to depend on it;
7. production-smoke owner override, reachable/unavailable UI and one real lead handoff.
'''
write("docs/roadmap/availability-aware-contact-widget.md", availability)

# future CRM/AI vendor note: current status + satisfied stabilization prerequisite.
p = "docs/roadmap/future-crm-ai-vendors-2026-08-23.md"
replace_once(p, "**Status:** **BACKLOG / EVALUATE LATER — NOT ACTIVE**", "**Status:** **ELIGIBLE EVALUATION BACKLOG — NOT ACTIVE**", "vendor status")
replace_once(
    p,
    "Preserve two external products the user wants considered in the future without moving them ahead of the current Post-Integration Visual Audit or changing current source-of-truth boundaries.",
    "Preserve two external products the user wants considered without changing current source-of-truth boundaries. The former Admin/public stabilization prerequisite is now satisfied; Attio and Dapta.ai remain candidates rather than automatic implementation choices.",
    "vendor why",
)
replace_once(
    p,
    "1. the current visual/admin stabilization gate is closed;\n2. CRM ownership and required entities are defined;",
    "1. deliberately select CRM/AI or Availability-Aware Contact as active work (the prior visual/admin stabilization prerequisite is already satisfied);\n2. CRM ownership and required entities are defined;",
    "vendor promotion",
)

# New latest checkpoint.
checkpoint = r'''# SD.Live — current-state handoff after Rental editor closeout

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
'''
write("docs/checkpoints/handoff-current-state-2026-08-31.md", checkpoint)

print("Documentation reconciliation applied.")
