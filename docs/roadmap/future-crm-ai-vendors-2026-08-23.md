# SD.Live — future CRM + AI vendor evaluation

**Recorded:** 2026-08-23 — America/Bogota  
**Status:** **ELIGIBLE EVALUATION BACKLOG — NOT ACTIVE**

## Why this exists

Preserve two external products the user wants considered without changing current source-of-truth boundaries. The former Admin/public stabilization prerequisite is now satisfied; Attio and Dapta.ai remain candidates rather than automatic implementation choices.

The master backlog already names Dapta.ai as the current AI-chatbot candidate. This note adds a concrete commercial/technical evaluation frame for **Attio** and **Dapta.ai**, including current pricing snapshots and integration questions.

Pricing and product capabilities change. Re-check official vendor pages immediately before any purchase or implementation.

---

## 1. Attio — CRM candidate

### Candidate role

Potential CRM / relationship layer for:

- leads;
- clients / contacts / companies;
- opportunities / pipeline;
- follow-up history;
- web-form and Rental-request association;
- future sales automation.

Attio should be compared against building a bespoke CRM module inside SD.Live. Do not assume either option wins before total cost, workflow fit and portability are measured.

### Current public pricing snapshot — checked 2026-08-23

Official Attio pricing currently shows:

- **Free:** USD 0 / user / month, up to 3 seats;
- **Plus:** USD 44 / user / month billed monthly, or USD 35 / user / month billed annually;
- **Pro:** USD 99 / user / month billed monthly, or USD 79 / user / month billed annually;
- **Enterprise:** custom quote.

Attio also uses seat/workspace credits and sells additional workspace-credit packs, so headline seat price must not be treated as total operating cost.

Official source to re-check: `https://attio.com/pricing`

### Integration feasibility

Attio currently documents:

- a public REST API;
- OAuth 2.0;
- webhooks;
- filtered real-time webhook subscriptions;
- record create/update events suitable for sync/automation.

Official docs to re-check:

- `https://docs.attio.com/rest-api/overview`
- `https://docs.attio.com/rest-api/guides/webhooks`

### Questions before adoption

- Is Free or Plus sufficient for a solo/small-team SD.Live operation?
- What is the real annual cost after credits/automation usage?
- Should Attio own only lead/client/opportunity state, or more?
- How should Contact and Rental requests map into Attio without duplicating D1 records unnecessarily?
- Does native email/calendar sync reduce the need for a custom Admin inbox/CRM?
- What are export/migration guarantees if SD.Live leaves Attio later?
- What rate limits, webhook delivery guarantees and retry semantics matter for Cloudflare integration?
- Would a thin Cloudflare-owned adapter preserve vendor portability better than direct browser/vendor coupling?

### Source-of-truth guardrails

If Attio is adopted later:

- **Google Sheets `REGISTRO` remains finance/operations source-of-truth unless a separately approved migration changes that.**
- Attio must not become a second owner of formula-calculated finance fields.
- Attio must not write formula-owned Sheets columns.
- D1 Site Schedule remains website-presentation state, not CRM data.
- AppSheet SD.Live Track remains the mobile/offline workflow until deliberately replaced.

---

## 2. Dapta.ai — AI chat / agent / automation candidate

### Candidate role

Potential layer for:

- website AI chat;
- lead qualification;
- bilingual EN/ES first-response handling;
- voice/text AI agents where useful;
- follow-up automation;
- routing qualified leads into a future CRM;
- human handoff to Contact / Rental / WhatsApp.

Dapta must never become authoritative for rental pricing, inventory availability, project history or other deterministic business facts that SD.Live already owns elsewhere.

### Current public pricing snapshot — checked 2026-08-23

Dapta's current public pages are not fully consistent with one another, so exact packaging must be re-verified before purchase. Current official pages consistently expose these paid tiers:

- **Pro:** USD 99 / month, 100k credits, unlimited agents/flows, 5 users, 5 workspaces;
- **Scale Up:** USD 499 / month, 500k credits and premium assistance;
- **Prime:** USD 1,499 / month, 1.5M credits and advanced support;
- **Custom:** sales quote.

A Free tier is also advertised, but public pages currently show differing Free/Lite credit/package details. Treat those details as volatile rather than an architectural assumption.

Official sources to re-check:

- `https://dapta.ai/es/pricing/`
- `https://dapta.ai/es/`

### Integration feasibility

Dapta currently advertises:

- 1,000+ integrations;
- CRM integrations including HubSpot and Salesforce;
- API-based integrations;
- outbound webhooks for events such as completed voice calls and triggered workflows.

Official sources to re-check:

- `https://dapta.ai/es/integrations/`
- `https://docs.dapta.ai/integrations/webhook-set-up`

A direct Attio integration was **not confirmed** in this 2026-08-23 review. If Attio + Dapta are both adopted later, verify whether a native connector exists then; otherwise evaluate REST/webhook middleware through an SD.Live-owned Cloudflare API boundary.

### Questions before adoption

- Real cost per qualified lead / conversation / minute, not just plan price.
- Quality of EN/ES responses for SD.Live's actual service language.
- Mobile embed quality, performance and accessibility.
- Consent/privacy implications before loading a third-party chat script.
- Transcript retention, export and deletion controls.
- Hallucination controls and grounded knowledge sources.
- Human handoff quality to email, WhatsApp, Contact and Rental.
- Spam/abuse controls.
- CRM deduplication and field mapping.
- Whether Dapta creates CRM records directly or submits through an SD.Live-owned validation endpoint.
- Fallback behavior if Dapta is unavailable.

---

## 3. Possible future architecture — evaluate, do not assume

A plausible pattern to evaluate later:

`Public site → SD.Live Worker/API boundary → Dapta.ai and/or Attio`

Why keep the SD.Live boundary:

- validation and consent;
- deduplication;
- rate limiting / abuse controls;
- stable internal field names;
- logging/auditability;
- vendor portability;
- protection against accidental writes into finance/source-of-truth systems.

Do not implement this pattern merely because it is documented. Compare it against simpler direct/native integrations and total annual operating cost when CRM/AI becomes active work.

---

## 4. Promotion criteria

Do not promote Attio or Dapta into Active Gate until:

1. deliberately select CRM/AI or Availability-Aware Contact as active work (the prior visual/admin stabilization prerequisite is already satisfied);
2. CRM ownership and required entities are defined;
3. actual expected lead/contact/conversation volume is estimated;
4. annual vendor cost is compared with native SD.Live implementation/maintenance cost;
5. data/privacy/consent requirements are reviewed;
6. integration boundaries with D1, Google Sheets/AppSheet, Gmail/Workspace and Rental are explicit;
7. a rollback/export strategy exists.
