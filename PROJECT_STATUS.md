# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo resume el estado verificable, el gate activo, las invariantes y el punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última revisión integral | **2026-08-23 — America/Bogota** |
| Rama operativa | `main` |
| `main` verificado al actualizar | **PR #105 merged** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **Finance Phase 2 CLOSED/PASS · Calendar read-only CLOSED/PASS · controlled create CLOSED/PASS · Site Schedule + automatic Show Day CLOSED/PASS · Site Schedule source filter PASS** |
| Active Gate | **post-integration detailed visual audit — ACTIVE** |
| Estado del audit | **public mobile Show Day review in progress; Admin audit still required** |
| Después del audit | close P0/P1 findings, preserve P2/P3 backlog, then controlled Calendar edit/workflow actions |
| Bloqueado | **Generic Finance Phase 3 write-back remains BLOCKED** |

## Convención y precedencia

Fechas operativas usan **America/Bogota** salvo indicación explícita. En conflicto, prevalece:

1. código actual de GitHub `main` + comportamiento verificable en producción;
2. schema/config desplegada;
3. este archivo;
4. `README.md`;
5. `ROADMAP_MASTER_CHECKLIST.md` para backlog/historia;
6. prompts/ideas/referencias.

Un documento futuro no autoriza por sí solo reemplazar una implementación funcional.

## Regla de continuidad

- **Estabilidad > novedad.**
- Hacer un solo smoke/manual step a la vez.
- Si durante el gate activo aparece un defecto de la misma superficie, corregirlo dentro del audit según severidad; no saltar a milestones no relacionados.
- P0/P1 se corrigen antes de cerrar el audit.
- P2/P3 se registran y se implementan en secuencia coherente, sin perderlos ni convertirlos arbitrariamente en prioridad máxima.
- Cada milestone material actualiza evidencia/docs.

## Architectural invariants — constitución del proyecto

- GitHub `main` es code truth.
- Cloudflare Access es la barrera real del Admin.
- D1 no debe convertirse en mirror de Finance/`REGISTRO`.
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
- Todo UI nuevo/modificado reutiliza palette/tokens aprobados de su superficie.
- Home es el contrato visual/navigation del header público; secondary/SEO pages deben sentirse como la misma página/sistema.

## Control Center actual

### `/admin/` — Dashboard
Overview ligero, CMS/system health y navegación a workspaces. No carga Finance pesado automáticamente.

### `/admin/finance/` — Finance
Workspace dedicado para **SD.Live Track**:

- read-only sobre Google Sheets/API;
- COP/USD separados;
- no expone Notes, `NUM CONTACTO`, IDs internos ni OAuth secrets;
- no D1 finance mirror;
- no generic write-back.

### `/admin/calendar/` — Calendar / Operations

- lee el mismo `REGISTRO`;
- soporta `Fecha trabajo` + `Fecha fin` multi-day;
- desktop month Calendar + mobile Calendar/Agenda;
- browser payload sanitized;
- effective display puede incorporar Site Schedule blocks;
- controlled Admin create ya está production-smoked PASS.

### `/admin/calendar/site-schedule/` — Site Schedule

- D1 own table `site_schedule_state`;
- no escribe splits, Show Day ni Location a Sheets/AppSheet;
- divide source spans en bloques no solapados;
- cada block tiene start/end, Show Day boolean y Location;
- Calendar display + `Next` usan effective blocks;
- source view mantiene canonical `REGISTRO` dates;
- Split Work/source selector ya filtra a ongoing + future en America/Bogota.

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
| Future CRM/Projects | TBD before implementation | Planned |

## Calendar / AppSheet verified contract

Canonical source dates:

- `Fecha trabajo` = canonical start;
- `Fecha fin` = canonical end (`REGISTRO` AB);
- one-day: end = start;
- multi-day: end >= start;
- Finance billing/reminder logic must use canonical `Fecha fin`, never Site Schedule split dates.

Google Sheets formula-owned columns remain read-only to Admin forms.

## Controlled Admin create — CLOSED/PASS

Initial implementation landed in PR #89. Google OAuth was then re-authorized with Sheets write scope and the Worker refresh token was replaced.

The first real write exposed a P0 row-reservation bug: Google `values.append` against the ID-only range selected an occupied early row and inherited stale workflow/payment data. Recovery and hardening were completed before continuing.

### Safety recovery + fix

- affected historical row was manually restored from the pre-smoke Sheet copy;
- AppSheet sync confirmed the restored record again;
- PR #99 removed `values.append` row reservation;
- new rows are placed after the last occupied source/workflow row while excluding formula-only occupancy;
- workflow-only residue counts as occupied;
- formula-owned columns remain untouched;
- idempotent replay is preserved;
- Admin now shows `✓ Event created · REGISTRO row N`.

### End-to-end production smoke

A new controlled create wrote to `REGISTRO` row 67, showed no inherited workflow/payment values, synced to AppSheet cleanly and therefore closed controlled create as **PASS**.

Generic Finance write-back remains blocked; this is only the narrow Calendar/Operations create path.

## Site Schedule + automatic Show Day — CLOSED/PASS

Locked architecture:

- canonical `REGISTRO` dates remain untouched;
- D1 Site Schedule is website-only presentation state;
- each block owns start/end, Show Day and Location;
- Location required when Show Day is enabled;
- public state comes from `GET /api/site/showday-status` using America/Bogota;
- failure fails closed to normal mode;
- legacy visitor Show Day toggle is removed;
- Home and secondary public pages share the Home-style header contract.

Real RENT source span was production-smoked as four display blocks: Aug 4–9, Aug 14–17, Aug 20–24, Aug 27–28.

### Split Work filter — PASS

PR #100 now hides source work whose canonical end is before today from the Site Schedule selector, while preserving historical Calendar data and saved historical overrides. Search operates only across eligible ongoing/future source work.

## Post-integration visual audit — ACTIVE

Full contract: `docs/roadmap/post-integration-visual-audit-2026-08-23.md`.

The audit remains mandatory across:

- public Home + all current public landing families;
- desktop + mobile as separate layouts;
- normal + automatic Show Day;
- EN/ES and COL/INT where applicable;
- Admin Dashboard, Finance, Calendar, Site Schedule and Editor on desktop/mobile.

### Closed visual findings so far

- **PR #101:** Privacy + Cookie preferences moved to the bottom legal footer area — PASS.
- **PR #102:** footer logo follows Show Day and the Show Day dot blinks with the header cadence — PASS.
- **PR #103:** desktop footer rebalanced into clearer columns.
- **PR #104:** branded `SD.Live` copyright mark restored without the stray literal period regression — PASS.
- **PR #105:** mobile Show Day Location moved 2 px farther below the logo; user production check = **A / PASS**.

### Open audit findings currently tracked

These belong to the active audit and **must not reorder unrelated roadmap priorities**:

1. **Rental quote UX/header clarity — open.** Mobile Rental drawer header is too tall/verbose (`Carrito de alquiler` + multi-line `Arma tu solicitud de alquiler`). Compact the hierarchy and make it unmistakable that this is a **quotation/request flow**, not an ecommerce purchase/cart checkout. Keep backend pricing/quote ownership and `rental@sdlive.show` unchanged.
2. **Trusted By / supported-brand contrast — open verification/fix.** User observed at least two low-contrast marks on mobile Show Day and suspects desktop too. Verify desktop + mobile and normal + Show Day before applying the smallest brand-safe contrast treatment.
3. **Admin visual audit — not yet closed.** Dashboard, Finance, Calendar, Site Schedule and Editor still need deliberate desktop/mobile review.
4. **Full public matrix — not yet closed.** Continue normal/Show Day and desktop/mobile route-family review; do not treat isolated screenshot PASS as full audit closure.

## Known low-priority Show Day polish

Approved backlog, **not current gate**:

- dynamic Show Day favicon;
- remove startup normal-violet → Show Day red popping by resolving authoritative state before visible paint;
- favicon should use the same prepaint decision so visual state and favicon never disagree.

## Parallel/open operational follow-ups

- GitHub issue #83: invoice eligibility + reminders based on day after canonical `Fecha fin`.
- Finance Phase 2 real-use observation.
- AppSheet workflow/date-display follow-ups remain separate from Site Schedule presentation logic; diagnose from actual AppSheet config before changing expressions.
- CRM/Projects/Rental Admin only after source-of-truth design.
- Search/analytics/indexation follow-up as already documented.

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

## Roadmap / docs relevantes

- `README.md` — architecture/current operating overview.
- `ROADMAP_MASTER_CHECKLIST.md` — detailed historical/future backlog.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active visual audit contract.
- `docs/checkpoints/site-schedule-showday-2026-08-23.md` — closed Site Schedule/Show Day milestone.
- `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md` — historical OAuth gate evidence; no longer active.

## Recent milestones

- Finance audit → repair + integrate decision closed.
- SD.Live Track rename + field/source mapping closed.
- Finance Phase 2 read-only Admin closed/PASS.
- dedicated Finance workspace closed/PASS.
- AppSheet multi-day model PASS.
- Calendar read-only desktop/mobile/palette closed/PASS.
- Site Schedule + automatic Show Day + Location closed/PASS.
- shared public Home header parity PASS.
- Google OAuth Sheets write authorization completed.
- controlled Calendar create recovered/hardened in PR #99 and end-to-end production smoke PASS.
- Site Schedule ongoing/future selector PR #100 production PASS.
- visual audit now ACTIVE; footer fixes PR #101–#104 and mobile Show Day Location PR #105 are already closed/PASS.

## Continuation point

**Continue the active visual audit in sequence.** The next open public finding is the Rental quote drawer/header clarity. Implement findings as they are reached within the audit; do not jump to unrelated milestones. After public + Admin matrices are complete and all P0/P1 items are closed, update docs and proceed to controlled Calendar edit/workflow actions.