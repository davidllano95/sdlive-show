# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo está resuelto, qué falta y cuál es el siguiente gate. Se actualiza al cerrar milestones o ante cambios materiales de arquitectura/alcance, no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-21 |
| Rama verificada | `main` |
| Commit de producción verificado | `c0a7cf5eae070d9acbb1b5401f6fd18f4dbee7be` |
| Trabajo activo | `feat/p2-7-global-select-safety-policy` |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Milestone actual | P2 — ampliar el Editor/CMS de forma incremental |
| Estado | **P2.6 Rental + Contact CMS CERRADO y smokeado en producción; PR #35 corrigió market key D1** |
| Active Gate | **P2.7 — Global Select + política permanente de Change Safety / evidencia** |
| Gate posterior | **Home CMS closeout inventory antes de autorizar el siguiente bloque** |

## Regla de precedencia

En caso de conflicto, prevalece este orden:

1. **Código actual + comportamiento verificable en producción.**
2. **Schema, migrations y configuración desplegada actual.**
3. **Este documento.**
4. **README.**
5. Prompts, ideas, benchmarks y referencias externas.

Un prompt nunca puede invalidar silenciosamente una funcionalidad existente, una invariante o una fuente de verdad. Si hay conflicto, **investigar y obtener una decisión explícita** antes de reemplazar arquitectura o comportamiento.

## Separación obligatoria: Estado / Roadmap / Future Integration / Vision

- **ESTADO / CURRENT STATE** = lo que puede demostrarse en repo, schema/config o producción.
- **ROADMAP / ACTIVE GATES** = trabajo aprobado y priorizado.
- **BACKLOG** = trabajo deseado documentado, todavía no necesariamente activo.
- **FUTURE INTEGRATION** = posibilidad compatible y documentada, **no autorizada** por existir aquí.
- **VISION** = dirección estratégica, no compromiso ni orden de implementación.

Ningún agente debe convertir `FUTURE INTEGRATION` o `VISION` en trabajo activo sin repriorización explícita.

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit de producción verificado arriba.
3. Si cambió, revisar solamente los diffs posteriores y actualizar los estados afectados.
4. Aplicar la **Regla de precedencia** y el **Change Safety Gate** antes de modificar arquitectura existente.
5. No rehacer trabajo marcado `[x]` salvo evidencia concreta de regresión.
6. Continuar por el primer gate **F — Active Gate** abierto.
7. Las secciones **Future Integrations / Vision** preservan dirección futura; **no autorizan implementación inmediata**.
8. Al cerrar un milestone material, actualizar este archivo y `README.md` con evidencia real de producción.

### Leyenda

- `[x]` Implementado y validado.
- `[~]` Parcial; existe base útil pero falta alcance o validación.
- `[ ]` Pendiente.
- **A — Ya existe**: conservar; no duplicar.
- **B — Existe parcialmente**: extender incrementalmente.
- **C — Existe con otra implementación**: conservar salvo ventaja clara y comprobada.
- **D — Future Integration**: valioso/compatible, pero no implementar ahora.
- **E — No recomendado / no aplicable**: no construir salvo que cambie el contexto.
- **F — Active Gate / Approved Work**: trabajo autorizado y actualmente priorizado.
- **Externo**: Cloudflare, Google, Workspace u otro servicio fuera del repositorio.

### Regla de evidencia

Toda afirmación **A/B/C/F** debe poder responder **“¿cuál es la evidencia?”**: código concreto, schema/config, endpoint, test, PR/commit y/o smoke de producción. Si algo importante no puede demostrarse, marcar **UNKNOWN** o investigar; no inventar.

## Architectural invariants — constitución del proyecto

Estas reglas se consideran permanentes salvo decisión explícita respaldada por evidencia:

- **Estabilidad > novedad.**
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics/media si la base actual puede extenderse.
- No crear sistemas paralelos de pricing, CMS, auth, analytics o media cuando el actual puede extenderse.
- Established production aesthetics son contratos; si un cambio CMS vuelve vulnerable una estética aprobada, extender **Visual Safeguards + tests** en el mismo PR.
- `Save Draft` nunca cambia producción; `Publish` es la acción que puede promover Draft → Published.
- Public content CMS usa **Published**, nunca Draft.
- **Global Select** debe llevar desde el visual al dueño CMS y al item correcto, aunque otra sección esté activa; futuros page editors deben extender el mismo contrato.
- Rental pricing/quote logic vive en backend y no puede convertirse en copy editable.
- Rental notifica **solo a `rental@sdlive.show`**; Contact general a `hello@sdlive.show`.
- Cloudflare Access es la barrera real del Admin.
- GTM no controla navegación, branding, copy ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación por GTM.

## Source of Truth / Owner

| Área | Source of Truth | Evidencia actual |
|---|---|---|
| Código, CSS/JS, branding crítico, fallbacks | GitHub `main` | repo + deploy desde `main` |
| CMS Draft/Published estructurado | D1 `sdlive-cms-production` | APIs CMS + `cms_entries` / revisions |
| Contenido público CMS | D1 `published_json` validado | edge renderers + smoke Draft/Publish |
| Media binaria editable | R2 `sdlive-media-production` | upload API + `media.sdlive.show` |
| Metadata/referencias media | D1 | modelos CMS / logical refs |
| Rental pricing / quote math | Backend | pricing/cálculo existentes; presentation CMS no lo posee |
| Acceso Admin | Cloudflare Access | JWT server-side + `/admin/` protegido |
| Analytics público | GA4/GTM con consentimiento | Realtime validado |
| Future CRM | **TBD** | Admin module aún Planned/Soon |
| Future Lead → Quote → Project → Invoice | **TBD antes de implementar** | no existe source-of-truth único todavía |
| AppSheet futuro | **No decidir todavía** | integración pendiente; evitar segundo source-of-truth accidental |

## Evidence matrix — sistemas de alto riesgo

| Feature | Estado | Clasificación | Evidence |
|---|---|---|---|
| Hero CMS | Producción | A | D1 + `worker-entry.js` + APIs + production smoke |
| Trusted By / Supported Brands | Producción | A | D1/R2 + `trusted-*` + smoke + WLive preservation |
| Testimonials | Producción | A | D1/R2 + `testimonials-*` + smoke |
| About / Services / International / Work CMS | Implementado/producción | A | `core-sections-*` + PR #27/#28 + SSR/tests |
| Visual Safeguards | Producción | A | guard CSS/JS + Editor panel + tests |
| Automatic publish failsafe | Producción | A | `automatic-failsafe.js` + PR #31/#32 |
| Reusable Media Library | Implementado | A | `media-library.js` + media API + PR #33 |
| Rental presentation CMS | Producción smoke OK | A | `home-presentation-*` + PR #34/#35 + smoke |
| Contact presentation CMS | Producción smoke OK | A | `home-presentation-*` + PR #34 + smoke/Turnstile |
| Rental cart/pricing | Producción | A | runtime/backend + production cart smoke |
| Global Select cross-section | Active Gate | F | `editor-resilience.js` existente, extendido en P2.7 + tests |
| Sound for Picture CMS | No implementado | D/UNKNOWN scope | hidden staging placeholder only |
| Projects | No implementado | D | Admin module disabled/planned |
| CRM pipeline | No implementado | D | leads/forms existen; pipeline ausente |
| Rental Admin full catalog/pricing editor | No implementado | D | public Rental existe; Admin module planned |

## Change Safety Gate

Antes de modificar una funcionalidad existente:

- [ ] ¿La funcionalidad ya existe?
- [ ] ¿Dónde está implementada?
- [ ] ¿Quién la consume?
- [ ] ¿Tiene datos persistentes?
- [ ] ¿Tiene API pública/interna?
- [ ] ¿Tiene impacto SEO/indexación?
- [ ] ¿Tiene impacto visual/interactivo?
- [ ] ¿Tiene impacto en producción/mercado/idioma?
- [ ] ¿Tiene tests?
- [ ] ¿Existe fallback?
- [ ] ¿Puede hacerse incrementalmente?
- [ ] ¿Existe rollback/reversión clara?
- [ ] ¿Cambia una fuente de verdad?
- [ ] ¿Requiere migración de datos/media?

Si alguna respuesta relevante es desconocida: **NO asumir. Investigar primero.**

Para CMS/editor, el smoke debe incluir cuando aplique: EN/ES, COL/INT, Desktop/Mobile, `Save Draft ≠ live`, `Publish = live` + Failsafe, estética/Safeguards, fallback y **Select desde la propia sección y desde otra sección/page, llegando al item exacto**.

## Política de mejoras futuras

Cuando se defina una mejora futura para SD.Live:

1. registrarla en **este roadmap y README** antes de cerrar el checkpoint documental actual;
2. clasificarla A–F y distinguir Backlog/Future Integration/Active Gate;
3. registrar dependencias/source-of-truth cuando aplique;
4. **no implementarla automáticamente** salvo priorización explícita.

Puede agruparse con el PR/milestone activo para evitar deploys documentales innecesarios, pero no debe perderse.

---

# P0 — base pública estable

**Estado: CERRADO el 2026-08-20.**

- [x] Hosting Cloudflare Workers operativo.
- [x] Producción sincronizada con GitHub `main`.
- [x] HTTPS, root canónico, redirect `www` y URLs limpias.
- [x] Home, `/en/`, `/es-co/`, Theatre, Privacy, landings SEO y 404 funcionando.
- [x] D1 `sdlive-cms-production` conectado.
- [x] Admin protegido por Cloudflare Access y JWT server-side.
- [x] Contacto guarda lead + consentimiento y notifica a `hello@sdlive.show`.
- [x] Rental guarda solicitud + consentimiento y notifica **solo** a `rental@sdlive.show`.
- [x] Pricing Rental calculado en backend.
- [x] Turnstile y consentimiento implementados.
- [x] GTM/GA4 base validada en producción.
- [x] `generate_lead`, email y WhatsApp observados en GA4 Realtime.
- [x] SEO técnico P0 publicado: canonical, hreflang, JSON-LD, Open Graph, robots y sitemap.
- [x] WLive confirmado como contenido vigente; no retirar.
- [x] Marca visual `SD.Live` con punto flotante en superficies dinámicas.
- [x] Copy canónico Home: **“Creative Audio. Technical systems. Built for the show.”**

---

# P1 — Hero CMS + first paint

**Estado: CERRADO.**

- [x] Hero Draft/Published/revisions en D1.
- [x] Published Hero conectado al Home.
- [x] SSR en Cloudflare edge antes del first paint.
- [x] Fallback estático si D1 falla o contenido es inválido.
- [x] Draft del Admin aislado de producción.
- [x] EN/ES desde la misma estructura.
- [x] Cookie de idioma disponible al Worker; fallback a `Accept-Language` y luego EN.
- [x] Sin flash de copy ni vacío de hydration.
- [x] Wordmark visual SD.Live correcto antes del line-wrap.
- [x] `node:test` + GitHub Actions CI.
- [x] Tests de schema, D1, fallback, idioma, SSR y aislamiento Admin.

Archivos clave: `worker-entry.js`, `worker.js`, `hero-content.js`, `cms-hydration.js`, `home-navigation.js`.

PRs principales: #1, #2, #3, #4.

---

# P2 — ampliar el Editor/CMS de forma incremental

## P2.1 — Trusted By / Brands Supported Through — Editor

**Estado: CERRADO.**

- [x] Modelo CMS propio para Trusted By.
- [x] Draft y Published en D1.
- [x] API pública `GET /api/content/trusted`.
- [x] Editor de clientes, nombres, roles, logos, orden y reveals.
- [x] Agregar/eliminar/reordenar clientes.
- [x] WLive protegido contra borrado desde UI.
- [x] Flechas rápidas y Pause/Play del carrusel en preview.
- [x] Pause persiste tras hover y reconstrucciones del Draft.
- [x] Select lleva al cliente/reveal/item correspondiente en el inspector.
- [x] Supported Brand placement Auto/Left/Center/Right.
- [x] Wonderlust preview Desktop normalizado para coincidir con el sitio público.
- [x] Swipe táctil en móvil; desktop conserva comportamiento propio.
- [x] Toasts no bloquean controles del inspector.
- [x] Carrusel conserva fase al editar placement y otros cambios del Draft.

### Polish pendiente no bloqueante

- [ ] Corregir pequeño offset de la navegación izquierda al saltar a **Trusted By**; debe alinear contra el contenedor completo de la sección, no quedar unos píxeles abajo.

## P2.1.2 — Media / R2 para Trusted

**Estado: CERRADO para Trusted By / Supported Brands.**

- [x] Bucket R2 `sdlive-media-production`.
- [x] Storage class **Standard**.
- [x] Custom Domain `media.sdlive.show` activo.
- [x] Public Development URL / `r2.dev` desactivado.
- [x] Binding Worker `MEDIA_BUCKET`.
- [x] `MEDIA_PUBLIC_BASE=https://media.sdlive.show`.
- [x] Endpoint autenticado de status/upload.
- [x] PNG/JPEG/WebP, máximo 5 MB.
- [x] Keys versionadas bajo `cms/<folder>/...`.
- [x] Cache metadata larga/immutable.
- [x] Upload/Replace desde Trusted Editor.
- [x] Slider de escala visual 50%–180% sin generar derivados binarios.
- [x] Escala y placement persistidos como metadata en D1.
- [x] Migrador one-click de assets legacy de Trusted/Supported Brands a R2.
- [x] Migración ejecutada y validada; Editor recargado correctamente después de `Save Draft`.
- [x] GitHub conserva por ahora originales/fallbacks; no eliminar hasta una limpieza deliberada posterior.

### Arquitectura de media acordada

**GitHub:** código, CSS/JS, branding crítico, favicon/app icons y fallbacks esenciales.  
**D1:** texto, orden, asociaciones, alt, escala, placement, visibilidad y referencias lógicas.  
**R2:** media administrable/reemplazable desde el Editor.

### Próximas migraciones de media

1. [x] Trusted By + Supported Brands.
2. [x] Testimonials — carpeta R2, upload y migración legacy validados.
3. [~] Portfolio / Selected Work — CMS/Media Library existen; verificar refs antes del cleanup final.
4. [x] Rental imagery — migración ejecutada y Draft/Published isolation validado en P2.6 smoke.
5. [ ] Insights/Journal thumbnails/hero cuando exista contenido real.
6. [ ] Otras imágenes administrables al entrar cada sección al CMS.
7. [ ] Retirar duplicados de GitHub solamente después de validar producción y conservar fallbacks críticos.

### Guardrails R2

- Standard storage; no Infrequent Access.
- Media pública por `media.sdlive.show`, no por Worker GET por archivo.
- CDN/cache delante de R2.
- URLs versionadas + cache immutable.
- Resize visual mediante CSS/D1, no derivados por cada movimiento de slider.
- No activar Cloudflare Images, Stream, Data Catalog ni productos pagos sin aprobación explícita.
- Limpieza de objetos huérfanos solo con proceso controlado.

## P2.2 — Published Trusted By → Home

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN.**

- [x] `trusted-edge.js` lee únicamente `published_json` de D1.
- [x] Validación de schema antes de renderizar.
- [x] Public Home `/` recibe Trusted Published por `HTMLRewriter`/SSR.
- [x] Static Trusted permanece como fallback deliberado.
- [x] Admin iframe recibe documento estático y mantiene Draft local aislado de Published SSR.
- [x] R2 logical refs `assets/media/...` se resuelven a `https://media.sdlive.show/...`.
- [x] EN/ES renderizado correctamente.
- [x] WLive preservado.
- [x] Wonderlust mantiene wrappers/layout correcto.
- [x] Scale y placement se respetan en producción.
- [x] Runtime público recalcula placement responsivo.
- [x] Cambio de idioma no reconstruye sets del carrusel ni pierde listeners de Supported Brands.
- [x] Supported Brands permanecen visibles/interactivas al cambiar EN↔ES sin recargar.
- [x] Hover/carrusel estabilizado; el retroceso cerca de Mediacoustix dejó de reproducirse tras el fix.
- [x] Prueba final de publishing validada: **Save Draft no cambia producción; Publish sí cambia producción.**

PRs principales del cierre Trusted/R2/SSR: #12–#22.

## P2.3 — Testimonials CMS + Visual Safeguards

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

- [x] Schema/default model de Testimonials sobre el contenido real existente.
- [x] Draft/Published/revisions en D1.
- [x] API pública y endpoints Admin de Testimonials.
- [x] Editor EN/ES de heading, persona, cargo/empresa y quote.
- [x] Agregar/eliminar/reordenar testimonios.
- [x] Visibilidad pública y featured por testimonio.
- [x] Select exacto desde preview al item correspondiente.
- [x] Upload/Replace/Remove de logo mediante R2 y escala visual 50%–180%.
- [x] Published → Home por edge SSR usando solo `published_json`.
- [x] Static markup como fallback seguro.
- [x] Admin iframe aislado de Published SSR.
- [x] Smoke Desktop/Mobile y EN/ES validado.
- [x] Prueba `Save Draft ≠ live` / `Publish = live` validada y cambio de prueba revertido.
- [x] Visual Safeguards añadidos para proteger estética estable frente a reconstrucciones CMS.
- [x] Panel **Safeguards** en Editor con diagnóstico y **Restore all defaults**; controles solo afectan preview, nunca D1.
- [x] Guard actual cubre glass, auroras, reveal motion, card sheen, Trusted carousel motion, supported-brand reveal y CTA hover.
- [x] Sheen de Trusted/Testimonial usa barrido `background-position` sin transformed child dentro del marquee.
- [x] Sheen reajustado en #25 para pacing visual aprobado y clipping completo dentro de cards.
- [x] Tests de regresión bloquean pérdida silenciosa de estas invariantes visuales.

PRs principales: #24 (P2.3 + safeguards), #25 (sheen pacing/clipping).

## P2.4 — About / Services / International / Selected Work CMS + automatic failsafe

**Estado: CERRADO.**

- [x] CMS models para About, Services, Work e International.
- [x] Draft/Published/revisions y API compartida.
- [x] Published core Home sections renderizadas en edge con fallback estático.
- [x] Editores visuales y navegación International.
- [x] About media R2 habilitado.
- [x] Validación/seguridad de links internos CMS.
- [x] Smoke fixes para core Select y Safeguards.
- [x] Automatic publish failsafe añadido.
- [x] Publish progress visible y false failsafe failure corregido.

PRs principales: #27–#32.

## P2.5 — Reusable Media Library + section migrators

**Estado: CERRADO en implementación.**

- [x] Reusable R2 Media Library API.
- [x] Reusable Media Library panel.
- [x] About/Work conectados a Media Library.
- [x] Migradores temporales About/Work disponibles.
- [x] Migrator observers protegidos contra loops.
- [x] Regla de transición: cada sección CMS con media editable obtiene un camino legacy→R2.

PR principal: #33.

## P2.6 — Rental + Contact CMS + R2 migration

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

- [x] D1 Draft/Published/revisions para Rental presentation y Contact.
- [x] Rental CMS edita solo presentación: headings, preset labels, groups, equipment copy/notes/images.
- [x] Pricing, availability, preset composition, cart IDs y quote math siguen system/backend-owned.
- [x] Contact CMS edita copy/labels; email, Turnstile y lógica de envío siguen fuera del CMS.
- [x] Targeted edge patching preserva Rental DOM transaccional y Contact form.
- [x] Rental Upload/Replace/Media Library + legacy media migrator.
- [x] Testimonials legacy-logo migrator añadido.
- [x] Sound for Picture no fue promovido; sigue staging/placeholder oculto.
- [x] Smoke Rental: `Save Draft` no tocó live; Publish sí cambió live y Failsafe quedó verde.
- [x] Smoke media: Rental + Testimonials migraron Draft-only; Published permaneció intacto.
- [x] Limitación temporal conocida: al terminar `Migrate legacy media`, Editor vuelve visualmente a Home/estado base; al volver a la sección reaparece correctamente el Draft pendiente. No corregir salvo que persista después del cleanup de migradores.
- [x] Smoke cart: items/cantidades/totales/form operativos.
- [x] Smoke Contact: `Save Draft ≠ live`, Publish correcto, form + Turnstile visibles.
- [x] Primer smoke detectó `market: "colombia"` incompatible con D1 `CHECK market IN ('all','col','int')`; PR #35 corrigió Rental a `col` y añadió test de regresión.

PRs principales: #34, #35.

## P2.7 — Global Select + permanent Change Safety policy

**Estado: F — ACTIVE GATE / APPROVED WORK.**

Objetivo: reforzar el Select existente y convertir autoridad/evidencia/change-safety en políticas permanentes del repo.

- [x] Requisito: Select debe activar el dueño CMS aunque otra sección esté seleccionada.
- [x] Requisito: collections/cards deben llevar al item exacto cuando sea identificable.
- [x] Requisito: futuros CMS/pages smokean Select desde dentro y desde otra sección/page.
- [~] Extender `editor-resilience.js` existente; **no crear implementación paralela**.
- [~] Routing actual contemplado: Hero, Trusted, About, Services, International, Work, Testimonials, Rental, Contact.
- [~] Rental debe recuperar INT→COL cuando la sección está deshabilitada por mercado.
- [~] Tests de regresión del contrato Global Select.
- [~] README/roadmap reforzados con precedencia, Evidence, Source of Truth, F Active Gate y Change Safety.
- [ ] Production smoke posterior al merge: exact item desde misma/otra sección; Rental desde INT; Interact mode intacto.

**Después de P2.7:** hacer **Home CMS closeout inventory** antes de decidir el siguiente gate. Cleanup de migradores solo tras verificar refs R2/fallbacks.

---

# Backlog maestro por área

## Admin / CMS / Editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Select/Interact, Focus, paneles colapsables y selección visual base.
- [x] Hero CMS completo y Published→Home SSR.
- [x] Trusted By CMS completo, R2 y Published→Home SSR.
- [x] Testimonials CMS completo, R2 opcional y Published→Home SSR.
- [x] About / Services / International / Work CMS.
- [x] Rental / Contact presentation CMS.
- [x] Visual Safeguards + Editor diagnostics/restore.
- [x] Automatic publish failsafe + publish progress.
- [x] Media Library reusable sobre R2.
- [~] **Global Select cross-section/page-aware contract — P2.7 activo.**
- [ ] Cleanup de migradores temporales solo tras verificar refs R2/fallbacks de producción.
- [ ] Reorder genérico de otras cards/bloques.
- [ ] Show/hide por mercado y dispositivo desde Admin.
- [ ] Configuración de gap/padding/alignment/spacing.
- [ ] Undo/redo y rollback accesible desde UI.
- [ ] Duplicar bloques/cards desde templates.
- [ ] Template Library explícita.
- [ ] Revisar y retirar `admin/admin.js` / `admin/admin.css` si se confirma duplicación frente a `admin/editor/*`.
- [ ] Fix menor: alineación del salto `Trusted By` en navegación izquierda.

## Header, navegación y controles flotantes

- [ ] **WhatsApp en todas las landings públicas.** Reutilizar el botón Home en Theatre, `/en/`, `/es-co/`, servicios Bogotá, Rental y demás páginas públicas; mismo destino, tracking, safe-area y responsive.
- [ ] Reordenar/espaciar elementos del header desde Admin.
- [ ] Show/hide de CTAs, Show Day, WhatsApp y controles por página/mercado/dispositivo.
- [ ] Configurar anchors y scroll offset.
- [ ] Agregar/quitar items del menú.
- [ ] Posición independiente Mobile de WhatsApp, cart y Back to Top.

## Contenido público

- [x] Hero CMS real en producción.
- [x] Trusted By CMS real en producción.
- [x] Testimonials CMS real en producción.
- [x] About/Services/International/Selected Work con CMS core.
- [x] Rental/Contact presentation CMS.
- [x] Theatre estabilizado.
- [x] WLive visible y vigente.
- [~] Portfolio/Selected Work: CMS base existe; faltan case-study/credits/tags/featured más profundos si se aprueban.
- [~] Raw vs Mixed: UI existe; faltan audios reales + Admin.
- [~] Show Day: manual existe; falta integración con calendario.
- [ ] Portfolio/CV privado no indexado con variantes profesionales.
- [ ] Recuperar Insights/Journal cuando exista contenido real.
- [ ] Evaluar Technical Audio Training como servicio antes de publicarlo.
- [ ] Sound for Picture: no promover placeholder; requiere contenido real y scope aprobado.

## Contacto / Rental

- [x] Contact → `hello@sdlive.show`.
- [x] Rental → **`rental@sdlive.show` exclusivamente**.
- [x] Turnstile + consentimiento + D1.
- [x] Pricing y bundles server-side.
- [x] Rental oculto en INT salvo intención directa `#rental`/contexto permitido.
- [x] Rental/Contact presentation CMS Draft/Published.
- [x] Rental cart smoke posterior a P2.6.
- [ ] **Compatibilidad guiada para cliente no técnico:** al añadir **Behringer WING**, recomendar **Midas DL32** como stagebox apropiado; al añadir **LV1 Classic**, recomendar **StageGrid 4000**. Definir visual/UX con aprobación antes de implementar; no autoagregar silenciosamente.
- [ ] **Rental Admin — alta de nuevos items + pricing rules validadas:** soportar precio fijo, precio por día, reglas multi-day, cantidades, pair/bundle con otro equipo y pricing condicional. El Admin puede editar una estructura validada; **backend sigue siendo source-of-truth del cálculo**.
- [ ] Card Equipment Rental debe llevar a `#rental` cuando corresponda.
- [ ] Hacer inequívoco que el carrito es solicitud de cotización, no checkout.
- [ ] Resolver empty state, service-only total 0 y reset incompleto.
- [ ] Afinar delivery/logística.
- [ ] PDF de quote, vigencia, disponibilidad y aprobación.
- [ ] Inventario/calendario y prevención de double booking.

## CRM / Projects / Calendar

**Estado real del repo:** el dashboard muestra Leads/CRM, Rental Admin, Projects y Calendar como módulos **Planned/Soon**; no tratarlos como módulos ya implementados. Existen datos/forms y piezas públicas que podrán alimentarlos posteriormente.

- [ ] Pipeline Lead: New → Contacted → Quoted → Confirmed → Lost.
- [ ] Clientes, empresas, notas, historial y source.
- [ ] Relación Lead → Quote → Project → Invoice.
- [ ] Integración AppSheet solo con source-of-truth definida.
- [ ] Projects con cliente, show, rol, fechas, venue, contactos, archivos y Rental/Quote/Calendar.
- [ ] Calendar Admin integrando eventos relevantes.
- [ ] Show Day automático desde calendario con override manual.

## Inbox / Workspace

- [x] Operación de correo vía Gmail/Workspace.
- [ ] Inbox nativo en Admin por categorías.
- [ ] Responder desde alias correcto.
- [ ] Email → Lead / Rental / Project.
- [ ] Verificar aliases operativos antes de automatizar (`hello@`, `info@`, `rental@`, `projects@`, `billing@`, `facturas@`).
- [ ] Revisar DMARC cuando Workspace esté estable.

## Analytics / SEO / growth

- [x] GTM + Consent Mode + GA4 base.
- [x] `generate_lead`, email y WhatsApp validados.
- [x] SEO técnico P0 base: canonical, hreflang, JSON-LD, OG, robots, sitemap y redirects relevantes.
- [ ] Separar tráfico interno/testing.
- [ ] Revisar Key Events vs microconversiones.
- [ ] Funnel sesión → source → lead → qualified → closed.
- [ ] Monitorizar indexación, queries, impressions, CTR, países, entradas y Core Web Vitals.
- [ ] Medir landings antes de crear más SEO pages.
- [ ] Dashboard SEO/comercial cuando haya volumen y source-of-truth suficiente.
- [ ] Estrategia de adquisición basada en conversiones/revenue.

### Regla SEO/IA permanente

La secuencia correcta es:

**oferta real → página útil → SEO**

Nunca:

**keyword → página artificial → contenido generado**.

Antes de crear una página SEO, determinar qué servicio real representa, quién/cómo se presta, mercado, capacidad operativa, evidencia/portfolio, CTA, intención de búsqueda y si otra URL ya cubre esa intención. Si no existe una oferta real detrás: **NO CREARLA**.

## Plataforma / seguridad / calidad

- [~] Access, JWT, Turnstile, D1, R2 y consentimiento forman la base actual.
- [x] Tests + CI base.
- [x] Visual regression contracts para sistemas protegidos por Safeguards.
- [x] Automatic publish verification base.
- [ ] Rate limiting explícito y verificable.
- [ ] CSP, Referrer-Policy y Permissions-Policy sin romper GTM/Turnstile/media.
- [ ] Migraciones/versionado de esquema D1.
- [ ] Observabilidad Worker/D1/R2, publish/deploy y errores.
- [ ] Alertar antes de acercarse a límites relevantes de R2/Workers.
- [ ] Backups/export y rollback operacional.
- [ ] Limpieza segura de objetos R2 huérfanos después de replacements/migraciones.
- [ ] Refactor de monolitos (`index.html`, `script.js`, `styles.css`, `worker.js`) solo con tests verdes y justificación concreta.
- [ ] Retirar `deploy-test.txt` en cleanup futuro si se confirma que ya no sirve.

---

# Competitive / Benchmark References

**Estas páginas son inspiración/aprendizaje, nunca templates ni requisitos. No copiar diseño, copy, imágenes o branding. Cuando un cambio de diseño/estructura se apoye materialmente en estas referencias, consultar sus versiones vigentes primero y confirmar antes de adoptar un patrón comparable.**

| Referencia | Aprendizaje permitido |
|---|---|
| `https://www.mediacoustix.com/` | autoridad profesional, servicios, storytelling, SEO |
| `https://www.aerislatam.com` | ingeniería, case studies, proyectos, integración |
| `https://www.adlib.co.uk` | case studies, producción, rental, documentación técnica |
| `https://www.cohesionaudio.com` | proyectos técnicos, equipment associations |
| `https://www.worldtouraudio.com` | rental, staffing, engineering |
| `https://wonderlust.live/` | interacción/brand expression; consultar antes de cambios relacionados |
| `https://www.wlive.co` | referencia contextual/branding; WLive además es contenido vigente de SD.Live |

---

# Future Evolution — visión SD.Live 2.0

**Estado de esta sección: ROADMAP FUTURO / VISION, salvo filas F. No implementación automática.**

La visión recibida el 2026-08-21 se interpreta como una dirección estratégica: evolucionar el sistema actual hacia una plataforma digital que conecte descubrimiento → confianza → cotización/rental → lead → proyecto, **aprovechando la arquitectura existente**. No es una orden de reconstrucción ni de copiar Mediacoustix, Aeris, Adlib, Cohesion, World Tour Audio, Wonderlust o WLive. Las referencias externas son principios de aprendizaje, no templates visuales.

## Current State contrastado con el repo

- **A — Ya existe:** frontend vanilla HTML/CSS/JS; Cloudflare Workers/Static Assets; D1; R2; Cloudflare Access; CMS Draft/Published/revisions; Hero/Trusted/Testimonials/About/Services/International/Work/Rental/Contact CMS según scope; reusable Media Library; Rental público con pricing backend; Contact/Rental forms; GTM/GA4/Consent; EN/ES; COL/INT; landings SEO actuales; canonical/hreflang/robots/sitemap/JSON-LD base; Visual Safeguards; automatic publish failsafe.
- **B — Parcial:** Portfolio/Work sin case-study model profundo, Rental sin catálogo/admin completo, SEO sin sistema CMS-first para metadata de páginas futuras, analytics sin dashboard comercial, Insights/Journal sin sistema editorial real.
- **D — Future Integration:** Services profundos, Projects/case studies, Rental product SEO, Rental Admin pricing rules, compatibility guidance, Article/Journal CMS, CRM pipeline/atribución, SEO CMS, internal linking graph, dashboards, Press/authority y expansión audiovisual.
- **F — Active Gate:** Global Select cross-section/page-aware contract + permanent Change Safety policy.
- **Importante:** aunque una visión futura describa CRM, Projects, Rental Admin u otros módulos, el repo manda. No documentarlos ni tratarlos como implementados hasta que exista código/flujo real.

## Gap analysis / priorización futura

| Funcionalidad | Estado actual | Propuesta futura | Clasificación | Priority | Effort | Impact | Risk | Dependencias / evidencia |
|---|---|---|---|---|---|---|---|---|
| Global Select | Select existe por capas; cross-section incompleto | routing global owner→item + future page contract | **F** | P0 | M | alto | bajo/medio | `editor-resilience.js`, section editors; P2.7 activo |
| Services CMS | implementado en P2.4 | profundizar modelo solo cuando haya necesidad real | A/B | P1 | M | alto | medio | `core-sections-*`, PR #27 |
| Arquitectura de páginas de servicio | landings puntuales, no sistema completo | páginas profundas por servicio/intención real | D | P1 | L | alto | medio | Services model + keyword research + IA aprobada |
| SEO CMS fields | metadata mayormente code/static | title, description, canonical, OG, noindex, sitemap, social preview, schema config | D | P1 | M | alto | medio | modelo de página; no duplicar metadata existente |
| Rental SEO | Rental público + algunas landings; no catálogo indexable completo | categorías/product pages conectadas al configurador | D | P1 | L | alto | medio | Rental model estable + canonical strategy |
| Rental compatibility guidance | no recomendaciones automáticas | WING→DL32; LV1→StageGrid guidance | D | P2 | M | medio/alto | bajo | UX por aprobar; conservar cart/backend |
| Rental Admin pricing model | pricing backend code-owned | alta de items + reglas validadas desde Admin | D | P1 | L/XL | alto | alto | source-of-truth backend + schema/migration/rollback |
| Rental packages indexables | bundles/pricing backend existen | páginas útiles de configuraciones reales | D | P2 | M | medio/alto | bajo | no crear packages artificiales ni contradecir pricing backend |
| Projects / case studies | portfolio parcial; Admin Projects planned | Project model + `/projects/[slug]` + casos reales | D | P1 | XL | estratégico | medio | source-of-truth + Media Library + privacy |
| Portfolio CMS profundo | Work CMS base existe | credits/tags/featured/case-study model | B/D | P1 | L | alto | medio | core Work + Media Library |
| Media Library | reusable library implementada | reference safety/soft-delete/cleanup más profundo | A/B | P1 | M | alto | medio | R2 + D1 refs; PR #33 |
| Journal / Articles CMS | Insights no operativo como sistema real | artículos técnicos basados en experiencia real | D | P2 | L | alto | bajo/medio | Article model + SEO fields + Media Library |
| Internal linking | links manuales | relaciones Services ↔ Products ↔ Projects ↔ Articles | D | P1 | M | alto | bajo | modelos reales; evitar páginas huérfanas |
| Structured data avanzado | JSON-LD base existe | Service/Product/Article/Breadcrumb schema donde corresponda | B/D | P1 | M | alto | medio | contenido visible real; guías vigentes |
| Multidioma SEO | EN/ES + hreflang base existen | URLs/metadata equivalentes por contenido nuevo | B/D | P1 | M | alto | medio | arquitectura de páginas; no mezclar idiomas |
| Local SEO | Bogotá/Colombia ya tiene landings | ampliar solo para servicios/mercados reales | D | P2 | M | medio/alto | bajo | keyword research + service reality; no doorway pages |
| CRM pipeline | forms/D1 existen; Admin Leads planned | New→Contacted→Quoted→Confirmed/Lost + cliente/empresa/historial | D | P1 | XL | estratégico | source-of-truth, permisos, datos existentes, quote flow |
| Lead attribution | GA4 + forms base | landing, UTM, campaign, service/product y revenue attribution | D | P1 | L | estratégico | CRM + analytics identifiers + privacy/consent |
| Analytics dashboard | GA4 existe; Admin Analytics planned | SEO/commercial dashboard con GSC/GA4/CRM | D | P2 | L | alto | datos/volumen real + APIs/credentials + CRM |
| Conversion/forms | Contact/Rental ya funcionan | reducir fricción/contextual CTA y capturar solo datos necesarios | B/D | P1 | M | alto | medir antes/después; preservar email invariants |
| About / professional authority | About CMS existe | perfil más profundo con datos verificables y proyectos reales | B/D | P2 | M | medio/alto | material real y autorizaciones |
| Video/motion | identidad audiovisual ya existe | video contextual y optimizado | D | P2 | L | alto | Media Library/video strategy + CWV budget |
| Press / mentions | no módulo dedicado | `/press` si existe material verificable suficiente | D | P3 | M | medio | bajo | contenido/links reales; no fabricar autoridad |
| Accessibility audit | base semántica/controls variable | contraste, keyboard, focus, headings, reduced motion, touch targets | D / quality stream | P1 | M | alto | bajo | ejecutar incrementalmente |
| Performance/CWV | Cloudflare/CDN base | responsive media, caching, font/video optimization, JS discipline | D / quality stream | P1 | M/L | alto | medio | medir antes; no sacrificar identidad sin evidencia |
| Security hardening | Access/JWT/Turnstile/validation base | rate limiting, headers, logs, backups, migration discipline | B/D | P1 | L | estratégico | medio | no romper GTM/Turnstile/media; pruebas obligatorias |
| Backlinks/authority outreach | fuera del repo | conseguir menciones legítimas de partners/venues/media | D externo | P2 | ongoing | alto | bajo | solo relaciones reales; no comprar links spam |

## Future Integrations — arquitectura sugerida

### P1 — alto valor cuando llegue su turno

1. **Services/page model future-ready.** Extender CMS actual; no introducir framework paralelo.
2. **Projects / case studies.** Construir primero la fuente de verdad interna del Project; después proyección pública seleccionada.
3. **Rental SEO/catalog.** Reutilizar inventario, pricing backend y configurador actuales; no segundo carrito/pricing.
4. **Rental Admin pricing rules.** Solo después de diseñar schema, migrations, evaluator backend y rollback.
5. **SEO-first CMS.** Metadata por página/idioma, canonical/hreflang, sitemap, OG y schema compatible con contenido visible.
6. **Internal linking model.** Relaciones explícitas entre Services, Products, Projects y Articles.
7. **CRM + attribution.** Forms actuales alimentarán pipeline real cuando source-of-truth esté definido.

### P2 — crecimiento/autoridad después de modelos sólidos

- Journal técnico con pocos artículos excelentes y verificables.
- Dashboard SEO/comercial con GSC/GA4/CRM cuando exista volumen suficiente.
- About/professional profile más profundo.
- Video contextual optimizado con poster/lazy/CDN/performance budget.
- Local SEO adicional solo para servicios y ciudades reales.
- Packages Rental útiles/indexables cuando representen configuraciones comerciales reales.

### P3 — opcional / condicionado

- Press/mentions page si existe corpus real suficiente.
- Programas de backlinks/partnerships como operación comercial externa, no automatización.

## Deferred / no autorizado por ahora

- Crear 8–12 servicios, 10–20 productos, 5–10 proyectos o 10 artículos en bloque solo para llenar el sitio.
- Reorganizar de inmediato toda la navegación en Services/Rental/Projects/Journal/About/Contact.
- Construir CRM/Projects/Analytics/SEO dashboards antes de definir source-of-truth y relaciones.
- Migrar/borrar todo media de GitHub a R2 de una sola vez sin verificación.
- Cambiar framework, lenguaje, base de datos, hosting, CMS, auth o infraestructura por moda tecnológica.
- Hacer un rediseño global mientras el sistema actual funciona.

## Not Applicable / no recomendado

- Copiar diseños, copy, imágenes o branding de referencias externas.
- Convertir SD.Live en empresa genérica de producción/rental si diluye Creative Audio + Technical Audio Systems.
- Generar una URL por keyword o cientos de páginas por ciudad.
- Publicar cientos de artículos genéricos producidos por IA.
- Inventar métricas, clientes, proyectos, certificaciones, testimonios o structured data.
- Comprar backlinks de baja calidad.
- Crear segundo sistema de pricing, auth, analytics, CMS o media cuando el actual puede extenderse.

## Prerequisitos antes de cualquier bloque Future Integration

1. Inspeccionar código real y confirmar qué ya existe.
2. Aplicar Change Safety Gate.
3. Identificar consumidores/APIs y mantener backward compatibility por defecto.
4. Definir source-of-truth/owner de datos.
5. Definir datos afectados, migración y rollback para cambios de schema.
6. Preservar contenido, D1, R2, historial y relaciones.
7. Keyword research/intention mapping antes de nuevas URLs SEO.
8. Definir métricas de éxito antes de cambios de conversión.
9. Extender Visual Safeguards/tests si se reconstruye sistema visual aprobado.
10. Validar EN/ES, COL/INT, Desktop/Mobile, accessibility básica, performance y Draft/Published.
11. Validar **Global Select misma sección + otra sección/page + exact item** para todo nuevo CMS.
12. Si una funcionalidad no puede verificarse, marcar **UNKNOWN** en vez de inventar.

---

# Decisiones e invariantes — no reabrir sin evidencia

- Marca exacta: **SD.Live**.
- Descriptor: **Creative Audio**.
- Tagline exacta: **Creative Audio. Technical systems. Built for the show.**
- En UI visible, `SD.Live` usa el wordmark con punto flotante cuando aplique; metadata/código/string machine-readable usa texto literal.
- SD.Live no debe parecer agencia genérica de eventos, rental house, CV personal ni sociedad incorporada.
- Referencias externas aportan principios, nunca identidad visual/copys a copiar.
- WLive se mantiene visible.
- Rental es Colombia-first; INT lo oculta por defecto.
- Rental nunca envía a `hello@` ni correo personal: **solo `rental@sdlive.show`**.
- Pricing Rental vive en backend.
- Cloudflare Access es la barrera real del Admin; no usar login visual falso.
- GTM no controla navegación, branding, copy, Theatre ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación por GTM.
- No guardar secretos ni datos sensibles en GitHub.
- GitHub = source-of-truth de código; D1 = contenido estructurado; R2 = media administrable.
- `media.sdlive.show` es el dominio público canónico para media R2.
- Public Development URL de R2 permanece desactivado salvo necesidad explícita.
- Established aesthetics son contratos: no degradar branding/UX por trabajo CMS. Safeguards + tests deben acompañar reconstrucciones vulnerables.
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics si la base actual puede extenderse.
- **Global Select es un contrato del Editor y parte del smoke de cada nuevo CMS/page.**
- **Estabilidad > novedad.** Si no hay evidencia suficiente para modificar una implementación funcional, conservarla.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirect `www`, wordmark dinámico, alcance WLive, smoke público y GA4 Realtime.

## 2026-08-20 — P1 Hero CMS + first paint

Published Hero servido desde D1 con SSR en edge, fallback estático, idioma resuelto antes del first paint y Draft aislado.

## 2026-08-20 — P1.4 tests + CI

Se añadió `node:test` y GitHub Actions.

## 2026-08-20/21 — P2.1 Trusted By + R2

Modelo CMS Trusted/Supported Brands, Draft/Published, reorder, WLive protegido, controles de carrusel, Select, parity, R2, upload autenticado, scale/placement y migración.

## 2026-08-21 — P2.2 Trusted Published → Home

Published Trusted servido desde D1/R2 con SSR/fallback. Confirmado: **Save Draft no cambia producción; Publish sí cambia producción.**

## 2026-08-21 — P2.3 Testimonials + Visual Safeguards

Testimonials gestionable desde Admin con D1/R2/SSR/fallback + sistema Visual Safeguards.

## 2026-08-21 — P2.4 Core Home CMS + automatic failsafe

About/Services/International/Work CMS, smoke fixes y automatic publish verification.

## 2026-08-21 — P2.5 Reusable Media Library

R2 Media Library reusable + About/Work bridges/migradores.

## 2026-08-21 — P2.6 Rental + Contact CMS

Rental/Contact presentation CMS + migration paths; smoke completo correcto después de PR #35 (`market: col`).

## 2026-08-21 — P2.7 Global Select + permanent Change Safety

**ACTIVE hasta merge + production smoke.** Extiende el Select existente y convierte precedencia/evidencia/source-of-truth/change-safety en política permanente del repo.

---

# Siguiente decisión después de P2.7

Ejecutar **Home CMS closeout inventory** antes de elegir siguiente feature:

1. qué secciones Home tienen CMS real;
2. qué media sigue legacy vs R2;
3. qué migradores ya cumplieron su función;
4. qué fallbacks siguen siendo críticos;
5. qué contenido real queda fuera del CMS;
6. qué bugs/polish son regresión vs backlog;
7. qué siguiente gate ofrece más valor sin abrir arquitectura paralela.

**Sound for Picture permanece inert staging hasta contenido/scope real aprobado.**