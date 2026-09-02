# SD.Live Assistant rollout checkpoint — 2026-09-02

## Authority

This checkpoint records the reconciled state after verifying GitHub `main` and the live PR metadata on 2026-09-02 America/Bogota.

Source precedence remains:

1. current GitHub `main` + verified production behavior;
2. current schema/config;
3. latest checkpoint;
4. `PROJECT_STATUS.md`;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older docs.

`UNMERGED != PRODUCTION` and `CI PASS != PRODUCTION SMOKE PASS`.

## Verified main

Before this docs-only milestone:

`1c8e594ce84d3f50d7c1412fcb5dfb29c8bc5da9`

This is PR #190, **Show auditable lead status history**.

PR #190 status:

- MERGED;
- CI PASS;
- PRODUCTION SMOKE PASS.

Lead status audit visibility is CLOSED/PASS.

Canonical Lead statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Do not reuse historical `qualified / won / archived`.

## Availability

Availability Core v1 remains CLOSED/PASS.

Do not reopen unless a regression appears.

Latest closeout checkpoint:

`docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`

## PR #214 — next technical slice

Title: **Add read-only Assistant storage preflight**

- OPEN
- DRAFT
- UNMERGED
- MERGEABLE
- CI PASS
- branch: `preflight/assistant-storage-readonly`
- head: `f5413158770254061d8b02a1d2c5113117fe5c0e`
- Tests #581 PASS

Endpoint:

`GET /api/admin/assistant/preflight`

Authenticated Admin only. Strictly read-only. Checks:

- `leads`
- `privacy_consents`
- `assistant_effect_reservations`

No storage writes or schema migrations.

## PR #216 — conditional only

Title: **Prepare Assistant storage behind Admin confirmation**

- OPEN
- DRAFT
- UNMERGED
- MERGEABLE
- CI PASS
- base: #214 branch, not main
- head: `3ac0338a7896a7429316773dafe73bdf0e767025`
- Tests #596 PASS

Use only if real production #214 preflight reports supported safe storage gaps.

Do not use if the real `leads` schema has blocked/unknown constraints.

## PR #213 — Assistant backend

Title: **Integrate Assistant backend contracts**

- OPEN
- DRAFT
- UNMERGED
- MERGEABLE
- CI PASS
- NOT PRODUCTION
- head: `cce1144f8336d22cafe2a9b200de93152bd6bea2`
- Tests #594 PASS

Public kill switch:

`ASSISTANT_PUBLIC_ENABLED`

OFF unless exactly `true`.

Admin runtime readiness endpoint:

`GET /api/admin/assistant/readiness`

Public Assistant traffic never performs schema migration.

## PR #215 — public widget

Title: **Add gated public SD.Live Assistant widget**

- OPEN
- DRAFT
- UNMERGED
- MERGEABLE
- CI PASS
- NOT PRODUCTION
- base: #213 branch
- head: `901961c11b9cd22ebf14cee251e4129b2e2c1be2`
- Tests #595 PASS

Do not integrate until #213 is live and backend-smoked with public flag OFF.

## PR #218 — temporary validation

- CLOSED WITHOUT MERGE
- TEMP VALIDATION ONLY
- Tests #598 PASS
- head: `6adb15bcf6897032e84fd58ff01f6ca63573782d`

Do not reopen or merge.

Its purpose was to prove #213 + #214 + #216 + shared router coexistence.

## PR #191 — separate Availability owner transport

- OPEN
- UNMERGED
- MERGEABLE
- head: `705331e01bd6621c9049a8ebb0422ed46c1924cf`

Meta WhatsApp Cloud API transport for authenticated owner Availability commands.

No AI / Finance / Leads coupling.

Does not displace Assistant Active Gate.

## Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries:

- no impersonation;
- no invented/negotiated prices;
- no AI-owned Availability;
- no second Rental pricing source;
- no Finance path;
- explicit product-owned consent only;
- no full transcript persistence;
- no public owner phone/secrets;
- no public schema migration;
- no provider-owned conversation source of truth.

## Exact continuation

After this docs-only PR is merged:

1. reverify #214 against the resulting `main`;
2. if still clean, mark ready as appropriate and squash merge #214;
3. wait CI/deploy;
4. give the owner exactly one manual QA action: authenticated production `GET /api/admin/assistant/preflight`;
5. stop and interpret the real result;
6. do not advance to #216/#213/#215 until that result is known.

No production smoke is required for this docs-only milestone.
