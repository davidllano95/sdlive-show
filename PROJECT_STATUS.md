# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo está resuelto, qué falta y cuál es el siguiente gate. Se actualiza al cerrar milestones o ante cambios materiales de arquitectura/alcance, no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-20 |
| Rama verificada | `main` |
| Commit de milestone verificado | `cec8ea695a4f9115835117201a5fad4265f141c0` |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Milestone actual | P2 — ampliar el Editor/CMS de forma incremental |
| Estado | **Trusted By + R2 + Published→Home CERRADO y validado en producción** |
| Siguiente gate | **P2.3 — Testimonials CMS** |

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit de milestone verificado arriba.
3. Si cambió, revisar solamente los diffs posteriores y actualizar los estados afectados.
4. No rehacer trabajo marcado `[x]` salvo evidencia concreta de regresión.
5. Continuar por el primer gate abierto del milestone actual.
6. Al cerrar un milestone material, actualizar este archivo y `README.md` si cambió arquitectura u operación.

### Leyenda

- `[x]` Implementado y validado.
- `[~]` Parcial; existe base útil pero falta alcance o validación.
- `[ ]` Pendiente.
- **Externo**: Cloudflare, Google, Workspace u otro servicio fuera del repositorio.
- **Futuro/opcional**: idea preservada; no autoriza construirla antes de priorizarla.

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
2. [ ] Testimonials — avatar/foto si aplica al modelo final.
3. [ ] Portfolio / Selected Work.
4. [ ] Rental imagery.
5. [ ] Insights/blog thumbnails/hero cuando exista contenido real.
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
- [x] Fix de estabilidad de hover del carrusel live; regresión que podía retroceder cerca de Mediacoustix no se pudo reproducir tras deploy.
- [x] Prueba final de publishing validada: **Save Draft no cambia producción; Publish sí cambia producción.**
- [x] Cambio de prueba revertido y Published restaurado.

PRs principales del cierre Trusted/R2/SSR: #12–#22.

---

# P2.3 — Testimonials CMS

**Estado: SIGUIENTE GATE — pendiente de implementar.**

Objetivo: convertir Testimonials al mismo patrón probado sin ampliar todavía a drag/drop libre.

- [ ] Inventariar testimonios reales vs placeholders/mockups actuales.
- [ ] Definir schema estable: persona, cargo/empresa, quote EN/ES, imagen/avatar opcional, orden, visibilidad y featured/style solo si es realmente necesario.
- [ ] Preservar el estilo minimal/luxury actual y animación de reflejo ya aprobada.
- [ ] Draft/Published en D1.
- [ ] Editor visual con agregar/eliminar/reordenar.
- [ ] Upload/Replace de avatar/foto mediante R2 solo si hay media editable.
- [ ] Public binding con fallback seguro; escoger SSR/edge si evita flash y encaja con el patrón actual.
- [ ] Tests de schema, Draft leak, fallback y media.
- [ ] Smoke EN/ES + Desktop/Mobile + Draft/Publish en producción.

Después de Testimonials: Services → Media Library reusable → Portfolio / Selected Work.

---

# Backlog maestro por área

## Admin / CMS / Editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Select/Interact, Focus, paneles colapsables y selección visual base.
- [x] Hero CMS completo y Published→Home SSR.
- [x] Trusted By CMS completo, R2 y Published→Home SSR.
- [~] Media/R2: infraestructura y Trusted completos; falta Media Library reusable y migración por secciones.
- [ ] Testimonials CMS.
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
- [x] Theatre estabilizado.
- [x] WLive visible y vigente.
- [~] Portfolio: piezas públicas existen; falta modelo CMS/media/credits/tags/featured.
- [~] Raw vs Mixed: UI existe; faltan audios reales + Admin.
- [~] Testimonials: contenido real + placeholders; falta gestión CMS.
- [~] Show Day: manual existe; falta integración con calendario.
- [ ] Portfolio/CV privado no indexado con variantes profesionales.
- [ ] Recuperar Insights/blog cuando exista contenido real.
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
- [ ] Separar tráfico interno/testing.
- [ ] Revisar Key Events vs microconversiones.
- [ ] Funnel sesión → source → lead → qualified → closed.
- [ ] Monitorizar indexación, queries, impressions, CTR, países, entradas y Core Web Vitals.
- [ ] Medir landings antes de crear más SEO pages.
- [ ] Dashboard/Data Studio o equivalente cuando haya volumen real.
- [ ] Estrategia de adquisición basada en conversiones/revenue.

## Plataforma / seguridad / calidad

- [~] Access, JWT, Turnstile, D1, R2 y consentimiento forman la base actual.
- [x] Tests + CI base.
- [ ] Rate limiting explícito y verificable.
- [ ] CSP, Referrer-Policy y Permissions-Policy sin romper GTM/Turnstile/media.
- [ ] Migraciones/versionado de esquema D1.
- [ ] Observabilidad Worker/D1/R2, publish/deploy y errores.
- [ ] Alertar antes de acercarse a límites relevantes de R2/Workers.
- [ ] Backups/export y rollback operacional.
- [ ] Limpieza segura de objetos R2 huérfanos después de replacements/migraciones.
- [ ] Refactor de monolitos (`index.html`, `script.js`, `styles.css`, `worker.js`) solo con tests verdes.
- [ ] Retirar `deploy-test.txt` en cleanup futuro si se confirma que ya no sirve.

---

# Decisiones e invariantes — no reabrir sin evidencia

- Marca exacta: **SD.Live**.
- Descriptor: **Creative Audio**.
- Tagline exacta: **Creative Audio. Technical systems. Built for the show.**
- En UI visible, `SD.Live` usa el wordmark con punto flotante cuando aplique; metadata/código/string machine-readable usa texto literal.
- SD.Live no debe parecer agencia genérica de eventos, rental house, CV personal ni sociedad incorporada.
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
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics si la base actual puede extenderse.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirect `www`, wordmark dinámico, alcance WLive, smoke público y GA4 Realtime.

## 2026-08-20 — P1 Hero CMS + first paint

Published Hero servido desde D1 con SSR en edge, fallback estático, idioma resuelto antes del first paint y Draft aislado del sitio público.

## 2026-08-20 — P1.4 tests + CI

Se añadió `node:test` y GitHub Actions.

## 2026-08-20 — P2.1 Trusted By editor

Modelo CMS Trusted/Supported Brands, Draft/Published, reorder, WLive protegido, controles de carrusel, Select y parity de Wonderlust.

## 2026-08-20 — P2.1.2 R2 media foundation + Trusted migration

R2 productivo, custom domain, upload autenticado, scale/placement metadata, migrador legacy y Trusted/Supported Brands migrados y validados.

## 2026-08-20 — P2.2 Trusted Published → Home

Trusted Published quedó servido desde D1/R2 con SSR/fallback en producción. Se estabilizó cambio EN/ES y hover del carrusel. Prueba final confirmada: **Save Draft no cambia producción; Publish sí cambia producción.**

**Siguiente gate: P2.3 — Testimonials CMS.**