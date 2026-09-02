# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets `REGISTRO` remains the operations/finance persistence source of truth, AppSheet **SD.Live Track** remains the mobile/offline workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md` for historical/future backlog;
7. older prompts/ideas/references.

**Stability > novelty.** `UNMERGED != PRODUCTION`, and `CI PASS != PRODUCTION SMOKE PASS`.

## Current state — 2026-09-02

Current verified `main` before this docs-only reconciliation:

`1c8e594ce84d3f50d7c1412fcb5dfb29c8bc5da9`

That commit is PR #190, **Show auditable lead status history**.

### Closed / production-smoked

- Finance read-only integration and `/admin/finance/` — operational / production-smoked PASS.
- Admin Calendar + controlled create + multi-day operations — CLOSED/PASS.
- Site Schedule + automatic Show Day + Location — CLOSED/PASS.
- Admin Show Day `Auto / Force On / Force Off` — CLOSED/PASS.
- Admin desktop/mobile stabilization — CLOSED/PASS.
- Public post-integration visual stabilization — CLOSED/PASS.
- Rental image-editor parity — CLOSED/PASS through PR #157.
- Availability Core v1 — CLOSED/PASS.
- Lead Core Admin workflow through PR #190 — CLOSED/PASS, including visible auditable status history.

Canonical Lead Core statuses are:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Do not use historical `qualified / won / archived` as executable status values.

## Current Active Gate — SD.Live Assistant rollout

The Assistant architecture is prepared but **not public and not in production**.

### PR #214 — next rollout slice

**Add read-only Assistant storage preflight**

- OPEN / DRAFT / UNMERGED / MERGEABLE.
- Base: `main`.
- Head: `f5413158770254061d8b02a1d2c5113117fe5c0e`.
- CI: Tests #581 PASS.
- Adds authenticated `GET /api/admin/assistant/preflight`.
- Read-only metadata inspection only (`PRAGMA` / `SELECT`).
- Checks `leads`, `privacy_consents`, and `assistant_effect_reservations`.
- Does not create, alter, insert, update or delete storage.

This is the **next technical step** after this docs-only milestone.

### PR #216 — conditional storage preparation

**Prepare Assistant storage behind Admin confirmation**

- OPEN / DRAFT / UNMERGED / MERGEABLE.
- Base: PR #214 branch, not `main`.
- Head: `3ac0338a7896a7429316773dafe73bdf0e767025`.
- CI: Tests #596 PASS.
- Admin-only `POST /api/admin/assistant/storage-prepare`.
- Requires exact confirmation `PREPARE_ASSISTANT_STORAGE`.

Decision rule:

- if #214 reports storage already ready → do not merge/use #216;
- if only known-safe supported preparation is required → integrate #216, execute once, rerun #214;
- if a blocked/unknown `leads` schema is reported → do not execute #216; create an exact migration for that physical schema.

### PR #213 — Assistant backend

**Integrate Assistant backend contracts**

- OPEN / DRAFT / UNMERGED / MERGEABLE.
- Head: `cce1144f8336d22cafe2a9b200de93152bd6bea2`.
- CI: Tests #594 PASS.
- Not in production.
- Public kill switch: `ASSISTANT_PUBLIC_ENABLED`; OFF unless exactly `true`.
- Admin readiness endpoint prepared: `GET /api/admin/assistant/readiness`.
- Public Assistant requests never perform D1 schema migration.

### PR #215 — public widget

**Add gated public SD.Live Assistant widget**

- OPEN / DRAFT / UNMERGED / MERGEABLE.
- Base: PR #213 branch, not `main`.
- Head: `901961c11b9cd22ebf14cee251e4129b2e2c1be2`.
- CI: Tests #595 PASS.
- Not in production.
- Must not be integrated before #213 is deployed and smoke-tested with the public flag OFF.

### PR #218 — temporary integration validation

- CLOSED WITHOUT MERGE.
- TEMP VALIDATION ONLY.
- Tests #598 PASS.
- Proved #213 + #214 + #216 + router integration can coexist without weakening runtime boundaries.
- Do not reopen or merge it.

### PR #191 — WhatsApp owner control

- OPEN / UNMERGED / MERGEABLE.
- Separate from the Assistant Active Gate.
- Meta WhatsApp Cloud API transport for authenticated Availability owner commands.
- No AI, no Finance, no Leads coupling.
- Requires real Meta/Cloudflare configuration before any smoke.

## SD.Live Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

The Assistant must never:

- impersonate Samuel;
- invent or negotiate prices;
- promise Availability without deterministic backend confirmation;
- become a second Rental catalog/pricing source;
- write Finance;
- infer privacy consent on behalf of the user;
- persist the full transcript;
- expose secrets/tokens/private owner data;
- migrate D1 schema during public traffic.

## Source-of-truth matrix

| Concern | Source of truth |
|---|---|
| Code/CSS/JS/critical branding/fallbacks | GitHub `main` |
| Structured CMS Draft/Published | D1 |
| Public CMS content | validated D1 Published |
| Editor-managed media binary | R2 |
| Rental pricing / quote calculation | backend pricing logic |
| Public analytics | GA4/GTM after consent |
| Admin access | Cloudflare Access |
| Operations/finance persistence + formulas | Google Sheets `REGISTRO` |
| Offline capture/workflow | AppSheet SD.Live Track |
| Finance Admin analytics | read-only Worker view over Sheets/API |
| Website-only Calendar presentation overrides | D1 `site_schedule_state` |
| Google Calendar secondary projection / read-only overlay | `sam@sdlive.show` |
| Automatic public Show Day | Site Schedule + America/Bogota date |
| Availability / reachability | D1 Availability Core |
| Leads | SD.Live Lead Core in D1 |
| Assistant runtime state | sealed SD.Live-owned structured session, not provider-side conversation state |

## Change workflow

Runtime changes:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only changes:

`branch → docs → tests/CI → PR → CI green → squash merge`.

No production smoke for docs-only PRs.

Manual QA with the owner: **one action at a time**.

Do not use Cloudflare deployment state as routine primary truth. Investigate deployment internals only when production conflicts with merged `main`.

## Exact continuation

After this docs-only reconciliation is merged:

1. reverify PR #214 against the new `main`;
2. merge #214 if still clean;
3. after deployment, perform exactly one manual production action: authenticated `GET /api/admin/assistant/preflight`;
4. stop and interpret the real production D1 result before touching #216, #213 or #215.

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-assistant-rollout-2026-09-02.md` — latest rollout checkpoint.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled backlog and rollout checklist.
