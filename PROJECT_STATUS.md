# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-03 — America/Bogota** |
| Base de PR #246 | **`a5bffc66e711af23f2df01cd440aa0d43344d632`** |
| Runtime baseline verificado | **`c52a06603c0a6b5cd0cc4425cca11f69cce693d7` · PR #244** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant operational** |
| Active Gate | **PR #246 — reconstructed verified-owner WhatsApp control for Availability; OPEN / UNMERGED / CI RED** |
| Public Assistant | **ON / CLOSED-PASS — `ASSISTANT_PUBLIC_ENABLED=true`** |
| Siguiente workstream | **#246 WhatsApp owner control → Rental real-time availability/double-booking → mobile Rental cart → quote/PDF foundation** |
| Bloqueado | **Generic Finance Phase 3 write-back** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. checkpoint/handoff fechado más reciente;
4. este archivo;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. docs/prompts históricos.

**Stability > novelty.** `MERGED` no implica `PRODUCTION SMOKE PASS`; `CI PASS` no implica producción verificada; `UNMERGED` significa no producción.

## Workflow obligatorio

Runtime: `inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only: `branch → docs → CI → PR → squash merge`. No production smoke para docs-only.

QA manual con owner: **una sola acción por vez**.

## Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = barrera real del Admin.
- Google Sheets `REGISTRO` = operations/finance persistence + formulas.
- AppSheet SD.Live Track = mobile/offline workflow.
- D1 no es Finance mirror.
- Rental pricing/quote logic = backend authoritative.
- Availability = D1 Availability Core, no AI-owned truth.
- Leads = una sola Lead Core D1 source of truth.
- Assistant no crea un segundo catálogo Rental ni un segundo Lead store.
- Assistant no lee/escribe Finance.
- Public traffic nunca debe migrar D1 schema desde rutas públicas.
- Owner phone/secrets/tokens permanecen server-side.
- Assistant usa OpenAI Responses API + strict Structured Outputs + `store:false`.
- La sesión Assistant es stateless y sellada con AES-GCM; no se persiste transcript completo.
- Turnstile se exige para iniciar una sesión nueva; después, la sesión sellada autenticada sustituye verificaciones repetidas sin relajar el rate limit ni el backend gate.
- Consentimiento de privacidad es explícito y product-owned; nunca se infiere.

# CLOSED / PASS

## Availability Core v1

**CLOSED/PASS.** No reabrir salvo regresión.

## Lead Core

**CLOSED/PASS through PR #190.** Canonical statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`. Relevant sources: `contact`, `rental`, `assistant`. Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

## Assistant storage/backend/runtime

**CLOSED/PASS IN PRODUCTION.** Storage, `privacy_consents`, `assistant_effect_reservations`, Lead Core integration, `/api/assistant`, dedicated rate limit, sealed session, deterministic tools, explicit consent, idempotent Lead capture and Resend handoff are operational.

Key foundation PRs:

- #224 — final Assistant storage preparation;
- #225 — backend/runtime integration;
- #228 — public widget;
- #231 — Safari post-turn recovery;
- #235 — Turnstile once per Assistant session;
- #236/#237 — messaging-shell redesign + SD.Live palette/layout correction;
- #238/#239 — inline security confirmation + official SD.Live avatar;
- #240 — deterministic `venue=TBD` persistence;
- #241 — Enter sends / Shift+Enter newline;
- #242 — hardened consent → Lead draft boundary;
- #243/#244 — deterministic Rental fail-closed boundaries, including valid-item repeated-tool recovery.

Old preparatory PRs #192–#212, old #213/#215/#216 and temporary #218 remain closed/superseded. Do not reopen them.

## Assistant rollout — FINAL PRODUCTION CLOSEOUT 2026-09-03

**CLOSED / PRODUCTION PASS.** Detailed checkpoint: `docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md`.

Verified production behavior:

- public Assistant enabled and first real provider turn succeeds;
- Safari multi-turn/session continuity PASS;
- `venue=TBD` remains authoritative and is not re-asked;
- Enter → Send and Shift+Enter newline behavior PASS;
- Turnstile appears as an inline `Security check`, confirms `Verified`, and is required only for the new Assistant session;
- desktop chat shell PASS: compact header, one central scroll owner, inline consent, composer anchored bottom, SD.Live violet palette;
- mobile layout + mobile interaction PASS in Spanish;
- consent is never inferred from name/contact/follow-up intent;
- Data authorization UI fully visible and explicit;
- exactly one QA Assistant Lead created: **Lead #26 / Samuel / `samuel.qa@example.com` / source Assistant / service Theatre / status New**;
- Lead #26 persisted with `2026-10-17`, Bogotá and venue `TBD` and is visible in Admin;
- consent persistence PASS: Lead + consent + idempotency effect are atomic and success requires consent write;
- Resend/handoff notification PASS to `hello@sdlive.show`;
- reload/idempotency PASS: no duplicate Samuel Lead was created;
- deterministic Availability PASS: Assistant returned `available + WhatsApp`, matching the public Availability widget;
- Rental over-limit PASS: 3x Waves LV1 Classic rejected against catalog max 2, with no invented price/inventory;
- Rental unknown-item PASS: Yamaha DM7 not silently substituted and no invented price/inventory;
- Rental known-item PASS: Behringer WING recognized, while price/inventory remain explicitly unconfirmed;
- existing Contact form continuity PASS: `Message received. Thanks for reaching out.`;
- existing Rental form continuity PASS: `Quote request received. I'll contact you with availability and the final rental quote.`.

**Rollback control remains valid:** `ASSISTANT_PUBLIC_ENABLED` is the public kill switch.

The Assistant milestone is closed. Do not keep doing Assistant polish unless a new production regression or explicit product request justifies reopening it.

## SD.Live Forms Turnstile Siteverify

**CLOSED/PASS.** Contact/Rental send `turnstileToken`; server verifies Cloudflare Siteverify, hostname and action before downstream consent/Lead behavior. The old dashboard warning was dispositioned as stale/incomplete detection unless future runtime evidence contradicts the proof.

# ACTIVE GATE — PR #246 WhatsApp owner control for Availability

PR #246 — **Rebuild verified-owner WhatsApp Availability control** — is the current implementation gate.

Current verified handoff state:

- state: **OPEN / UNMERGED**;
- branch: `feature/whatsapp-owner-control-current-main-20260903`;
- head: `fd4a00929b3bd02c5cc3da0b7338bf90faea911c`;
- base at creation: `a5bffc66e711af23f2df01cd440aa0d43344d632`;
- changed files: 13;
- GitHub Actions: **Tests #673 = FAILURE**;
- failing workflow step: `Run tests`;
- merge is forbidden until CI is green;
- because #246 is unmerged, it is **not production** and production behavior remains unchanged by this work.

Detailed handoff: `docs/checkpoints/handoff-whatsapp-owner-control-pr246-2026-09-03.md`.

## Why old PR #191 is not the implementation branch

PR #191 remains historical source material only and must not be merged directly. Its branch predates the completed Assistant rollout and included runtime `CREATE TABLE IF NOT EXISTS` reachable from public webhook traffic, which violates the current no-public-DDL invariant.

#246 reconstructs only the still-valid intended behavior on current `main`.

## #246 architecture and required boundaries

- Meta callback/webhook route: `/api/webhooks/whatsapp`.
- Raw-body `X-Hub-Signature-256` HMAC SHA-256 verification before POST processing.
- Exact `WHATSAPP_PHONE_NUMBER_ID` allowlist.
- Exact normalized `WHATSAPP_OWNER_NUMBER` allowlist.
- Explicit `WHATSAPP_OWNER_ACTOR_EMAIL`; no fallback owner identity.
- Durable D1 message-ID idempotency and reply retry semantics.
- Reuse existing transport-neutral Availability owner parser.
- Execute through canonical `handleAvailabilityApi`; no second Availability store/write engine.
- Public WhatsApp transport performs no D1 schema migration.
- Historical Availability schema guards are shielded on this public transport; missing schema must fail closed rather than execute DDL.
- Access-protected storage preparation and readiness endpoints.
- `WHATSAPP_OWNER_CONTROL_ENABLED` hard kill switch; runtime execution remains OFF until rollout readiness is complete.
- Provider response bodies and private owner/secrets never exposed.
- No AI and no Finance/Contact/Rental/Calendar/Show Day/Assistant scope expansion.

## Exact next action

Do **not** configure Meta or Cloudflare yet and do not redesign the feature.

1. inspect GitHub Actions **Tests #673** for #246;
2. recover the exact failing assertions from the `Run tests` step;
3. fix only those failing contracts on the existing #246 branch while preserving every boundary above;
4. rerun CI and require green;
5. squash merge #246 only after green CI;
6. verify `main` CI;
7. then perform bounded rollout: storage preparation → readiness → Meta/Cloudflare config → callback verification/subscription → readiness → enable flag → exactly one representative production smoke;
8. close #191 without merge as superseded only after #246 is validated/merged.

No AI is required for this milestone.

# Priority after #246

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.

# Closed modules — do not reopen without regression

- Finance read-only / regression closeout.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.
- Availability Core v1.
- Lead Core workflow/status audit.
- Assistant storage/backend/runtime/widget/E2E rollout.

# Exact continuation point

**Resume PR #246 exactly where it is: CI is red at Tests #673. Extract the failing assertions, fix only those contracts, rerun CI, and do not merge or touch Meta/Cloudflare production configuration until CI is green.**
