# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última revisión integral | **2026-08-23 — America/Bogota** |
| Rama operativa | `main` |
| `main` verificado al actualizar | **PR #116 · `a48a92c0c6f0d0c38765b04e0833db692456c3e9`** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **Finance Phase 2 CLOSED/PASS · Calendar read-only CLOSED/PASS · controlled create CLOSED/PASS · Site Schedule + automatic Show Day CLOSED/PASS · Site Schedule source filter PASS** |
| Active Gate | **post-integration detailed visual audit — ACTIVE** |
| Estado del audit | **Rental Show Day matrix PASS · Anima/Sonique contrast PASS · remaining public matrix + Admin audit still required** |
| Después del audit | close remaining P0/P1, preserve P2/P3 backlog, then controlled Calendar edit/workflow actions |
| Bloqueado | **Generic Finance Phase 3 write-back remains BLOCKED** |

## Precedencia

En conflicto prevalece:

1. código actual de GitHub `main` + comportamiento verificable en producción;
2. schema/config desplegada;
3. este archivo;
4. `README.md`;
5. `ROADMAP_MASTER_CHECKLIST.md` para backlog/historia;
6. prompts/ideas/referencias.

**Stability > novelty.** Un documento futuro no autoriza reemplazar una implementación funcional.

## Regla de continuidad

- Un solo smoke/manual QA step a la vez.
- Defectos encontrados dentro de la superficie activa se corrigen dentro del audit según severidad.
- P0/P1 se cierran antes del PASS final del audit.
- P2/P3 se registran y se implementan después en secuencia coherente.
- No saltar a CRM, Finance write-back, Calendar edit/workflow u otros milestones mientras el gate visual siga activo salvo cambio explícito de prioridad.
- Cada milestone material actualiza evidencia/docs.

## Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = barrera real del Admin.
- D1 no es mirror de Finance/`REGISTRO`.
- Google Sheets `REGISTRO` = persistencia + formula owner para operaciones/finanzas.
- AppSheet **SD.Live Track** = cliente mobile/offline.
- Formula-owned Sheets columns nunca se escriben desde Admin forms.
- COP y USD permanecen separados.
- `Save Draft` no cambia producción; `Publish` promueve Draft → Published.
- GTM no controla navegación, branding, copy ni layout.
- Rental pricing/quote logic vive en backend.
- Rental notifica solo a `rental@sdlive.show`; Contact general a `hello@sdlive.show`.
- `/admin/` no auto-arranca Finance; Finance vive en `/admin/finance/`.
- **Generic Finance Phase 3 write-back sigue bloqueado.**
- Calendar/Operations tiene autorización separada y estrecha para controlled writes en `REGISTRO`.
- Todo UI nuevo/modificado reutiliza palette/tokens aprobados.
- Home es el contrato visual/navigation del header público.
- Media administrada por el Editor vive en Cloudflare R2; no duplicar versiones de logos/assets sin necesidad.

## Control Center actual

### `/admin/` — Dashboard
Overview ligero, CMS/system health y navegación a workspaces.

### `/admin/finance/` — Finance
Read-only sobre Google Sheets/API para SD.Live Track, COP/USD separados, sin Finance mirror en D1 y sin generic write-back.

### `/admin/calendar/` — Calendar / Operations

- lee el mismo `REGISTRO`;
- soporta `Fecha trabajo` + `Fecha fin` multi-day;
- desktop month Calendar + mobile Calendar/Agenda;
- browser payload sanitized;
- effective display puede incorporar Site Schedule blocks;
- controlled Admin create production-smoked PASS.

### `/admin/calendar/site-schedule/` — Site Schedule

- D1 `site_schedule_state`;
- website-only presentation state;
- bloques no solapados con start/end, Show Day boolean y Location;
- Calendar display + `Next` consumen effective blocks;
- source view conserva canonical `REGISTRO` dates;
- Split Work selector filtra ongoing + future en America/Bogota.

### `/admin/editor/` — Site Editor
CMS visual con Draft/Published/revisions, EN/ES, COL/INT, Media Library, Global Select, Visual Safeguards y publish failsafe.

## Source of Truth / Owner

| Área | Source of Truth | Estado |
|---|---|---|
| Código/CSS/JS/branding/fallbacks | GitHub `main` | Active |
| CMS Draft/Published | D1 `sdlive-cms-production` | Active |
| Public CMS content | validated D1 Published | Active |
| Media binaries | R2 `sdlive-media-production` | Active |
| Rental pricing/quote math | backend | Active |
| Admin access | Cloudflare Access | Active |
| Analytics público | GA4/GTM con consentimiento | Active |
| Operations/Finance persistence + formulas | Google Sheets `REGISTRO` | Active |
| Offline workflow | AppSheet `SD.Live Track` | Active |
| Finance Admin analytics | Worker read-only → Google Sheets/API | Active |
| Website Calendar presentation overrides | D1 `site_schedule_state` | Active |
| Public Show Day active state | Site Schedule + America/Bogota date | Active |
| Show Day Location | Site Schedule block only | Active |
| Future CRM | TBD; Attio candidate under evaluation | Planned |
| Future AI chatbot/agent | Dapta.ai candidate under evaluation | Planned |

## Calendar / AppSheet verified contract

Canonical source dates:

- `Fecha trabajo` = canonical start;
- `Fecha fin` = canonical end (`REGISTRO` AB);
- one-day: end = start;
- multi-day: end >= start;
- Finance billing/reminder logic uses canonical `Fecha fin`, never Site Schedule split dates.

Google Sheets formula-owned columns remain read-only to Admin forms.

## Controlled Admin create — CLOSED/PASS

Google OAuth has Sheets write authorization. PR #99 replaced unsafe `values.append` row reservation after the first real smoke exposed an occupied-row overwrite risk. Recovery was completed and the hardened flow now targets the first safe row after occupied source/workflow data while excluding formula-only occupancy.

Final E2E production smoke:

- new event wrote to `REGISTRO` row 67;
- no inherited workflow/payment values;
- AppSheet sync clean;
- Admin confirms `✓ Event created · REGISTRO row N`.

Generic Finance write-back remains blocked; this is only the narrow Calendar/Operations create path.

## Site Schedule + automatic Show Day — CLOSED/PASS

- canonical `REGISTRO` dates remain untouched;
- D1 Site Schedule is website-only presentation state;
- each block owns start/end, Show Day and Location;
- Location required when Show Day is enabled;
- public state comes from `GET /api/site/showday-status` using America/Bogota;
- endpoint/runtime failure fails closed to normal mode;
- legacy visitor Show Day toggle removed;
- Home + secondary pages share the Home-style header contract.

Real RENT source span was production-smoked as Aug 4–9, Aug 14–17, Aug 20–24, Aug 27–28.

PR #100 hides source work whose canonical end is before today from the Site Schedule selector while preserving historical Calendar data and historical overrides.

## Post-integration visual audit — ACTIVE

Full contract: `docs/roadmap/post-integration-visual-audit-2026-08-23.md`.

Required scope remains:

- public Home + current landing families;
- desktop + mobile separately;
- normal + automatic Show Day;
- EN/ES and COL/INT where applicable;
- Admin Dashboard, Finance, Calendar, Site Schedule and Editor on desktop/mobile.

### Closed visual findings

- **PR #101:** Privacy + Cookie preferences moved to bottom legal footer area — PASS.
- **PR #102:** footer logo follows Show Day; Show Day dot blinks with header cadence — PASS.
- **PR #103:** desktop footer rebalanced.
- **PR #104:** branded `SD.Live` copyright mark restored without stray literal period — PASS.
- **PR #105:** mobile Show Day Location spacing +2 px — user production QA PASS.
- **PR #107:** Rental drawer copy reframed as **quote request / cotización**, with explicit estimate-not-payment/reservation language; backend pricing and `rental@sdlive.show` unchanged.
- **PR #108:** original Rental shopping-cart icon restored — user QA PASS.
- **Rental Show Day matrix:** mobile+desktop, EN+ES — PASS. Normal mode remains later verification because Show Day is currently automatic/active.
- **PR #109:** docs reconciled to dynamic automatic Show Day; future Admin-only `Auto / Force On / Force Off` override preserved as backlog.
- **PR #110:** future testimonial card geometry/long-copy UX + generic Editor collection reordering recorded, not active.
- **PR #111/#112:** attempted Anima/Sonique neutral plate + halo treatments; user rejected final visual direction.
- **PR #114:** plate/gradient/halo treatment fully removed.
- **PR #115:** Anima + Sonique inverted to white in Show Day; user QA = very good/PASS.
- **PR #116:** inversion made mode-independent; Anima + Sonique now white in normal + Show Day, original R2 assets untouched, no other client logos affected. Show Day mobile QA PASS.

### Open audit findings

1. **Public normal-mode verification** — later verify Rental and Anima/Sonique when automatic Show Day is inactive or a future Admin-only override exists.
2. **Remaining public matrix** — continue route-family desktop/mobile + language/market review.
3. **Admin visual audit** — Dashboard, Finance, Calendar, Site Schedule and Editor still need deliberate desktop/mobile review.

Do not reopen closed Rental/Trusted findings without regression evidence.

## Future backlog recorded during this audit

### Show Day polish

- Admin-only temporary override: recommended `Auto / Force On / Force Off`, explicit/reversible/ideally TTL-based, never mutating canonical `REGISTRO` or Site Schedule blocks.
- dynamic Show Day favicon;
- remove normal-violet → Show Day-red startup pop via authoritative prepaint.

### Testimonials / Editor systemization

- consistent testimonial card geometry;
- accessible `Read more / Leer más` progressive disclosure for long quotes;
- consistent reorder capability for repeatable Editor collections, preserving Draft → Published and IDs/source ownership.

### External CRM + AI candidates

Dedicated note: `docs/roadmap/future-crm-ai-vendors-2026-08-23.md`.

- **Attio:** future CRM candidate; evaluate pricing, API/OAuth/webhooks, export/lock-in and fit against custom SD.Live CRM.
- **Dapta.ai:** future AI chatbot/agent candidate; evaluate pricing, privacy, reliability, integrations/webhooks and human handoff.
- Neither candidate may silently become owner of Finance/`REGISTRO` or write formula-owned fields.

### Calendar Agenda scope toggle

Future Admin Calendar **Agenda mode** should expose a toggle:

- **Full Month:** all effective Agenda items in selected month, including past items;
- **Current + Future:** ongoing + future only; hide items whose effective end is before today.

Guardrails:

- “today” evaluated in America/Bogota;
- presentation/filter only;
- no deletion/mutation of `REGISTRO`, AppSheet or Site Schedule history;
- ongoing multi-day work remains visible;
- default choice TBD at implementation time;
- desktop/mobile + accessibility considered together.

## Parallel/open operational follow-ups

- GitHub issue #83: invoice eligibility + reminders based on day after canonical `Fecha fin`.
- Finance Phase 2 real-use observation.
- AppSheet workflow/date-display follow-ups stay separate from Site Schedule presentation logic.
- Controlled Calendar edit/workflow actions only after visual stabilization PASS.
- CRM/Projects/Rental Admin only after source-of-truth design.
- Search/analytics/indexation follow-up as already documented.

## Roadmap / docs relevantes

- `README.md` — architecture/current operating overview.
- `ROADMAP_MASTER_CHECKLIST.md` — detailed historical/future backlog.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active visual audit contract.
- `docs/roadmap/future-crm-ai-vendors-2026-08-23.md` — Attio/Dapta future evaluation.
- `docs/checkpoints/visual-audit-progress-pr116-2026-08-23.md` — current detailed audit checkpoint.

## Continuation point

**Continue the active visual audit in sequence.** Rental quote UX and Anima/Sonique contrast are closed for the currently testable Show Day state. Next, continue the remaining public matrix and then the mandatory Admin desktop/mobile audit, one manual QA action at a time. Normal-mode-specific checks remain explicitly pending until normal mode is available; do not falsely mark them PASS.
