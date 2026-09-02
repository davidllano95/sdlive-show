# Availability-Aware Contact / AI

**Reconciled:** 2026-09-02 — America/Bogota  
**Availability status:** **CORE v1 CLOSED/PASS**  
**Lead Core status:** **CLOSED/PASS through PR #190**  
**Current Active Gate:** **SD.Live Assistant rollout**

Availability is a deterministic SD.Live-owned production capability. The Assistant consumes it; it does not own Availability truth.

## Availability production contract

Effective states:

- `available`
- `limited`
- `away`

Public API:

- `GET /api/availability`

Protected Admin API:

- `GET /api/admin/availability`
- `PUT /api/admin/availability`

Precedence:

1. Backend Force Mode — `Auto / Force On / Force Off`.
2. Temporary operational override — `Auto / Available / Limited / Away`.
3. Weekly service schedule.
4. Compatibility default before first deliberate schedule save.

Availability Core v1 includes multiple weekly windows, closed days, bounded 15m–24h temporary status, explicit Apply semantics, Travel Mode, timezone-safe evaluation, deterministic next service window including DST, privacy-safe public WhatsApp status and the transport-neutral owner command parser.

**Availability is CLOSED/PASS. Do not reopen it unless a regression appears.**

Checkpoint: `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`.

## Lead Core production contract

Lead Core uses the existing D1 `leads` source of truth. Do not create another Lead table.

Canonical executable statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Historical `qualified / won / archived` are not current executable statuses.

Relevant sources:

- `contact`
- `rental`
- `assistant`

Canonical service categories:

- `live`
- `theatre`
- `sound_design`
- `systems`
- `rental`
- `other`

PR #190 is **MERGED / CI PASS / PRODUCTION SMOKE PASS**. Auditable Lead status history is closed and production-verified.

## SD.Live Assistant architecture

Name: **SD.Live Assistant**.

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

The Assistant must identify itself as an assistant and must never impersonate Samuel.

### Required behavior

- EN/ES.
- Classify `Live / Theatre / Sound Design / Systems / Rental / Other`.
- Collect only useful structured lead slots.
- Consult deterministic Availability Core.
- Resolve Rental data through the backend-owned deterministic Rental boundary.
- Answer only from approved business/service knowledge.
- Require explicit product-owned privacy consent before Lead capture.
- Create one normalized Lead in existing Lead Core.
- Generate a useful human handoff and notification.

### Hard guardrails

The Assistant must never:

- invent or negotiate prices;
- promise Availability without deterministic backend confirmation;
- invent Rental inventory availability;
- become a second Rental catalog/pricing source;
- read/write Finance;
- invent credits, capabilities or policies;
- self-authorize privacy consent;
- persist full conversation transcripts;
- expose owner phone, secrets, tokens or provider bodies;
- let public requests migrate D1 schema;
- use provider-side conversation state as SD.Live source of truth.

OpenAI boundary:

- Responses API;
- Structured Outputs;
- strict JSON schema;
- `store: false`;
- server orchestrator owns Availability, Rental, consent, Lead writes, notifications, logging and idempotency;
- no arbitrary model-controlled tools.

## Current rollout state

### PR #214 — read-only storage preflight

**OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS.**

- Branch: `preflight/assistant-storage-readonly`.
- Head: `f5413158770254061d8b02a1d2c5113117fe5c0e`.
- Tests #581 PASS.
- Endpoint: authenticated `GET /api/admin/assistant/preflight`.
- Read-only metadata inspection only.
- Checks `leads`, `privacy_consents`, `assistant_effect_reservations`.
- Fails closed on incompatible legacy constraints, missing canonical columns/indexes, required legacy email or unknown schema.

**This is the next technical rollout slice.**

### PR #216 — controlled storage preparation

**OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS.**

- Base: PR #214 branch, not `main`.
- Head: `3ac0338a7896a7429316773dafe73bdf0e767025`.
- Tests #596 PASS.
- Admin-only `POST /api/admin/assistant/storage-prepare`.
- Exact confirmation `PREPARE_ASSISTANT_STORAGE` required.

Use only if the real #214 production preflight reports supported safe gaps. Do not use for blocked/unknown `leads` constraints.

### PR #213 — backend

**OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS / NOT PRODUCTION.**

- Head: `cce1144f8336d22cafe2a9b200de93152bd6bea2`.
- Tests #594 PASS.
- Consolidates preparatory work from #192–#212.
- Includes strict model contract, deterministic tool boundaries, sealed session, consent, Turnstile, rate limiting, idempotency, Lead capture, Resend handoff, provider boundary, orchestration and `/api/assistant`.
- Public kill switch `ASSISTANT_PUBLIC_ENABLED` is OFF unless exactly `true`.
- Admin readiness endpoint: `GET /api/admin/assistant/readiness`.
- Public runtime never performs schema migration.

Do not merge before storage and runtime readiness are proven with public flag OFF.

### PR #215 — public widget

**OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS / NOT PRODUCTION.**

- Base: #213 branch.
- Head: `901961c11b9cd22ebf14cee251e4129b2e2c1be2`.
- Tests #595 PASS.
- Contact-section launcher, desktop modal/mobile bottom sheet, EN/ES, explicit Turnstile, in-memory-only conversation, sealed session and explicit consent UI.
- Widget requires `ASSISTANT_PUBLIC_ENABLED=true` and valid Turnstile site key.

Do not integrate until #213 is deployed and smoke-tested with flag OFF.

### PR #218 — temporary integration validation

**CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY / PASS.**

Tests #598 proved #213 + #214 + #216 + shared routing can coexist without weakening runtime guardrails. Do not reopen or merge #218.

## Assistant storage and privacy boundary

Canonical Assistant-related storage contracts:

1. `leads`
2. `privacy_consents`
3. `assistant_effect_reservations`

Session:

- no transcript persistence;
- structured slots only;
- AES-GCM sealed browser token;
- browser cannot alter authenticated session state;
- browser does not choose authoritative session identity;
- no `previous_response_id` dependency;
- SD.Live owns state.

Consent:

- explicit product action only;
- model cannot self-assert consent;
- consent timestamp is evidence but not part of logical idempotency identity;
- completed retries return existing Lead instead of duplicating PII.

Lead capture effect is atomic across Lead + idempotency completion + privacy consent using D1 transactional batch.

## Rental boundary

Rental pricing/quote logic remains backend authoritative.

- no model price calculation;
- deterministic aliases only;
- unknown/ambiguous products fail closed;
- no fuzzy substitution;
- inventory availability remains unknown unless deterministic backend says otherwise;
- cart is a quote request, not checkout.

## Public entry-point contract

The existing floating WhatsApp control remains the only persistent floating CTA.

The Assistant widget is prepared as a launcher inside Contact rather than a second permanent floating bubble.

Existing Contact/Rental/WhatsApp fallbacks must continue to work if OpenAI, Turnstile or the Assistant runtime fails.

## Separate WhatsApp owner transport — PR #191

PR #191 remains **OPEN / UNMERGED / MERGEABLE** and separate from the Assistant rollout.

It prepares Meta WhatsApp Cloud API transport for verified-owner Availability commands with signature verification, exact phone-number target validation, owner allowlisting, message-id idempotency and the existing canonical Availability write path.

No AI, Finance or Leads coupling. Real Meta/Cloudflare configuration is required before smoke.

## Exact continuation

After the current docs-only reconciliation is merged:

1. reverify PR #214 against resulting `main`;
2. squash merge #214 if still clean;
3. wait for CI/deploy;
4. request exactly one owner manual action: authenticated `GET /api/admin/assistant/preflight` in production;
5. stop and interpret the actual D1 result;
6. do not touch #216/#213/#215 until that result is known.
