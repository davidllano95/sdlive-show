# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Registra el estado actual verificable, el gate activo y las invariantes. El detalle histórico/futuro se conserva en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última revisión integral | **2026-08-23 — America/Bogota** |
| Rama operativa | `main` |
| Último milestone público smokeado | **PR #96 — shared Home header on secondary public pages — PASS** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **Finance Phase 2 CLOSED/PASS · Calendar read-only CLOSED/PASS · Site Schedule + automatic Show Day CLOSED/PASS** |
| Active Gate | **Calendar controlled create — Google OAuth Sheets write authorization** |
| Después | one create → Google Sheet → AppSheet smoke; then controlled edit/workflow actions |
| Bloqueado | **Generic Finance Phase 3 write-back remains BLOCKED** |

## Convención y precedencia

Fechas operativas usan **America/Bogota** salvo indicación explícita. En conflicto, prevalece:

1. código actual + comportamiento verificable en producción;
2. schema/config desplegada;
3. este archivo;
4. `README.md`;
5. `ROADMAP_MASTER_CHECKLIST.md` para backlog/historia;
6. prompts/ideas/referencias.

Un documento futuro no autoriza por sí solo reemplazar una implementación funcional.

## Cómo retomar el proyecto

1. Leer este archivo y `README.md`.
2. Consultar `main` HEAD real.
3. Revisar el checkpoint del gate activo.
4. Aplicar Change Safety Gate antes de tocar arquitectura existente.
5. No rehacer milestones cerrados sin evidencia de regresión.
6. Hacer un solo smoke/manual step a la vez.
7. Al cerrar un milestone material, actualizar evidencia y docs.

## Architectural invariants — constitución del proyecto

- **Estabilidad > novedad.**
- GitHub `main` es code truth.
- Cloudflare Access es la barrera real del Admin.
- D1 no debe convertirse en un mirror de Finance/REGISTRO.
- Google Sheets `REGISTRO` sigue siendo persistencia + formula owner para operaciones/finanzas.
- AppSheet **SD.Live Track** sigue siendo el cliente mobile/offline.
- Formula-owned Sheets columns nunca se escriben desde Admin forms.
- COP y USD permanecen separados.
- `Save Draft` nunca cambia producción; `Publish` promueve Draft → Published.
- GTM no controla navegación, branding, copy ni layout.
- Rental pricing/quote logic vive en backend.
- Rental notifica solo a `rental@sdlive.show`; Contact general a `hello@sdlive.show`.
- `/admin/` no debe auto-arrancar Finance; Finance vive en `/admin/finance/`.
- **Generic Finance Phase 3 write-back sigue bloqueado.**
- Calendar/Operations tiene una autorización separada y estrecha para escribir rows mapeadas en el mismo `REGISTRO`.
- Todo UI nuevo/modificado reutiliza la palette/tokens aprobados de su superficie.

## Arquitectura actual del Control Center

### `/admin/` — Dashboard

Overview ligero, health CMS/D1 y navegación a workspaces. No carga el runtime pesado de Finance.

### `/admin/finance/` — Finance

Workspace dedicado para **SD.Live Track**:

- read-only sobre Google Sheets/API;
- COP/USD separados;
- cash, receivables, aging, collection queue, payment performance, fees y Tax Reserve planning;
- EN/ES + selector anual;
- no expone Notes, `NUM CONTACTO`, IDs internos ni tokens OAuth;
- no crea D1 finance mirror ni generic write-back.

### `/admin/calendar/` — Calendar / Operations

- lee el mismo `REGISTRO`;
- soporta `Fecha trabajo` + `Fecha fin` multi-day;
- month Calendar desktop/mobile + Agenda mobile;
- payload browser sanitized;
- effective display puede incorporar Site Schedule blocks;
- controlled create está implementado pero bloqueado por el OAuth refresh token read-only.

### `/admin/calendar/site-schedule/` — Site Schedule

Website-only operations layer:

- D1 own table `site_schedule_state`;
- no escribe splits, Show Day ni Location a Sheets/AppSheet;
- permite dividir un source span en bloques no solapados;
- cada block tiene start/end, Show Day boolean y Location;
- Location required when Show Day is enabled;
- Calendar display + `Next` usan effective blocks;
- source view mantiene canonical REGISTRO dates.

### `/admin/editor/` — Site Editor

CMS visual actual con Draft/Published/revisions, EN/ES, COL/INT, Media Library, Global Select, Visual Safeguards y publish failsafe.

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
| Public Show Day active state | derived from Site Schedule + America/Bogota date | Active |
| Show Day Location | Site Schedule block only | Active |
| Future CRM/Projects | TBD before implementation | Planned |

## Evidence matrix — current high-risk systems

| Feature | Estado | Evidence |
|---|---|---|
| Finance Phase 2 read-only | CLOSED/PASS | PR #60–#63 + reconciliation checkpoint |
| Dedicated Finance workspace | CLOSED/PASS | Finance workspace checkpoint + desktop/mobile QA |
| AppSheet multi-day | PASS | `Fecha fin` setup + sync/manual validation |
| Calendar read-only | CLOSED/PASS | PR #82/#84/#86/#87/#88 + production QA |
| Calendar controlled create | Implemented, OAuth-gated | PR #89 + OAuth checkpoint |
| Site Schedule | CLOSED/PASS | PR #93 + storage fix #95 + production QA |
| Automatic Show Day + Location | CLOSED/PASS | Site Schedule checkpoint + Home QA |
| Public landing header parity | PASS | PR #96 + theatre landing production QA |
| Finance Phase 3 generic write-back | **BLOCKED** | explicit architecture rule |
| Billing/reminder end-date correction | OPEN | GitHub issue #83 |

## Calendar / AppSheet verified contract

### Canonical source dates

- `Fecha trabajo` = canonical start.
- `Fecha fin` = canonical end in `REGISTRO` column AB.
- one-day: end = start.
- multi-day: end >= start.
- Finance billing/reminder logic must use canonical `Fecha fin`, not Site Schedule overrides.

### Controlled Admin create

PR #89 implemented authenticated `POST /api/admin/calendar/events` with:

- source-mapped write fields only;
- server-side validation;
- fixed safe initial workflow state;
- AppSheet-compatible unique ID;
- idempotent request ID;
- no generic raw workflow-date writes;
- no formula-column writes;
- no D1 persistence fallback.

Production smoke reached Google Sheets but correctly stopped because the existing OAuth authorization is read-only.

Checkpoint: `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md`.

## Site Schedule + automatic Show Day — CLOSED/PASS

### Locked decision

Site Schedule is **website-only** and independent of AppSheet.

A broad source event can be split for public/Admin Calendar presentation without changing canonical `REGISTRO` dates. Each effective block independently controls Show Day and Location.

### Storage / security

- storage: D1 `site_schedule_state`;
- no CMS-entry dependency after production write fix;
- Admin mutations remain Cloudflare Access protected;
- no Sheet/AppSheet writes from Site Schedule;
- public Show Day payload contains only safe active/date/location metadata.

### Public runtime

- endpoint: `GET /api/site/showday-status`;
- evaluates today in America/Bogota;
- fails closed to normal mode;
- legacy manual visitor toggle is removed at the edge;
- Home and secondary public pages share the same visual header/navigation contract;
- active Location appears only while Show Day is active.

### Production QA — PASS

Real RENT source span was saved as four Site Schedule blocks:

- Aug 4–9;
- Aug 14–17;
- Aug 20–24;
- Aug 27–28.

Confirmed in production:

- D1 save works;
- Calendar displays the four blocks with gaps;
- `Next` follows the active effective block;
- all Show Day switches off = normal public mode and no legacy manual button;
- enabling Show Day on an active block activates the site automatically;
- Location displays correctly;
- theatre/secondary page header now looks like Home, preserving original navigation and making the site feel continuous.

Checkpoint: `docs/checkpoints/site-schedule-showday-2026-08-23.md`.

## Known low-priority Show Day polish

Approved backlog, **not current gate**:

- dynamic favicon that switches with Show Day;
- eliminate startup violet→red popping by resolving authoritative Show Day state before visible first paint, ideally at the edge;
- favicon should be tied to the same prepaint state so favicon and page visual state never disagree.

## Change Safety Gate

Antes de modificar una funcionalidad existente:

- ¿ya existe y dónde?
- ¿quién la consume?
- ¿qué datos persisten y quién los posee?
- ¿qué APIs/rutas/SEO/visual behavior afecta?
- ¿qué tests/fallbacks existen?
- ¿puede hacerse incrementalmente?
- ¿hay rollback claro?
- ¿cambia una fuente de verdad?

Si una respuesta importante es desconocida: **investigar, no asumir**.

## Active Gate — Google OAuth Sheets write permission

The next step is deliberately narrow. Do not open another milestone first.

1. Re-authorize the **existing** Google OAuth client with Sheets write scope:
   `https://www.googleapis.com/auth/spreadsheets`
2. Replace only the refresh token used by the Worker connection if required.
3. Retry exactly one controlled Admin Calendar create.
4. Verify the new row in Google Sheets.
5. Sync AppSheet and verify the same persisted row.
6. If PASS, close controlled create and then design controlled edit / explicit workflow actions.

Do **not** change spreadsheet source of truth, D1 finance architecture, formula ownership or generic Finance permissions during this OAuth step.

## Parallel/open follow-ups

- GitHub issue #83: invoice eligibility + reminders based on day after canonical `Fecha fin`.
- Finance Phase 2 real-use observation.
- Dynamic Show Day favicon + no-pop prepaint polish.
- CRM/Projects/Rental Admin only after source-of-truth design.
- Search/analytics/indexation follow-up as already documented.

## Roadmap / docs relevantes

- `README.md` — architecture/current operating overview.
- `ROADMAP_MASTER_CHECKLIST.md` — detailed historical/future backlog.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `docs/checkpoints/site-schedule-showday-2026-08-23.md` — closed Site Schedule/Show Day milestone.
- `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md` — current active gate.
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md` — field ownership.

## Milestones recientes

- **2026-08-22:** Finance audit → repair + integrate decision closed.
- **2026-08-22:** rename to SD.Live Track closed.
- **2026-08-22:** field/source mapping closed.
- **2026-08-22/23:** Finance Phase 2 read-only Admin closed/PASS.
- **2026-08-23:** dedicated Finance workspace closed/PASS.
- **2026-08-23:** AppSheet multi-day model PASS.
- **2026-08-23:** Calendar read-only desktop/mobile/palette closed/PASS.
- **2026-08-23:** controlled Calendar create implementation merged; production OAuth write gate identified.
- **2026-08-23:** Site Schedule + automatic Show Day + Location closed/PASS after production QA.
- **2026-08-23:** secondary public headers unified with Home and theatre landing QA PASS.

## Siguiente trabajo

**Continue the OAuth gate. One manual action at a time.**
