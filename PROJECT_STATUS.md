# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-03 — America/Bogota** |
| Rama operativa | `main` |
| Runtime baseline actual | **`c52a06603c0a6b5cd0cc4425cca11f69cce693d7` · PR #244** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant operational** |
| Active Gate | **PR #191 — reconstruct/reverify authenticated WhatsApp owner control for Availability on current `main`** |
| Public Assistant | **ON / CLOSED-PASS — `ASSISTANT_PUBLIC_ENABLED=true`** |
| Siguiente workstream | **#191 WhatsApp owner control → Rental real-time availability/double-booking → mobile Rental cart → quote/PDF foundation** |
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
- Public Assistant traffic nunca migra schema.
- Owner phone/secrets/tokens permanecen server-side.
- Assistant usa OpenAI Responses API + strict Structured Outputs + `store:false`.
- La sesión es stateless y sellada con AES-GCM; no se persiste transcript completo.
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
- Enter → Send and Shift+Enter → newline behavior PASS;
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

The Assistant milestone is now closed. Do not keep doing Assistant polish unless a new production regression or explicit product request justifies reopening it.

## SD.Live Forms Turnstile Siteverify

**CLOSED/PASS.** Contact/Rental send `turnstileToken`; server verifies Cloudflare Siteverify, hostname and action before downstream consent/Lead behavior. The old dashboard warning was dispositioned as stale/incomplete detection unless future runtime evidence contradicts the proof.

# ACTIVE GATE — PR #191 WhatsApp owner control for Availability

PR #191 remains **OPEN / UNMERGED** and is now the next operational workstream.

Do **not** merge its old branch directly. Its base predates the completed Assistant rollout. Required approach:

1. inspect #191 diff and contract against current `main` (`c52a06603c0a6b5cd0cc4425cca11f69cce693d7` or newer);
2. reconstruct/rebase only still-valid bounded WhatsApp owner-control changes on a fresh short branch;
3. preserve Meta webhook HMAC signature verification;
4. preserve exact owner sender + `phone_number_id` allowlisting;
5. preserve D1 WhatsApp message-id idempotency and in-flight duplicate protection;
6. reuse the canonical Availability owner parser/write path; no second Availability store or command engine;
7. keep owner phone/token/app secret server-side;
8. complete required Meta WhatsApp Cloud API + Cloudflare configuration/onboarding;
9. tests/CI green → PR → squash merge → exactly one representative production smoke.

No AI is required for #191.

# Priority after #191

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

**Assistant rollout is CLOSED/PASS. Resume #191 by inspecting/reconstructing the bounded WhatsApp owner-control scope on current `main`; do not merge the stale #191 branch directly.**
