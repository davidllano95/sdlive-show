# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-02 — America/Bogota** |
| Rama operativa | `main` |
| `main` verificado antes de este follow-up docs-only | **`5b709f5cb3a7923d25ac1f8062ae3458b02fc806` · PR #226** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/public stabilization/Rental parity/Availability v1/Lead Core/Assistant storage CLOSED or operational** |
| Active Gate | **Assistant runtime readiness verification with public flag OFF** |
| Siguiente slice técnico | **Re-run authenticated readiness; then investigate Turnstile Siteverify warning before final public enablement** |
| Bloqueado | **Generic Finance Phase 3 write-back** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. checkpoint/handoff fechado más reciente;
4. este archivo;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. docs/prompts históricos.

**Stability > novelty.**

Reglas de estado:

- `MERGED` no implica automáticamente `PRODUCTION SMOKE PASS`.
- `CI PASS` no implica producción verificada.
- `UNMERGED` significa **no producción**.
- `TEMP VALIDATION ONLY` no autoriza merge.

## Workflow obligatorio

Runtime:

`inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge → exactly one production smoke when applicable`.

Docs-only:

`branch → docs → CI → PR → merge`.

No production smoke para docs-only.

QA manual con owner: **una sola acción por vez**.

## Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = barrera real del Admin.
- Google Sheets `REGISTRO` = persistencia + fórmulas de operaciones/finanzas.
- AppSheet SD.Live Track = cliente mobile/offline.
- D1 no es Finance mirror.
- Rental pricing/quote logic = backend authoritative.
- Availability = D1 Availability Core, no AI-owned truth.
- Leads = una sola Lead Core D1 table/source of truth.
- Assistant no crea un segundo catálogo Rental ni un segundo Lead store.
- Assistant no escribe Finance.
- Public Assistant traffic nunca migra schema.
- Owner phone/secrets/tokens permanecen server-side.

## CLOSED / PASS

### Availability Core v1

**CLOSED/PASS.** No reabrir salvo regresión.

Incluye weekly multiple windows, closed days, bounded temporary Available/Limited/Away, flexible 15m–24h timer, explicit Apply, Force Auto/On/Off, Travel Mode, timezone-safe UI, deterministic next service window incl. DST, public WhatsApp status y owner parser core.

Checkpoint: `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`.

### Lead Core

Lead workflow/status history through PR #190 remains **CLOSED/PASS**.

Canonical executable Lead statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Lead sources relevant to current architecture:

- `contact`
- `rental`
- `assistant`

Service categories:

- `live`
- `theatre`
- `sound_design`
- `systems`
- `rental`
- `other`

### Assistant storage gate

**CLOSED/PASS in production.**

The legacy physical `leads` schema was migrated safely while preserving IDs/data, legacy `project`, canonical statuses and child rows. Email is nullable and `assistant` is accepted.

Production post-migration/preparation state:

- `leads.canInsertAssistantLead: true`
- `privacyConsents.canRecordAssistantConsent: true`
- `idempotency.ready: true`
- `readyForAssistantLeadCapture: true`
- foreign-key violations: `0`
- stale temporary migration objects: none

Final storage preparation came through PR #224. Old draft #216 was closed without merge as superseded.

### Assistant backend — PR #225

**MERGED / CI PASS / DEPLOYED WITH PUBLIC FLAG OFF.**

- Squash merge: `259b68b2d94b5fca7dcfe13bec79ace40792fff8`.
- PR CI PASS after correcting two stale preflight-stage test expectations.
- Post-merge `main` Tests #620 PASS.
- Public endpoint: `POST /api/assistant`.
- Public kill switch: `ASSISTANT_PUBLIC_ENABLED`; OFF unless exactly `true`.
- Admin runtime readiness: `GET /api/admin/assistant/readiness`.
- OpenAI Responses API + strict Structured Outputs + `store:false`.
- Sealed stateless session; no provider conversation state.
- Dedicated Assistant rate limit.
- Deterministic Lead/consent/idempotency boundaries.
- No public widget yet.

Old draft #213 was closed without merge as superseded by #225.

## Active Gate — runtime readiness verification

The first authenticated production readiness probe after #225 showed the backend deployed safely with the public flag OFF and these dependencies already ready:

- `rateLimit.ready: true`
- `d1Binding.ready: true`
- `notification.ready: true`
- Turnstile server secret configured: true

It originally reported four missing bindings:

- `ASSISTANT_SESSION_KEY`
- `ASSISTANT_TURNSTILE_SITE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_MODEL`

As of the latest owner action on 2026-09-02, all four have now been entered in Cloudflare. This is **not yet a verified PASS**: a fresh authenticated readiness probe must confirm the deployed runtime sees valid values.

Session key contract remains Base64URL-encoded exactly 32 bytes.

`ASSISTANT_PUBLIC_ENABLED` must remain absent/false.

### Turnstile Siteverify warning — mandatory follow-up

Cloudflare Turnstile currently shows this warning for the existing widget **SD.Live Forms**:

`Siteverify isn't being called for SD.Live Forms`

Treat this as a security/anti-bot investigation before final Assistant public enablement. Do not assume whether the warning is a false positive or a real validation gap. Inspect the actual Contact/Rental form path and confirm whether submitted Turnstile tokens are verified server-side against Siteverify. If not, fix that path without weakening the Assistant Turnstile contract.

This warning does **not** by itself prove the Assistant runtime is misconfigured, because the Assistant has its own explicit Turnstile readiness boundary; it is a separate existing-forms verification item that must be dispositioned before public rollout completion.

## PR #215 — PUBLIC WIDGET

**Status:** OPEN / DRAFT / UNMERGED / NOT PRODUCTION.

It was prepared on the old #213 lineage. Do not merge it directly.

Required sequence:

1. fresh runtime readiness fully green with public flag OFF;
2. investigate/disposition the Turnstile Siteverify warning before final public enablement;
3. reverify/rebase #215 onto current `main`;
4. CI PASS;
5. merge widget while flag remains OFF;
6. explicitly enable public flag only when security gates are satisfied;
7. final E2E one action at a time.

## PR #191 — WHATSAPP OWNER CONTROL

**Status:** OPEN / separate workstream.

Do not touch unless explicitly reprioritized. It does not displace the Assistant Active Gate.

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
- add provider-owned conversation state as source of truth;
- let public traffic create/alter/drop/rebuild D1 schema.

Provider boundary:

- OpenAI Responses API;
- Structured Outputs / strict JSON schema;
- `store: false`;
- server orchestrator owns tools and effects;
- no arbitrary model-executed tools.

## Superseded/temporary Assistant PRs

- #213 — CLOSED WITHOUT MERGE; superseded by #225.
- #216 — CLOSED WITHOUT MERGE; superseded by #224.
- #218 — CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY / do not reopen.

## Backlog that must not displace Active Gate

- Mobile Rental Cart total visibility.
- PR #191 WhatsApp owner transport.
- SD.Live Patch.
- Finance Document Generator.
- Rental real-time availability/double-booking.
- Calendar workflow additions.
- Generic Finance Phase 3 write-back remains blocked.

## Exact continuation point

Do **not** touch #215 yet.

The exact next operation is one authenticated production readiness GET. Require:

- `readyForRuntimeConfiguration:true`;
- all `dependencies.*.ready:true`;
- `missingBindings:[]`;
- `invalidBindings:[]`;
- `publicExposure.enabled:false`.

If that passes, proceed with the Turnstile Siteverify investigation and then the #215 rebase/integration path while keeping the public flag OFF.
