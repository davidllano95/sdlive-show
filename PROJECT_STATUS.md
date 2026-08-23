# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Registra el estado actual verificable, el gate activo y las invariantes. El detalle histórico/futuro se conserva en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última revisión integral | **2026-08-23 — America/Bogota** |
| Rama de trabajo actual | `feat/admin-finance-workspace` |
| Último runtime de producción smokeado | `8ff23d971b7e49e82cb625ac9ecfe50b016e9945` — PR #69, Admin móvil base + Finance manual separados |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **P3.0–P3.4 CLOSED · Security CLOSED · Finance audit/rename/source map CLOSED · Finance Phase 2 CLOSED/PASS** |
| Trabajo activo | **Admin workspace separation: Dashboard ligero + Finance dedicado + Site Editor** |
| Active Gate | **F — production-smoke `/admin/finance/` como workspace independiente** |
| Después | volver a observación real de Finance Phase 2; **Phase 3 write-back sigue BLOCKED** |
| Track paralelo elegible | Availability/WhatsApp, solo con promoción explícita |

## Convención y precedencia

Fechas operativas usan **America/Bogota** salvo indicación explícita. GitHub timestamps pueden estar en UTC.

En conflicto, prevalece:

1. código actual + comportamiento verificable en producción;
2. schema/config desplegada;
3. este archivo;
4. `README.md`;
5. `ROADMAP_MASTER_CHECKLIST.md` para backlog/historia;
6. prompts/ideas/referencias.

Un documento futuro no autoriza por sí solo reemplazar una implementación funcional.

## Cómo retomar el proyecto

1. Leer este archivo y `README.md`.
2. Consultar `main` HEAD real; no asumir que un SHA documental sigue siendo HEAD.
3. Revisar solo diffs funcionales posteriores al último runtime smokeado.
4. Aplicar Change Safety Gate antes de tocar arquitectura existente.
5. No rehacer milestones cerrados sin evidencia de regresión.
6. Continuar por el gate **F** actual.
7. Backlog/Future/Vision no equivale a autorización.
8. Al cerrar un milestone material, actualizar evidencia y hacer smoke de producción.

## Architectural invariants — constitución del proyecto

- **Estabilidad > novedad.**
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics/media si la base actual puede extenderse.
- No crear fuentes paralelas de pricing, CMS, auth, analytics, media o finanzas.
- `Save Draft` nunca cambia producción; `Publish` promueve Draft → Published.
- Public CMS usa Published, nunca Draft.
- Published Home debe evitar static→CMS popping; SSR es preferido y `cms-hydration.js` permanece como fallback donde haga falta.
- **Global Select** debe llevar al owner CMS/item exacto, incluso desde otra sección.
- Established visual aesthetics son contratos; reconstrucciones vulnerables extienden Safeguards + tests.
- Rental pricing/quote logic vive en backend.
- Rental notifica **solo a `rental@sdlive.show`**; Contact general a `hello@sdlive.show`.
- Cloudflare Access es la barrera real del Admin.
- GTM no controla navegación, branding, copy ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación vía GTM.
- Retirar migradores no autoriza borrar fallbacks críticos.
- **Finance Admin es read-only hasta aprobación explícita de Phase 3.**
- **`/admin/` no debe auto-arrancar Finance. Finance pertenece a `/admin/finance/`.**

## Admin / Control Center — arquitectura actual

### `/admin/` — Dashboard

Objetivo: overview rápido del Control Center, health CMS/D1, estado Hero, revisiones y enlaces a workspaces.

Contrato actual:

- carga solo las APIs core del Dashboard;
- no carga `finance-dashboard.js` ni endpoints Finance;
- debe permanecer ligero en desktop y móvil;
- contiene Quick Access a Finance y Site Editor.

### `/admin/finance/` — Finance

Workspace dedicado para **SD.Live Track**.

- read-only sobre el underlying Google Sheet/API;
- COP/USD estrictamente separados;
- cash, producción, clientes, receivables, aging, collection queue, payment performance y fees;
- selector anual;
- EN/ES;
- Tax Reserve privado configurable como **reserva de planeación**, no “taxes owed”;
- no expone Notes, `NUM CONTACTO`, IDs internos ni credenciales/tokens;
- no crea D1 finance mirror ni write-back.

Checkpoint de arquitectura: `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md`.

### `/admin/editor/` — Site Editor

- CMS visual actual;
- EN/ES, COL/INT, Desktop/Mobile;
- Select/Interact, Focus, paneles;
- Draft/Published/revisions;
- reusable R2 Media Library;
- Visual Safeguards + automatic publish failsafe;
- navegación al Finance sibling workspace.

### Otros módulos

Inbox sigue como bridge a Workspace/Gmail. Leads/CRM, Rental Admin, Projects, Calendar, Analytics y SEO continúan Planned/Backlog salvo promoción explícita.

## Source of Truth / Owner

| Área | Source of Truth | Estado |
|---|---|---|
| Código/CSS/JS/branding/fallbacks | GitHub `main` | A |
| CMS Draft/Published estructurado | D1 `sdlive-cms-production` | A |
| Contenido público CMS | D1 `published_json` validado | A |
| Media editable binaria | R2 `sdlive-media-production` | A |
| Metadata/referencias media | D1 | A |
| Rental pricing / quote math | Backend | A |
| Admin access | Cloudflare Access | A |
| Analytics público | GA4/GTM con consentimiento | A |
| Finance persistencia/fórmulas | Google Sheets `REGISTRO` | A — Phase 2 |
| Finance offline/workflow | AppSheet `SD.Live Track` | A |
| Finance analytics Admin | Worker read-only → underlying Google Sheet/API | A |
| Finance Tax Reserve settings | D1 privado de settings | A; planeación, no deuda fiscal |
| Future CRM | TBD | D |
| Future Lead→Quote→Project→Invoice | TBD antes de implementar | D |
| Future owner availability | D1 `availability_state` solo si se implementa | D |

## Evidence matrix — sistemas de alto riesgo

| Feature | Estado | Evidence |
|---|---|---|
| Hero CMS | Producción | D1 + `worker-entry.js` + APIs + smoke |
| Trusted / Supported Brands | Producción | D1/R2 + edge + smoke |
| Testimonials | Producción | D1/R2 + edge + smoke |
| About/Services/International/Work | Producción | `core-sections-*` + tests/smoke |
| Rental/Contact presentation CMS | Producción | `home-presentation-*` + smoke |
| Rental transactional flow | Producción | backend/cart + normal-submission smoke |
| Global Select | Producción | PR #36 + tests/manual smoke |
| Visual Safeguards | Producción | guard CSS/JS + Editor panel/tests |
| Automatic publish failsafe | Producción | Editor runtime + tests |
| Reusable Media Library | Producción/editor | R2 + media API + PR #33 |
| P3.1 Consent parity | Closed | PR #41 + private-window smoke |
| P3.2 public staging strip | Closed | PR #42 + View Source/Admin smoke |
| P3.3 mobile critical rendering | Closed | PR #46/#47 + PageSpeed/smoke |
| P3.4 responsive images | Closed | PR #50/#51 + Mobile 90/LCP 3.1 s |
| Security baseline | Closed | PR #53/#54 + Contact/Rental smoke |
| Finance audit | Closed | `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md` |
| SD.Live Track rename | Closed | rename checkpoint + AppSheet sync/offline smoke |
| Finance source mapping | Closed | `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md` |
| Finance Phase 2 read-only | Closed/PASS | PR #60–#63 + finance checkpoint + 57-row reconciliation |
| Finance analytics/dashboard | Implemented | annual COP/USD, receivables, client concentration, payment performance, fees, Tax Reserve |
| Finance i18n freeze | Fixed; desktop smoke PASS | PR #68; global MutationObserver removed |
| Admin mobile startup contention | Isolated | PR #69; iPhone core Admin A, manual Finance A |
| Dedicated Finance workspace | Current F hardening gate | `admin/finance/`, `admin/finance-page.js`, workspace checkpoint; production smoke pending |
| Finance Phase 3 write-back | **BLOCKED** | requires real-use trust + draft-first/idempotent contract |
| Availability-Aware Contact | Eligible D | dedicated roadmap spec; no runtime/schema yet |
| CRM / Projects / Rental Admin | Not implemented | disabled/planned Admin modules |

## Finance — current verified contract

### Audit / architecture decision

Full 2026-08-22 audit reviewed 12 Sheets tabs, 57 records, 11 Actions, 3 Bots, 11 Views, 10 Slices and critical collection logic. It found zero P0 data-loss/corruption issues.

**Decision: repair + integrate; do not rewrite.** AppSheet’s offline capture is an asset to preserve.

### Phase 1 source mapping

- `REGISTRO` remains current finance persistence.
- AppSheet remains offline capture/workflow.
- durable Key = AppSheet `ID` via `UNIQUEID()`; never `_RowNumber`.
- Sheets-calculated physical fields remain Sheets-owned/read-only to Admin.
- AppSheet virtual fee fields may be recomputed for display but do not create a second persistence owner.
- notification Bots do not mutate `REGISTRO`.

### Phase 2 read-only Admin

Production reconciliation at closeout:

- 57 total records;
- 44 paid;
- 3 to invoice — COP 5,600,000 gross;
- 4 collectible — COP 1,150,000 net;
- 6 workflow-blocked — COP 2,490,000 net;
- received COP 19,822,164 + USD 23,922.27;
- fees COP 52,014 + USD 5.99;
- unsupported currencies: 0.

The Phase 2 finance API/UI is useful and verified. It is now in **real-use observation**.

### 2026-08-23 Admin stability finding

Observed symptom: `/admin/` stalled on iPhone and desktop Chrome could show Page Unresponsive while individual APIs stayed fast.

Evidence sequence:

1. all core Admin endpoints and `dashboard.js` loaded quickly when opened directly;
2. PR #68 removed Finance i18n whole-DOM observation → desktop Chrome PASS;
3. mobile still stalled when Finance autoloaded;
4. PR #69 deferred Finance on compact screens → iPhone base Admin PASS;
5. tapping Load Finance Dashboard → Finance itself PASS and remained fluid.

Conclusion: the persistent mobile issue was **startup contention from colocating Dashboard + Finance**, not broken Cloudflare Access, a failed Finance API, or inherently unusable Finance rendering.

Permanent architecture: **Dashboard / Finance / Site Editor as sibling workspaces.**

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
- ¿requiere migration de data/media?

Si una respuesta importante es desconocida: **investigar, no asumir**.

Para CMS/editor, smoke según aplique: EN/ES, COL/INT, Desktop/Mobile, Draft ≠ live, Publish = live, Safeguards/fallback y Select same-section + cross-section + exact item.

## Roadmap activo y bloqueos

### F — actual: Finance workspace separation / production smoke

Implementación esperada:

- [x] crear `/admin/finance/`;
- [x] Finance como tab/workspace sibling de Dashboard y Editor;
- [x] retirar Finance runtime del arranque de `/admin/`;
- [x] mantener Quick Access a Finance desde Dashboard;
- [x] mantener Finance visible desde Site Editor nav;
- [x] preservar APIs/datos/read-only/EN-ES/COP-USD/Tax Reserve;
- [x] regresiones para aislamiento y versionado de assets;
- [ ] merge con CI verde;
- [ ] smoke desktop `/admin/`;
- [ ] smoke desktop `/admin/finance/`;
- [ ] smoke iPhone `/admin/`;
- [ ] smoke iPhone `/admin/finance/`;
- [ ] smoke Site Editor nav;
- [ ] validar year selector + ES/EN en Finance.

### Después del smoke

No existe autorización automática para Finance Phase 3. El orden vuelve a:

1. usar Phase 2 en trabajo real;
2. observar calidad/fiabilidad y utilidad;
3. solo después diseñar/aprobar write-back draft-first/idempotente.

Availability/WhatsApp puede promoverse como track independiente si el usuario lo decide explícitamente.

## Backlog prioritario preservado

### Finance / Control Center

- Phase 3 draft-first/write-once rental→finance, solo después de trust.
- Idempotency/duplicate protection + rollback antes de cualquier write-back.
- Native CRM/Projects/Calendar/Rental relationships cuando source-of-truth esté definido.
- Automatic Show Day desde fuente aprobada + override manual.
- Finance notification delivery hardening sin duplicar lógica/estado.
- Business analytics/forecast/P&L solo cuando existan gastos/source data suficientes.

### Availability / AI

- Availability-Aware Contact Widget: D1 availability source, owner WhatsApp hard gate, AI lead qualification only, existing `leads` table, no pricing/catalog/finance authority.
- Dapta.ai u otro assistant solo después de revalidar costo/privacidad/API/reliability/handoff.

### CMS / Editor

- drag/drop, grid, resize, spacing/alignment;
- independent Desktop/Mobile layouts;
- generic show/hide por device/market;
- undo/redo, rollback UI, full-page Draft, templates;
- autosave Draft, diff, scheduled Publish, shortcuts;
- header/floating-control management;
- Media Library reference-safe delete, crop/focal/alt/OG;
- opt-in remove.bg solo server-side y preservando original.

### Rental / conversion

- aclarar RFQ vs checkout;
- rechazar request totalmente vacío;
- compatibility recommendations sin auto-add silencioso;
- future Rental Admin pricing rules con backend authoritative;
- inventory/calendar/double-booking/PDF quote.

### SEO / analytics / platform

- Bing recheck 2026-08-28 a 2026-09-04 antes de diagnosticar crawl problem;
- GSC/Bing/GA4 integrity e internal traffic;
- accessibility findings;
- Home cache solo evidence-driven;
- Crawler Hints/IndexNow junto con estrategia de invalidación;
- observability/backups/security testing incremental;
- Carrd coherence + canonical HTML CV;
- no mass keyword/AI filler.

## Roadmap / docs relevantes

- `README.md` — architecture/current operating overview.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog preservation.
- `docs/roadmap/sdlive-control-center.md` — Control Center sequence.
- `docs/roadmap/availability-aware-contact-widget.md` — eligible parallel track.
- `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md` — finance audit decision.
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md` — field ownership.
- `docs/checkpoints/sdlive-track-admin-finance-readonly-2026-08-22.md` — Phase 2 closeout.
- `docs/checkpoints/admin-finance-freeze-fix-2026-08-23.md` — freeze investigation/fix.
- `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md` — current architecture milestone.

## Milestones recientes

- **2026-08-21:** P2.7 Global Select closed + smoke.
- **2026-08-21:** P2.8 Home R2 migration-tool cleanup closed + smoke.
- **2026-08-21:** P3.0 public/SEO/performance audit closed.
- **2026-08-21:** P3.1 Consent parity closed.
- **2026-08-21:** P3.2 public staging strip closed.
- **2026-08-22:** P3.3 mobile critical rendering closed.
- **2026-08-22:** P3.4 responsive image delivery closed.
- **2026-08-22:** Security CSP/headers + public form rate limiting closed.
- **2026-08-22:** Finance audit → repair + integrate decision closed.
- **2026-08-22:** rename to SD.Live Track closed.
- **2026-08-22:** field/source mapping closed.
- **2026-08-22:** Finance Phase 2 read-only Admin insights closed/PASS.
- **2026-08-23:** Finance bilingual observer freeze fixed; desktop PASS.
- **2026-08-23:** mobile base Admin + Finance sequential load both PASS, proving startup isolation direction.
- **2026-08-23:** dedicated Finance workspace architecture approved and implementation in progress.

## Siguiente trabajo

**Terminar este milestone, no abrir otro.**

1. CI del PR de workspace Finance.
2. merge a `main`.
3. esperar deploy.
4. desktop: `/admin/` debe cargar rápido y sin Finance embebido.
5. desktop: Finance tab → `/admin/finance/`, datos/ES-EN/year normal.
6. iPhone: repetir `/admin/` y Finance tab; ambos deben permanecer fluidos.
7. Site Editor: Finance tab visible; Editor no debe cambiar de comportamiento.
8. si todo PASS, cerrar el gate y volver a Finance Phase 2 real-use observation.

**No iniciar write-back por el simple hecho de cerrar este milestone.**
