# Handoff — WhatsApp owner control reconstruction / PR #246 — 2026-09-03

## Status

**ACTIVE / OPEN / UNMERGED / CI RED.**

The completed Assistant rollout remains CLOSED/PASS. The current runtime workstream is the reconstruction of the old WhatsApp owner-control intent from PR #191 on current `main`.

Current implementation PR:

- PR: **#246 — Rebuild verified-owner WhatsApp Availability control**
- branch: `feature/whatsapp-owner-control-current-main-20260903`
- head at handoff: `fd4a00929b3bd02c5cc3da0b7338bf90faea911c`
- base at PR creation: `a5bffc66e711af23f2df01cd440aa0d43344d632`
- changed files: 13
- GitHub Actions: **Tests #673 = FAILURE**
- failing workflow step: `Run tests`
- merge: **DO NOT MERGE while CI is red**
- production: **UNCHANGED by #246 because the PR is unmerged**

## Why #191 is not being merged directly

The historical #191 branch predates the completed Assistant rollout and contained runtime `CREATE TABLE IF NOT EXISTS` behavior reachable from public webhook traffic. That conflicts with the current invariant that public traffic must never migrate D1 schema.

#246 reconstructs the intended feature instead of merging the stale branch.

## Reconstructed architecture in #246

`Meta WhatsApp Cloud API -> /api/webhooks/whatsapp -> raw-body HMAC verification -> kill switch -> exact phone_number_id -> exact owner sender -> D1 message-id idempotency -> existing Availability owner parser -> canonical handleAvailabilityApi -> Availability Core -> deterministic Meta reply`

The deploy entry is intentionally narrow:

`whatsapp-owner-worker.js -> admin-stabilization-worker.js`

Routes outside the WhatsApp webhook/readiness/storage-preparation scope fall through to the existing stable worker.

## Hard boundaries that must survive any fix

- No AI.
- Availability Core remains the only Availability source of truth.
- No second Availability write path or command engine.
- `WHATSAPP_OWNER_CONTROL_ENABLED` is a hard kill switch and must remain OFF until rollout readiness is complete.
- POST webhook processing verifies raw-body `X-Hub-Signature-256` HMAC SHA-256 before execution.
- Exact configured `WHATSAPP_PHONE_NUMBER_ID` is required.
- Exact configured/normalized `WHATSAPP_OWNER_NUMBER` is required.
- Owner actor identity must be explicitly configured.
- Public webhook traffic performs no D1 DDL.
- WhatsApp idempotency storage is prepared only through the Access-protected Admin preparation route.
- The WhatsApp transport must reuse the canonical Availability owner parser/write path.
- Historical Availability schema guards must not cause public WhatsApp traffic to run DDL; missing schema must fail closed.
- Meta/provider error bodies must not be exposed.
- Owner phone number, Meta token, app secret and verification token stay server-side and out of repository/public config.
- No Finance, Contact, Rental, Calendar, Show Day or Assistant behavior should change as part of this milestone.

## Current #246 scope

The PR currently adds/reconstructs:

- `whatsapp-owner-worker.js` narrow wrapper over the stable worker;
- `/api/webhooks/whatsapp` GET verification + signed POST handling;
- exact owner sender and `phone_number_id` allowlisting;
- durable D1 message-ID idempotency with reply-retry semantics;
- `WHATSAPP_OWNER_CONTROL_ENABLED` kill switch;
- Access-protected Admin readiness endpoint;
- Access-protected explicit storage preparation endpoint;
- a public-transport DDL shield while still delegating real Availability reads/writes to the canonical handler;
- regression tests for webhook security, worker routing, storage, Admin readiness and no-DDL behavior;
- `docs/roadmap/whatsapp-owner-control.md` rollout contract;
- `wrangler.jsonc` entrypoint change to the narrow wrapper.

## Exact continuation point

Do not restart the design and do not touch Meta/Cloudflare production configuration yet.

Next action:

1. inspect GitHub Actions **Tests #673** for PR #246;
2. recover the exact failing assertions from the `Run tests` step;
3. fix only those failing contracts on `feature/whatsapp-owner-control-current-main-20260903` while preserving every hard boundary above;
4. rerun CI;
5. require green CI before merge;
6. squash merge #246 only after CI is green;
7. verify `main` CI after merge;
8. only then perform the rollout in bounded order: storage preparation -> readiness -> Meta/Cloudflare configuration -> callback verification/subscription -> readiness -> enable kill switch -> exactly one representative production smoke;
9. close old PR #191 without merge as superseded only after #246 is validated/merged.

## Safe rollout after merge

1. deploy with `WHATSAPP_OWNER_CONTROL_ENABLED` unset/false;
2. authenticated `POST /api/admin/whatsapp-owner/storage-prepare` with the documented confirmation value;
3. authenticated readiness confirms storage ready;
4. complete Meta WhatsApp Cloud API + Cloudflare bindings/secrets;
5. configure callback `https://sdlive.show/api/webhooks/whatsapp` and verify token;
6. subscribe required message webhook field(s);
7. readiness must report ready for activation and no missing bindings;
8. set `WHATSAPP_OWNER_CONTROL_ENABLED=true`;
9. one bounded owner-number smoke: `status` -> temporary bounded command -> verify public Availability -> `back`/`volver` to AUTO;
10. only then mark WhatsApp owner control CLOSED/PASS.

## Work order after this milestone

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.
