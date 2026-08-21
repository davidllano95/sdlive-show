# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo está resuelto, qué falta y cuál es el siguiente gate. Se actualiza al cerrar milestones o ante cambios materiales de arquitectura/alcance, no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-21 |
| Rama verificada | `main` |
| Commit de milestone verificado | `bfd69f900dc34a4d3ab22352145da222202f9b13` |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Milestone actual | P2 — ampliar el Editor/CMS de forma incremental |
| Estado | **P2.3 Testimonials CMS + Visual Safeguards CERRADO y validado en producción** |
| Siguiente gate | **P2.4 — Services CMS** |

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit de milestone verificado arriba.
3. Si cambió, revisar solamente los diffs posteriores y actualizar los estados afectados.
4. No rehacer trabajo marcado `[x]` salvo evidencia concreta de regresión.
5. Continuar por el primer gate abierto del milestone actual.
6. Al cerrar un milestone material, actualizar este archivo y `README.md` si cambió arquitectura u operación.
7. Las secciones **Future Integrations** de este documento preservan visión futura; **no autorizan implementación inmediata** ni cambian por sí solas el orden del roadmap activo.

### Leyenda

- `[x]` Implementado y validado.
- `[~]` Parcial; existe base útil pero falta alcance o validación.
- `[ ]` Pendiente.
- **A — Ya existe**: conservar; no duplicar.
- **B — Existe parcialmente**: extender incrementalmente.
- **C — Existe con otra implementación**: conservar salvo ventaja clara y comprobada.
- **D — Future Integration**: valioso/compatible, pero no implementar ahora.
- **E — No recomendado / no aplicable**: no construir salvo que cambie el contexto.
- **Externo**: Cloudflare, Google, Workspace u otro servicio fuera del repositorio.

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
2. [x] Testimonials — carpeta R2 y Upload/Replace/Remove de logo editable disponibles.
3. [ ] Portfolio / Selected Work.
4. [ ] Rental imagery.
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

## P2.4 — Services CMS

**Estado: SIGUIENTE GATE.**

Objetivo inmediato: continuar la migración incremental del Site Editor siguiendo el patrón Hero → Trusted → Testimonials, sin convertir todavía el proyecto en la expansión SEO/IA amplia descrita más abajo.

- [ ] Inventariar Services actuales y su copy EN/ES.
- [ ] Definir schema estable compatible con la arquitectura D1/R2 existente.
- [ ] Editor de contenido/orden/visibilidad sin romper estilo actual.
- [ ] Preservar cards, hover, responsive y demás visuales existentes; extender Visual Safeguards/tests si el rebuild los vuelve vulnerables.
- [ ] Draft/Published/revisions.
- [ ] Public binding/fallback siguiendo patrón edge cuando corresponda.
- [ ] Smoke EN/ES + COL/INT + Desktop/Mobile + Draft/Publish.

**Orden activo después de Services:** Media Library reusable → Portfolio / Selected Work. La visión futura de SEO, Projects, Journal, CRM, etc. permanece documentada pero no desplaza este orden sin una decisión explícita.

---

# Backlog maestro por área

## Admin / CMS / Editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Select/Interact, Focus, paneles colapsables y selección visual base.
- [x] Hero CMS completo y Published→Home SSR.
- [x] Trusted By CMS completo, R2 y Published→Home SSR.
- [x] Testimonials CMS completo, R2 opcional y Published→Home SSR.
- [x] Visual Safeguards + Editor diagnostics/restore.
- [~] Media/R2: infraestructura y sección-specific uploads completos; falta Media Library reusable y migración por secciones.
- [ ] Services CMS.
- [ ] Selected Work / Portfolio CMS cuando Media Library sea estable.
- [ ] Reorder genérico de otras cards/bloques.
- [ ] Show/hide por mercado y dispositivo desde Admin.
- [ ] Configuración de gap/padding/alignment/spacing.
- [ ] Undo/redo y rollback accesible desde UI.
- [ ] Duplicar bloques/cards desde templates.
- [ ] Template Library explícita.
- [ ] Media Library reusable sobre R2: listar, buscar, reemplazar, reutilizar y borrar con seguridad.
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
- [x] Theatre estabilizado.
- [x] WLive visible y vigente.
- [~] Portfolio: piezas públicas existen; falta modelo CMS/media/credits/tags/featured.
- [~] Raw vs Mixed: UI existe; faltan audios reales + Admin.
- [~] Show Day: manual existe; falta integración con calendario.
- [ ] Portfolio/CV privado no indexado con variantes profesionales.
- [ ] Recuperar Insights/Journal cuando exista contenido real.
- [ ] Evaluar Technical Audio Training como servicio antes de publicarlo.

## Contacto / Rental

- [x] Contact → `hello@sdlive.show`.
- [x] Rental → **`rental@sdlive.show` exclusivamente**.
- [x] Turnstile + consentimiento + D1.
- [x] Pricing y bundles server-side.
- [x] Rental oculto en INT salvo intención directa `#rental`.
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

## Plataforma / seguridad / calidad

- [~] Access, JWT, Turnstile, D1, R2 y consentimiento forman la base actual.
- [x] Tests + CI base.
- [x] Visual regression contracts para sistemas protegidos por Safeguards.
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

# Future Evolution — visión SD.Live 2.0

**Estado de esta sección: ROADMAP FUTURO, no implementación inmediata.**

La visión recibida el 2026-08-21 se interpreta como una dirección estratégica: evolucionar el sistema actual hacia una plataforma digital que conecte descubrimiento → confianza → cotización/rental → lead → proyecto, **aprovechando la arquitectura existente**. No es una orden de reconstrucción ni de copiar Mediacoustix, Wonderlust o WLive. Las referencias externas son principios de autoridad, storytelling y claridad comercial, no templates visuales.

## Current State contrastado con el repo

- **A — Ya existe:** frontend vanilla HTML/CSS/JS; Cloudflare Workers/Static Assets; D1; R2; Cloudflare Access; CMS Draft/Published/revisions; Hero/Trusted/Testimonials CMS; Rental público con pricing backend; Contact/Rental forms; GTM/GA4/Consent; EN/ES; COL/INT; landings SEO actuales; canonical/hreflang/robots/sitemap/JSON-LD base; Visual Safeguards.
- **B — Parcial:** Portfolio/Selected Work, Media/R2 sin Library reusable, Rental sin catálogo/admin completo, SEO sin sistema CMS-first para metadata de páginas futuras, analytics sin dashboard comercial, contenido Insights/Journal sin sistema editorial real.
- **D — Future Integration:** Services profundos, Projects/case studies, Rental product SEO, Article/Journal CMS, CRM pipeline/atribución, Media Library, SEO CMS, internal linking graph, dashboards, Press/authority y expansión audiovisual.
- **Importante:** aunque el documento de visión describe CRM, Projects y Media Library como existentes, el repo actual los muestra en el Admin como módulos planned/disabled. No documentarlos ni tratarlos como implementados hasta que exista código/flujo real.

## Gap analysis / priorización futura

| Funcionalidad | Estado actual | Propuesta futura | Clasificación | Priority | Effort | Impact | Risk | Dependencias / nota |
|---|---|---|---|---|---|---|---|---|
| Services CMS | pendiente, Services públicos existen | gestionar Services sin código | D / ya es gate activo P2.4 | P1 | M | alto | medio | patrón CMS probado + safeguards |
| Arquitectura de páginas de servicio | landings puntuales, no sistema completo | páginas profundas por servicio/intención real | D | P1 | L | alto | medio | Services model + keyword research + IA aprobada |
| SEO CMS fields | metadata mayormente code/static | title, description, canonical, OG, noindex, sitemap, social preview, schema config | D | P1 | M | alto | medio | modelo de página; no duplicar metadata existente |
| Rental SEO | Rental público + algunas landings; no catálogo indexable completo | categorías/product pages conectadas al configurador | D | P1 | L | alto | medio | Rental model estable + Media Library + canonical strategy |
| Rental packages indexables | bundles/pricing backend existen | páginas útiles de configuraciones reales | D | P2 | M | medio/alto | bajo | no crear packages artificiales ni contradecir pricing backend |
| Projects / case studies | portfolio parcial; Admin Projects planned | Project model + `/projects/[slug]` + casos reales | D | P1 | XL | estratégico | medio | Projects source-of-truth + Media Library + privacy/permissions |
| Portfolio CMS | contenido público parcial | convertir Selected Work a CMS reusable | D / roadmap activo posterior | P1 | L | alto | medio | Media Library |
| Media Library | R2/upload section-specific existe | listar/buscar/reusar/reemplazar/borrar con seguridad | D / roadmap activo posterior | P1 | L | alto | medio | R2 metadata, reference safety, cleanup/rollback |
| Journal / Articles CMS | Insights no operativo como sistema real | artículos técnicos basados en experiencia real | D | P2 | L | alto | bajo/medio | Article model + SEO fields + Media Library |
| Internal linking | links manuales | relaciones Services ↔ Products ↔ Projects ↔ Articles | D | P1 | M | alto | bajo | modelos anteriores; evitar páginas huérfanas |
| Structured data avanzado | JSON-LD base existe | Service/Product/Article/Breadcrumb schema donde corresponda | B/D | P1 | M | alto | medio | contenido visible real; validar guías vigentes antes de implementar |
| Multidioma SEO | EN/ES + hreflang base existen | URLs/metadata equivalentes por contenido nuevo | B/D | P1 | M | alto | medio | arquitectura de páginas; no mezclar idiomas |
| Local SEO | Bogotá/Colombia ya tiene landings | ampliar solo para servicios/mercados reales | D | P2 | M | medio/alto | bajo | keyword research + service reality; no doorway pages |
| CRM pipeline | forms/D1 existen; Admin Leads planned | New→Contacted→Quoted→Confirmed/Lost + cliente/empresa/historial | D | P1 | XL | estratégico | source-of-truth, permisos, datos existentes, quote flow |
| Lead attribution | GA4 + forms base | landing, UTM, campaign, service/product y revenue attribution | D | P1 | L | estratégico | CRM + analytics identifiers + privacy/consent |
| Analytics dashboard | GA4 existe; Admin Analytics planned | SEO/commercial dashboard con GSC/GA4/CRM | D | P2 | L | alto | datos/volumen real + APIs/credentials + CRM |
| Conversion/forms | Contact/Rental ya funcionan | reducir fricción/contextual CTA y capturar solo datos necesarios | B/D | P1 | M | alto | medir antes/después; preservar email invariants |
| About / professional authority | About/home contenido existente | perfil más profundo con datos verificables y proyectos reales | D | P2 | M | medio/alto | material real y autorizaciones |
| Video/motion | identidad audiovisual ya existe | video contextual y optimizado | D | P2 | L | alto | Media Library/video strategy + CWV budget |
| Press / mentions | no módulo dedicado | `/press` si existe material verificable suficiente | D | P3 | M | medio | bajo | contenido/links reales; no fabricar autoridad |
| Accessibility audit | base semántica/controls variable | contraste, keyboard, focus, headings, reduced motion, touch targets | D / quality stream | P1 | M | alto | bajo | ejecutar incrementalmente antes/durante expansión |
| Performance/CWV | Cloudflare/CDN base | responsive media, caching, font/video optimization, JS discipline | D / quality stream | P1 | M/L | alto | medio | medir antes; no sacrificar identidad sin evidencia |
| Security hardening | Access/JWT/Turnstile/validation base | rate limiting, headers, logs, backups, migration discipline | B/D | P1 | L | estratégico | medio | no romper GTM/Turnstile/media; pruebas obligatorias |
| Backlinks/authority outreach | fuera del repo | conseguir menciones legítimas de partners/venues/media | D externo | P2 | ongoing | alto | bajo | solo relaciones reales; no comprar links spam |

## Future Integrations — arquitectura sugerida

### P1 — alto valor cuando llegue su turno

1. **Services CMS + future-ready page model.** Extender el CMS actual; no introducir framework paralelo. Separar contenido visual de metadata SEO para permitir páginas profundas más adelante sin rehacer el modelo.
2. **Media Library reusable.** Mantener R2 como binario y D1 como metadata/referencias. Antes de borrar media, comprobar referencias y ofrecer rollback/soft-delete cuando corresponda.
3. **Projects / case studies.** Construir primero la fuente de verdad interna del Project; después permitir una proyección pública seleccionada/indexable. No hacer público automáticamente lo que exista en Admin.
4. **Rental SEO/catalog.** Reutilizar inventario, pricing backend y configurador actuales. Las product pages deben apuntar al mismo rental/request flow, no crear un segundo carrito o pricing paralelo.
5. **SEO-first CMS.** Metadata por página/idioma, canonical/hreflang, sitemap inclusion, OG/social preview y schema compatible con contenido visible.
6. **Internal linking model.** Relaciones explícitas entre Services, Products, Projects y Articles para navegación, SEO y conversión.
7. **CRM + attribution.** Forms actuales alimentarán un pipeline real; conservar consentimiento y source data. La relación deseada es Lead → Quote → Project → Invoice, no tablas duplicadas sin source-of-truth.

### P2 — crecimiento/autoridad después de tener modelos sólidos

- Journal técnico con pocos artículos excelentes y verificables.
- Dashboard SEO/comercial con GSC/GA4/CRM cuando exista volumen suficiente.
- About/professional profile más profundo.
- Video contextual optimizado con poster/lazy loading/CDN y presupuesto de performance.
- Local SEO adicional solo para servicios y ciudades reales.
- Packages de Rental útiles e indexables cuando representen configuraciones comerciales reales.
- Mejoras de navegación/IA únicamente cuando las nuevas secciones existan; no agregar menú vacío.

### P3 — opcional / condicionado

- Press/mentions page si existe corpus real suficiente.
- Programas de backlinks/partnerships como operación comercial externa, no automatización de enlaces.

## Deferred / no autorizado por ahora

- Crear 8–12 servicios, 10–20 productos, 5–10 proyectos o 10 artículos en bloque solo para llenar el sitio.
- Reorganizar de inmediato toda la navegación en Services/Rental/Projects/Journal/About/Contact.
- Construir CRM/Projects/Analytics/SEO dashboards antes de definir source-of-truth y relaciones.
- Migrar todo el media de GitHub a R2 de una sola vez.
- Cambiar framework, lenguaje, base de datos, hosting, CMS, auth o infraestructura por moda tecnológica.
- Hacer un rediseño global mientras el sistema actual funciona.

## Not Applicable / no recomendado

- Copiar diseños, copy, imágenes o branding de Mediacoustix, Wonderlust o WLive.
- Convertir SD.Live en una empresa genérica de producción/rental si eso diluye el posicionamiento Creative Audio + Technical Audio Systems.
- Generar una URL por keyword o cientos de páginas por ciudad.
- Publicar cientos de artículos genéricos producidos por IA.
- Inventar métricas, clientes, proyectos, certificaciones, testimonios o structured data.
- Comprar backlinks de baja calidad.
- Crear un segundo sistema de pricing, auth, analytics, CMS o media cuando el actual puede extenderse.

## Prerequisitos antes de cualquier bloque Future Integration

1. Inspeccionar el código real y confirmar qué ya existe.
2. Identificar consumidores de APIs/datos y mantener backward compatibility por defecto.
3. Definir datos afectados, estrategia de migración y rollback para cambios de schema.
4. Preservar contenido, D1, R2, historial y relaciones; no hacer migraciones destructivas improvisadas.
5. Hacer keyword research/intention mapping antes de crear nuevas URLs SEO.
6. Definir métricas de éxito antes de cambios de conversión.
7. Extender Visual Safeguards/tests si el bloque reconstruye un sistema visual ya aprobado.
8. Validar EN/ES, COL/INT, Desktop/Mobile, accessibility básica, performance y Draft/Published cuando aplique.
9. Hacer cambios incrementales y reversibles; un refactor grande necesita razón técnica concreta.
10. Si una funcionalidad no puede verificarse en el repo, marcar **UNKNOWN** en vez de inventar su arquitectura.

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
- Public Development URL de R2 permanece desactivado salvo necesidad explícita de desarrollo.
- Established aesthetics son contratos: no degradar branding/UX por trabajo CMS. Safeguards + tests deben acompañar reconstrucciones vulnerables.
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics si la base actual puede extenderse.
- **Estabilidad > novedad.** Si no hay evidencia suficiente para modificar una implementación funcional, conservarla.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirect `www`, wordmark dinámico, alcance WLive, smoke público y GA4 Realtime.

## 2026-08-20 — P1 Hero CMS + first paint

Published Hero servido desde D1 con SSR en edge, fallback estático, idioma resuelto antes del first paint y Draft aislado del sitio público.

## 2026-08-20 — P1.4 tests + CI

Se añadió `node:test` y GitHub Actions.

## 2026-08-20/21 — P2.1 Trusted By + R2

Modelo CMS Trusted/Supported Brands, Draft/Published, reorder, WLive protegido, controles de carrusel, Select, parity de Wonderlust, R2 productivo, upload autenticado, scale/placement metadata y migración de Trusted media.

## 2026-08-21 — P2.2 Trusted Published → Home

Trusted Published servido desde D1/R2 con SSR/fallback en producción. Cambio EN/ES y hover del carrusel estabilizados. Confirmado: **Save Draft no cambia producción; Publish sí cambia producción.**

## 2026-08-21 — P2.3 Testimonials + Visual Safeguards

Testimonials quedó gestionable desde Admin con D1 Draft/Published/revisions, R2 opcional, SSR/fallback, EN/ES, reorder/visibility/featured y Select. Smoke completo y semántica Draft/Publish validados. Se añadió el sistema Visual Safeguards y se ajustó el sheen para conservar la estética sin reintroducir el hitch del carrusel.

## 2026-08-21 — visión Future Evolution documentada

Se incorporó al roadmap la visión futura de Services/SEO/Projects/Rental/Journal/CRM/Analytics/autoridad, clasificada contra el estado real del repo. **No autoriza cambios inmediatos** y no altera el siguiente gate activo.

**Siguiente gate: P2.4 — Services CMS.**