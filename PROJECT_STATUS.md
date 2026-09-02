# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-02 — America/Bogota** |
| Rama operativa | `main` |
| Runtime baseline actual | **`bf93bbbf9f707abea22105753c9d424b82a68b27` · PR #231** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant storage/backend/runtime/widget operational** |
| Active Gate | **Assistant E2E — Safari second-turn/session continuity smoke after PR #231** |
| Public Assistant | **ON — `ASSISTANT_PUBLIC_ENABLED=true`; authenticated readiness previously returned `publicExposure.enabled:true`** |
| Siguiente workstream | **PR #191 — WhatsApp owner control for Availability, only after Assistant closeout** |
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

## CLOSED / PASS

### Availability Core v1

**CLOSED/PASS.** No reabrir salvo regresión.

### Lead Core

**CLOSED/PASS through PR #190.** Canonical statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`. Relevant sources: `contact`, `rental`, `assistant`. Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

### Assistant storage gate

**CLOSED/PASS in production.** Assistant Lead insert is supported, email is nullable, Privacy accepts `assistant`, idempotency storage is ready and final preflight returned `readyForAssistantLeadCapture:true` with no FK violations/stale migration objects.

Final storage preparation: PR #224. Old #216 is closed/superseded.

### Assistant backend — PR #225

**MERGED / CI PASS / DEPLOYED.** Includes `/api/assistant`, hard public kill switch, Admin readiness, Responses API + strict Structured Outputs + `store:false`, sealed stateless session, dedicated rate limiter, deterministic Availability/Rental boundaries, explicit consent, idempotent Lead capture and Resend handoff.

Old #213 is closed/superseded.

### Assistant runtime configuration — PASS

Production configuration is complete. Readiness returned no missing or invalid bindings, all runtime dependencies ready, and after explicit activation returned:

- `readyForRuntimeConfiguration:true`;
- `readyForPublicEnablement:true`;
- `publicExposure.enabled:true`;
- `missingBindings:[]`;
- `invalidBindings:[]`.

`ASSISTANT_PUBLIC_ENABLED=true` is therefore the current production state.

### Assistant public widget — PR #228

**MERGED / CI PASS / DEPLOYED.** The Contact launcher is publicly visible and Turnstile loads/verifies. The first real OpenAI turn completed successfully after API billing/credits were added.

Known visual debt: launcher/widget colors still lean green/olive instead of the current violet SD.Live palette. Keep this as post-E2E polish; do not mix it into the active functional gate.

Old #215 is **CLOSED WITHOUT MERGE / superseded by #228**.

### SD.Live Forms Turnstile Siteverify — PASS

Cloudflare had shown `Siteverify isn't being called for SD.Live Forms`.

Repository inspection proved Contact/Rental submit `turnstileToken`; `worker.js` calls Cloudflare Siteverify; validates `hostname === "sdlive.show"`; validates action `contact`/`rental`; and fails before Lead persistence on invalid Turnstile.

A real production Contact token was submitted while privacy consent was intentionally omitted. The live endpoint returned:

`{"ok":false,"error":"Privacy consent is required"}`

Privacy validation is downstream of Turnstile validation, so this is positive evidence that Siteverify passed. The probe intentionally created no Lead.

**Disposition:** dashboard warning is stale/incomplete detection/association unless future runtime evidence contradicts this proof.

## PR #231 — Assistant Turnstile refresh between turns

**MERGED / PR CI PASS / `main` CI PASS. PRODUCTION SAFARI SMOKE PENDING.**

Squash merge: `bf93bbbf9f707abea22105753c9d424b82a68b27`.

Observed production symptom before the fix:

- first Assistant turn succeeded;
- Safari still displayed Turnstile `Success!` after the request;
- internal token had already been consumed/cleared;
- Send remained disabled;
- status remained `Enviando…`;
- second turn could not be submitted.

Fix:

- stop relying on `turnstile.reset(widgetId)` after a consumed token;
- call `turnstile.remove(widgetId)`;
- clear/rebuild the widget container;
- create a fresh Turnstile widget/token for the next turn;
- clear stale sending status on API success, API error and network failure.

Initial Tests #631 failed because `tests/assistant-public-widget.test.mjs` still asserted the old `turnstile.reset(widgetId)` contract. This was an obsolete contract assertion, not a security failure and not an `OPENAI_*` browser-exposure failure. The test was updated to require `turnstile.remove(widgetId)` instead. Tests #632 passed on the PR head and Tests #633 passed on `main` after squash merge.

Security boundaries remain unchanged: every Assistant browser operation still carries Turnstile, only the sealed session token is reused, and no backend/OpenAI binding is exposed to the browser.

## ACTIVE GATE — Safari second turn / session continuity

Do **not** start #191 yet.

The only next manual smoke is:

1. open the public Assistant in Safari;
2. send one successful first turn;
3. confirm `Enviando…` clears after the response;
4. confirm Turnstile is visibly regenerated for a fresh token;
5. confirm Send becomes available again;
6. send the second turn:

`The show is October 17, 2026. Venue is still TBD. I need sound design and FOH, with rehearsal on October 16 from 2–8 PM. What else do you need?`

Acceptance for session continuity: the answer must retain the prior context — **theatre show in Bogotá** — without asking the user to repeat it.

If this passes, mark `SESSION CONTINUITY = PASS` and continue the remaining Assistant E2E gates in the same milestone: explicit consent, one Assistant Lead, idempotency/effects, handoff/notification, deterministic pricing/Availability boundaries, Contact/Rental continuity and mobile smoke if needed.

## Open PR audit / priority

After #231 merge, exactly one operational PR remains open:

### Priority 1 — finish current Assistant rollout

Current gate is the Safari second-turn/session-continuity production smoke and then remaining Assistant E2E acceptance. No unrelated work until this milestone closes.

### Priority 2 — PR #191 WhatsApp owner control

**OPEN / NEXT AFTER ASSISTANT.**

Do not merge the old branch directly. After Assistant closeout, reconstruct/reverify its bounded Meta WhatsApp Cloud API scope on current `main`, preserving webhook signature verification, exact owner/phone-number-id allowlisting, D1 message-id idempotency and the canonical Availability write path. Complete required Meta/Cloudflare onboarding/configuration, then CI green → squash merge → one production smoke.

### Priority 3+ — roadmap backlog after #191

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.

## Assistant architecture and hard boundaries

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Never:

- impersonate Samuel;
- invent/negotiate prices;
- promise Availability without backend truth;
- invent Rental availability;
- read/write Finance;
- infer privacy consent;
- persist full transcript;
- expose secrets/private owner data;
- use provider-managed conversation state as truth;
- let public traffic mutate D1 schema.

## Exact continuation point

**PR #231 is merged and green. Keep scope on the Assistant. Run exactly one Safari second-turn/session-continuity smoke. Do not resume #191 until that smoke and the remaining Assistant E2E gates are closed/documented.**
