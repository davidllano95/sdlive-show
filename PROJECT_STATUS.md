# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-02 — America/Bogota** |
| Rama operativa | `main` |
| Runtime baseline antes de este docs-only | **`d1db8019deadc5d84fba9604de7a36f64658aba7` · PR #229** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant storage/backend/runtime/widget CLOSED or operational** |
| Active Gate | **Final Assistant public enablement + representative E2E** |
| Public Assistant | **OFF — `ASSISTANT_PUBLIC_ENABLED` absent/false** |
| Siguiente workstream | **PR #191 — WhatsApp owner control for Availability, after Assistant closeout** |
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

**MERGED / CI PASS / DEPLOYED.** Squash merge: `259b68b2d94b5fca7dcfe13bec79ace40792fff8`.

Includes `/api/assistant`, hard public kill switch, Admin readiness, Responses API + strict Structured Outputs + `store:false`, sealed stateless session, dedicated rate limiter, deterministic Availability/Rental boundaries, explicit consent, idempotent Lead capture and Resend handoff.

Old #213 is closed/superseded.

### Assistant runtime configuration — PASS

Authenticated production readiness returned:

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

**MERGED / CI PASS / DEPLOYED BUT HIDDEN.** Squash merge: `6ef4c1990a8e4903b38f6fefb334d307634119f8`.

PR #228 reconstructed only the widget scope on current `main`, avoiding obsolete #213/#215 lineage. It provides Contact launcher, desktop modal/mobile bottom sheet, EN/ES, in-memory state, sealed session token, Turnstile per operation, current backend wire contract, server-owned consent actions and deterministic human fallback.

Production flag-OFF smoke PASS: no public launcher/widget is rendered.

Old #215 is **CLOSED WITHOUT MERGE / superseded by #228**.

### SD.Live Forms Turnstile Siteverify — PASS

Cloudflare had shown:

`Siteverify isn't being called for SD.Live Forms`

Repository inspection proved the intended server path exists: Contact/Rental submit `turnstileToken`; `worker.js` calls Cloudflare Siteverify; validates `hostname === "sdlive.show"`; validates action `contact`/`rental`; and fails before Lead persistence on invalid Turnstile.

Production proof on 2026-09-02 used a fresh valid Contact widget token and deliberately omitted privacy consent. The live endpoint returned:

`{"ok":false,"error":"Privacy consent is required"}`

Privacy validation is downstream of Turnstile validation, so this is positive evidence that the live token passed server-side Siteverify and reached the later consent gate. The probe intentionally created no Lead.

**Disposition:** treat the Cloudflare dashboard warning as stale/incomplete detection or association, not a missing Siteverify implementation. Reopen only if later runtime evidence contradicts this proof.

## ACTIVE GATE — final Assistant public enablement

All pre-enable technical/security gates are now PASS. The remaining change is operational and reversible:

1. owner explicitly sets `ASSISTANT_PUBLIC_ENABLED=true` in production;
2. run one controlled representative end-to-end Assistant smoke, one manual action at a time;
3. verify one normal flow through explicit consent and one QA Lead/handoff, deterministic Availability/Rental boundaries, no duplicate Lead, and existing Contact/Rental continuity;
4. close/document Assistant rollout;
5. move immediately to PR #191.

Do not enable by committing a default-ON flag to GitHub. Production configuration remains the activation control.

## Open PR audit / priority

Repository-wide open-PR audit on 2026-09-02 found old Assistant preparatory drafts #192–#212 plus #191. The preparatory Assistant drafts have now been **CLOSED WITHOUT MERGE** because their validated content is superseded by final integrated backend PR #225.

Also closed/superseded: #213, #215, #216 and temporary #218.

After cleanup there is exactly one open operational PR:

### Priority 1 — finish current Assistant rollout

No open implementation PR remains for this. Complete public enablement + representative E2E + closeout first so we do not mix two runtime rollouts.

### Priority 2 — PR #191 WhatsApp owner control

**OPEN / NEXT AFTER ASSISTANT.**

The user was indeed working on this before the Assistant block. The old #190 smoke blocker in its PR description is removed: #190 and Availability are already CLOSED/PASS.

Do not merge the current old branch directly. After Assistant closeout, reconstruct/reverify its bounded Meta WhatsApp Cloud API scope on then-current `main`, run CI, complete required Meta/Cloudflare onboarding/configuration, then activate and smoke once.

### Priority 3+ — roadmap backlog after #191

Recommended order unless business priorities change:

1. Rental real-time availability + double-booking protection — establishes deterministic inventory truth and improves both Rental and Assistant quality.
2. Mobile Rental Cart total/sticky summary — contained high-value UX debt.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog as separately scoped milestones.

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

**Turnstile gate is closed. Keep scope on the Assistant until its public rollout is fully closed. The next manual action is to explicitly set production `ASSISTANT_PUBLIC_ENABLED=true`; after that, run the final representative E2E one action at a time. Then resume #191.**
