# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-02 — America/Bogota** |
| Rama operativa | `main` |
| `main` verificado antes de este milestone docs-only | **`1c8e594ce84d3f50d7c1412fcb5dfb29c8bc5da9` · PR #190** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/public stabilization/Rental parity/Availability v1/Lead Core Admin workflow CLOSED or operational** |
| Active Gate | **SD.Live Assistant rollout** |
| Siguiente slice técnico | **PR #214 — read-only Assistant storage preflight** |
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

### Show Day / Admin / Rental / Finance stabilization

- Show Day — CLOSED/PASS.
- Finance regression #141 — CLOSED/PASS.
- Admin stabilization through #150 — CLOSED/PASS.
- Public visual audit #124 — CLOSED/PASS.
- Rental image-editor parity #157 — CLOSED/PASS.

### Lead Core through PR #190

PR #190 **Show auditable lead status history**:

- MERGED;
- CI PASS;
- PRODUCTION SMOKE PASS;
- current main baseline: `1c8e594ce84d3f50d7c1412fcb5dfb29c8bc5da9`.

Smoke confirmado 2026-09-02 en `/admin/leads/`: el historial mostró correctamente transición, actor y timestamp y el lead QA quedó devuelto a `new`.

Canonical executable Lead statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

No usar `qualified / won / archived`.

Lead sources relevantes:

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

## Active Gate — SD.Live Assistant rollout

### PR #214 — READ-ONLY STORAGE PREFLIGHT

**Status:** OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS.

- Title: `Add read-only Assistant storage preflight`.
- Branch: `preflight/assistant-storage-readonly`.
- Head: `f5413158770254061d8b02a1d2c5113117fe5c0e`.
- Base: `main` at current runtime baseline.
- Tests #581 PASS.
- Endpoint: authenticated `GET /api/admin/assistant/preflight`.
- SQLite metadata reads only.
- Checks `leads`, `privacy_consents`, `assistant_effect_reservations`.
- Fails closed on incompatible legacy constraints, missing canonical columns/indexes, required legacy email, unknown schema, or missing idempotency storage.
- No writes, migrations, provider calls, public Assistant, new limiter or unrelated module changes.

**This is the next real rollout slice.**

### PR #216 — CONDITIONAL STORAGE PREPARATION

**Status:** OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS.

- Base: PR #214 branch, not `main`.
- Head: `3ac0338a7896a7429316773dafe73bdf0e767025`.
- Tests #596 PASS.
- Endpoint: Admin-only `POST /api/admin/assistant/storage-prepare`.
- Exact confirmation required: `PREPARE_ASSISTANT_STORAGE`.

Decision rule:

1. #214 says ready → do not merge/use #216.
2. #214 says only supported safe preparation needed → integrate #216, execute once, rerun preflight.
3. #214 reports blocked/unknown `leads` schema → stop; do not run #216; implement exact schema-specific migration only.

### PR #213 — ASSISTANT BACKEND

**Status:** OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS / NOT PRODUCTION.

- Head: `cce1144f8336d22cafe2a9b200de93152bd6bea2`.
- Tests #594 PASS.
- Contains approved knowledge EN/ES, strict model schema, deterministic Availability/Rental boundaries, sealed stateless session, explicit consent, Turnstile, dedicated rate limit, idempotency, Lead capture, Resend handoff, provider boundary, orchestration and `/api/assistant`.
- Kill switch: `ASSISTANT_PUBLIC_ENABLED`, OFF unless exactly `true`.
- Admin readiness: `GET /api/admin/assistant/readiness`.
- Public Assistant runtime verifies schema compatibility and fails closed; it never performs schema migration.

Do not merge until storage and runtime config are ready and flag remains OFF.

### PR #215 — PUBLIC WIDGET

**Status:** OPEN / DRAFT / UNMERGED / MERGEABLE / CI PASS / NOT PRODUCTION.

- Base: PR #213 branch.
- Head: `901961c11b9cd22ebf14cee251e4129b2e2c1be2`.
- Tests #595 PASS.
- Contact-section launcher; desktop modal/mobile bottom sheet; EN/ES; Turnstile; in-memory conversation; sealed session; explicit server-owned consent UI; deterministic fallbacks.
- Renders only with `ASSISTANT_PUBLIC_ENABLED=true` and valid Turnstile site key.

Do not integrate until #213 is deployed and backend-smoked with public flag OFF.

### PR #218 — TEMP INTEGRATION VALIDATION

**Status:** CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY / PASS.

- Head: `6adb15bcf6897032e84fd58ff01f6ca63573782d`.
- Tests #598 PASS.
- Validated #213 + #214 + #216 + shared routing together.
- Runtime guardrails were not weakened.
- Do not reopen or merge.

### PR #191 — WHATSAPP OWNER CONTROL

**Status:** OPEN / UNMERGED / MERGEABLE.

Separate from Assistant.

- Meta WhatsApp Cloud API direct transport.
- Signature verification, exact phone_number_id, owner sender allowlist, message-id idempotency, existing Availability owner parser, canonical Availability write path, deterministic reply.
- No AI, Finance or Leads coupling.
- Requires real Meta/Cloudflare config before smoke.
- Must not displace Assistant Active Gate.

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

## Rollout sequence

1. **Docs reconciliation — current milestone.** Merge docs-only; no production smoke.
2. Reverify #214 against resulting `main`.
3. Merge #214 if still clean; wait CI/deploy.
4. Ask owner for exactly one production action: authenticated `GET /api/admin/assistant/preflight`.
5. Interpret actual production D1 result before touching #216/#213/#215.
6. Resolve storage if required according to the #214 result.
7. Configure real runtime requirements with public flag OFF; verify through `/api/admin/assistant/readiness` one missing item at a time.
8. Rebase/integrate #213, CI, merge backend only when storage + readiness are ready and flag OFF; one backend smoke.
9. Rebase/integrate #215, CI, merge while flag OFF.
10. Explicitly enable `ASSISTANT_PUBLIC_ENABLED=true`; then perform UI/E2E smoke one action at a time.

## Backlog that must not displace Active Gate

- Mobile Rental Cart total visibility (`docs/roadmap/mobile-rental-cart-total-visibility.md`).
- PR #191 WhatsApp owner transport.
- SD.Live Patch.
- Finance Document Generator.
- Rental real-time availability/double-booking.
- Calendar workflow additions.
- Generic Finance Phase 3 write-back remains blocked.

## Exact continuation point

After this docs-only PR is merged, **do not advance to #216/#213/#215**.

The exact next technical operation is:

**reverify PR #214 against the new `main`, prepare it for squash merge if unchanged/clean, merge it, then request exactly one authenticated production `GET /api/admin/assistant/preflight`.**

Stop after that single manual result and branch the rollout from the actual D1 report.
