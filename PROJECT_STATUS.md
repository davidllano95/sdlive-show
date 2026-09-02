# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-02 — America/Bogota** |
| Rama operativa | `main` |
| `main` runtime verificado antes de este docs-only | **`6ef4c1990a8e4903b38f6fefb334d307634119f8` · PR #228** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant storage/backend/runtime/widget CLOSED or operational** |
| Active Gate | **Turnstile production verification before Assistant public enablement** |
| Public Assistant | **OFF — `ASSISTANT_PUBLIC_ENABLED` absent/false** |
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
- Assistant no escribe Finance.
- Public Assistant traffic nunca migra schema.
- Owner phone/secrets/tokens permanecen server-side.

## CLOSED / PASS

### Availability Core v1

**CLOSED/PASS.** No reabrir salvo regresión.

### Lead Core

**CLOSED/PASS through PR #190.** Canonical statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`. Relevant sources: `contact`, `rental`, `assistant`. Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

### Assistant storage gate

**CLOSED/PASS in production.**

- Assistant Lead insert supported.
- Email nullable.
- Privacy accepts `assistant`.
- `assistant_effect_reservations` ready.
- `readyForAssistantLeadCapture:true`.
- No FK violations or stale migration objects in final verification.

Final storage preparation: PR #224. Old #216 is closed/superseded.

### Assistant backend — PR #225

**MERGED / CI PASS / DEPLOYED.**

Squash merge: `259b68b2d94b5fca7dcfe13bec79ace40792fff8`.

Includes `/api/assistant`, hard public kill switch, Admin readiness, Responses API + strict Structured Outputs + `store:false`, sealed stateless session, dedicated rate limiter, deterministic Availability/Rental boundaries, explicit consent, idempotent Lead capture and Resend handoff.

Old #213 is closed/superseded.

### Assistant runtime configuration — PASS

Authenticated production readiness after the owner configured the required runtime bindings returned:

- `readyForRuntimeConfiguration:true`;
- `missingBindings:[]`;
- `invalidBindings:[]`;
- `openai.ready:true`;
- `session.ready:true`;
- `turnstile.ready:true`;
- `rateLimit.ready:true`;
- `d1Binding.ready:true`;
- `notification.ready:true`;
- `publicExposure.enabled:false`.

`readyForPublicEnablement:false` is expected while `ASSISTANT_PUBLIC_ENABLED` remains OFF.

### Assistant public widget — PR #228

**MERGED / CI PASS / DEPLOYED BUT HIDDEN.**

Squash merge: `6ef4c1990a8e4903b38f6fefb334d307634119f8`.

PR #228 reconstructed only the widget scope on current `main`, avoiding obsolete #213 lineage. It provides Contact launcher, desktop modal/mobile bottom sheet, EN/ES, in-memory state, sealed session token, Turnstile per operation, current backend wire contract, server-owned consent actions and deterministic human fallback.

The widget renders only when both `ASSISTANT_PUBLIC_ENABLED=true` and a valid site key exist. Production smoke with the flag OFF passed: no public Assistant launcher/widget is rendered.

Old PR #215 is **CLOSED WITHOUT MERGE / superseded by #228**.

## ACTIVE GATE — Turnstile production verification

Cloudflare currently shows for the existing **SD.Live Forms** widget:

`Siteverify isn't being called for SD.Live Forms`

Repository inspection establishes that Siteverify code is present and wired:

- Contact/Rental browser code reads a Turnstile response token and submits it as `turnstileToken`;
- `worker.js` sends it to `https://challenges.cloudflare.com/turnstile/v0/siteverify`;
- the response must have hostname `sdlive.show`;
- Contact must have action `contact`;
- Rental must have action `rental`;
- Turnstile failure returns before Lead persistence.

Therefore this is **not a missing-code finding**. It remains an unresolved runtime/telemetry/association question. Do not call it a false positive until one real production token from the existing widget is observed going through server-side verification.

Next validation must be non-destructive: obtain a valid Contact Turnstile token, submit it to the real Contact endpoint while intentionally failing a later validation gate, confirm no Lead is created, and then disposition the Cloudflare warning.

## Assistant architecture and hard boundaries

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Never:

- impersonate Samuel;
- invent/negotiate prices;
- promise Availability without backend truth;
- invent Rental availability;
- write Finance;
- infer privacy consent;
- persist full transcript;
- expose secrets/private owner data;
- use provider-managed conversation state as truth;
- let public traffic mutate D1 schema.

## Superseded/held work

- #213 — CLOSED WITHOUT MERGE; superseded by #225.
- #215 — CLOSED WITHOUT MERGE; superseded by #228.
- #216 — CLOSED WITHOUT MERGE; superseded by #224.
- #218 — CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY; do not reopen.
- #191 — OPEN / separate Availability owner WhatsApp workstream; do not touch unless explicitly reprioritized.

## Exact continuation point

Do **not** enable the public Assistant yet.

The exact next gate is one non-destructive production validation of **SD.Live Forms → server-side Siteverify**. If that proves the real token path is valid and the warning can be dispositioned, explicitly enable `ASSISTANT_PUBLIC_ENABLED=true` and then run final Assistant E2E one manual action at a time.
