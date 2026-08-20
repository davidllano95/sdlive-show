# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad del proyecto.** Este archivo registra qué está hecho, cómo está hecho, qué falta y cuál es el siguiente gate. Debe actualizarse al cerrar un milestone o ante un cambio material de alcance; no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-20 |
| Rama verificada | `main` |
| Commit verificado | `e81b9155c40950bde128218a6196c598f0457a86` |
| Producción | [https://sdlive.show](https://sdlive.show) |
| Milestone actual | P0 — base pública estable |
| Estado del milestone | **ABIERTO** |
| Siguiente gate | Corregir bloqueos P0 y pasar smoke test final |

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo completos.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit verificado arriba.
3. Si el SHA cambió, revisar el diff y actualizar solamente los estados afectados.
4. No rehacer trabajo marcado como completado sin evidencia concreta de una regresión.
5. Continuar por el primer ítem sin completar de **Milestone actual**.
6. Al cerrar el milestone, actualizar la tabla superior, el roadmap, el backlog afectado y el registro de milestones en un solo commit de documentación.

### Leyenda

- `[x]` Implementado y verificado en código o producción.
- `[~]` Parcial: existe una base útil, pero no cumple todavía toda la definición de terminado.
- `[ ]` Pendiente.
- **Externo**: se resuelve en Cloudflare, Google, correo u otro servicio fuera del repositorio.

## Milestone actual — P0: base pública estable

P0 no se cierra hasta completar todos los bloqueos y la verificación manual. El hecho de que la mayor parte del sitio esté en producción no sustituye este gate.

### Completado

- [x] **Hosting Cloudflare operativo.** El Worker `fragrant-brook-7554` sirve el sitio y ejecuta `/api/*` antes de los assets estáticos.
- [x] **Producción sincronizada con GitHub.** Los archivos críticos de producción coinciden con `main` en `e81b915`.
- [x] **Rutas públicas base.** Home, EN, ES-CO, Privacy, Theatre, landings SEO y 404 responden desde Cloudflare.
- [x] **URLs limpias.** HTTP redirige a HTTPS y las URLs `.html` se normalizan.
- [x] **D1 conectado.** `CMS_DB` apunta a `sdlive-cms-production`; `/api/health` confirma la conexión.
- [x] **Admin protegido.** Cloudflare Access protege `/admin`; el Worker valida nuevamente el JWT con `jose`, audiencia y correo autorizado.
- [x] **Contacto funcional.** `POST /api/contact` valida datos, Turnstile y consentimiento `2026-08-19`, guarda en D1 y notifica a `hello@sdlive.show` con Resend.
- [x] **Alquiler funcional.** `POST /api/rental` valida datos, calcula precios en servidor, guarda en D1 y notifica exclusivamente a `rental@sdlive.show`.
- [x] **Bundles y selección de alquiler.** LV1 + StageGrid y WING + DL32 se resuelven en backend; se permiten múltiples consolas y stage racks.
- [x] **Privacidad y consentimiento.** Banner/preferencias y modal de autorización están separados; GTM/GA4 se condicionan al consentimiento.
- [x] **Analítica base.** GTM `GTM-W4LDB4T7`, GA4 `G-F6MR3GJ716` y eventos de email, WhatsApp y generación de lead están configurados.
- [x] **Navegación Home en first-party JS.** La flecha usa `home-navigation.js`; GTM no controla la navegación.
- [x] **Theatre estabilizado.** Landing estática con una tarjeta grande y dos tarjetas iguales, sin transformación JS.
- [x] **SEO técnico P0.** Canonicals, `hreflang`, JSON-LD, Open Graph, titles/descriptions, `robots.txt`, sitemap y landings especializadas están publicados.
- [x] **Search Console inicial.** Google quedó configurado y Bing iniciado; el seguimiento continuo pertenece a optimización.
- [x] **Limpieza de implementaciones descartadas.** Se retiraron el mockup de Owner Access, `site-runtime.js/css`, la navegación en GTM y la frase antigua.
- [x] **Copy canónico.** Home usa exactamente “Creative Audio. Technical systems. Built for the show.”
- [x] **Convenciones históricas retiradas.** No quedan `SD.live`, `SDLive`, `SD Live`, el correo iCloud antiguo ni la implementación display-only.

### Bloqueos antes de cerrar P0

- [ ] **P0.1 — corregir redirect de `www` (Externo).** `https://www.sdlive.show/` redirige actualmente a `https://sdlive.show/s` y termina en 404. Corregir la regla de Cloudflare para que preserve la ruta y, en `/`, llegue a `https://sdlive.show/`.
- [ ] **P0.2 — garantizar el wordmark visual en contenido dinámico.** `privacy-consent.js` y `analytics-consent.js` vuelven a escribir copias con `textContent`, lo que puede perder el punto flotante de `SD.Live`. El alert nativo de éxito de contacto también muestra el nombre plano. Aplicar un renderer seguro o retirar la marca de mensajes que no admiten el wordmark.
- [ ] **P0.3 — resolver la presencia visible de WLive.** El logo y un testimonio vuelven a mostrar WLive aunque el alcance anterior pedía retirarlo de la experiencia visible. Confirmar la decisión y retirar la referencia visible si la regla sigue vigente.
- [ ] **P0.4 — smoke test final en navegador real.** Verificar Home, flecha Desktop/Mobile con URL limpia, Theatre, `/en/`, `/es-co/`, `/privacy`, 404, preferencias de cookies, autorización de contacto y autorización de alquiler.
- [ ] **P0.5 — validación analítica en producción.** Confirmar en GA4 Realtime los clics de email/WhatsApp y que un lead no se duplique; separar tráfico interno para la prueba.

### Definición de P0 cerrado

P0 puede marcarse `CERRADO` únicamente cuando P0.1–P0.5 estén completados, no haya regresiones visuales o funcionales en el smoke test y el commit desplegado haya sido verificado contra `main`. En ese corte se debe registrar la evidencia en el log de milestones.

## Siguiente milestone — P1: conectar el CMS con producción

- [ ] **P1.1 — binding Hero CMS → Home.** Consumir `GET /api/content/hero` desde el sitio público con fallback seguro al contenido estático.
- [ ] **P1.2 — preservar SEO y resiliencia.** El contenido crítico debe seguir disponible si la API falla y no provocar layout shift evitable.
- [ ] **P1.3 — preview y publish coherentes.** Verificar que Draft, Published y revisiones produzcan el mismo resultado visual en Editor y Home.
- [ ] **P1.4 — pruebas mínimas.** Añadir cobertura de la API, fallback, publicación y regresión del Hero antes de ampliar el CMS.

### Base ya implementada para P1

- [x] Dashboard y Editor Admin V6.4.
- [x] Navegación uniforme entre `/admin/` y `/admin/editor/`.
- [x] Previews COL/INT, EN/ES y Desktop/Mobile.
- [x] Modos Select/Interact, paneles colapsables, Focus Mode, capa de selección y preview de marca.
- [x] Draft, Published y revisiones del Hero guardados en D1.
- [x] Endpoints Admin del Hero y endpoint público `GET /api/content/hero`.
- [x] El Hero publicado en D1 coincide con el contenido estático al corte del 2026-08-20.
- [ ] El Home todavía no consulta el endpoint público; el Editor lo declara explícitamente como el siguiente paso.

## Roadmap por fases y gates

No se avanza de fase por cantidad de pantallas o commits, sino al cumplir el gate operativo de la fase anterior.

| Fase | Objetivo | Estado | Gate de salida |
|---|---|---|---|
| 1. Base estable | Sitio público, hosting, rutas, marca y formularios | En cierre (P0) | P0.1–P0.5 completos |
| 2. Seguridad y control | Access, permisos, validación, observabilidad y recuperación | Parcial | Controles probados y operación documentada |
| 3. Sistema de contenido | Modelo, media, versiones y publicación confiable | Iniciado | Hero real + contenido estructurado estable |
| 4. Editor real | Edición visual responsive y reutilizable | Pendiente | Edición/publish sin tocar código |
| 5. Automatización operativa | CRM, calendario, inventario, cotizaciones e inbox | Pendiente | Flujo lead → operación trazable |
| 6. Inteligencia y optimización | Analítica, SEO, rendimiento y reporting | Parcial | Métricas confiables y ciclo de mejora activo |
| 7. Escala comercial | Contenido, casos, automatización y conversión | Pendiente | Adquisición y seguimiento repetibles |
| 8. Ecosistema de plataforma | Extensiones premium e integraciones | Futuro | Solo después de validar las fases anteriores |

## Backlog maestro por área

### Admin, CMS y editor

- [~] **Base Admin V6.4.** Dashboard, Editor, estados de Hero y previews implementados.
- [ ] Hacer editables las secciones distintas del Hero.
- [ ] Drag/drop, resize, snap, spacing y visibilidad por dispositivo/mercado.
- [ ] Undo/redo, rollback, drafts por página, plantillas y duplicación.
- [ ] Librería de medios en R2; actualmente no existe binding R2.
- [ ] Gestión dinámica de Trusted By, Brands y Testimonials.
- [ ] Verificar y retirar `admin/admin.js` y `admin/admin.css` si se confirma que son duplicados sin uso.
- [ ] Convertir el staging oculto actual en una Template Library explícita.
- [ ] Settings centralizados, permisos editoriales y controles por ambiente.

### Contenido y experiencia pública

- [x] Hero, navegación Home, cards de Theatre y UI frontend de marcas están implementados.
- [~] Portfolio: tres piezas públicas y tres slots ocultos; faltan CMS, media y case studies.
- [~] Raw vs Mixed: existe lógica UI oculta; faltan audio real, waveform y control Admin.
- [~] Testimonials: uno real y placeholders ocultos; falta administración y resolver WLive.
- [~] Show Day: cambio manual en Home implementado; falta automatización y propagación a landings.
- [x] El viejo Owner Access fue retirado; el acceso real se hace por `/admin/` detrás de Cloudflare Access. No se necesita un login público por defecto.
- [ ] Header controls y floating controls administrables.
- [ ] Portfolio/CV privado con autorización real.
- [ ] Chatbot basado en conocimiento aprobado, manteniendo costo gratuito o casi gratuito.

### Contacto, alquiler y operación

- [x] Ingesta de contacto y alquiler en D1 con Turnstile, consentimiento y Resend.
- [x] Precios y bundles de alquiler calculados en servidor.
- [x] Rental se oculta para INT y puede revelarse con intención directa `#rental`.
- [~] La card de Equipment Rental respeta la visibilidad INT, pero todavía debe llevar directamente a `#rental` cuando corresponda.
- [ ] Autoresponder, rate limiting explícito y UI para seguimiento de leads.
- [ ] PDF de cotización, disponibilidad, vigencia y flujo de aprobación.
- [ ] Mejorar claridad del carrito: cotización, sin compra ni pago en línea, empty state y reset.
- [ ] Calendario de inventario y prevención de double booking.
- [ ] CRM: pipeline, clientes, historial, proyectos y relaciones; hoy solo existe ingestión D1.
- [ ] Calendario operativo, proyectos, automatización de cotizaciones y AppSheet.
- [ ] Conectar Show Day al calendario; el estado actual es manual y el endpoint/calendario automático no entrega eventos.
- [x] Acceso directo a Gmail para la operación de correo.
- [ ] Inbox nativo dentro del Admin.

### Analítica, SEO y crecimiento

- [~] Consent Mode, GTM, GA4 y eventos base implementados; falta validar Realtime y reporting confiable.
- [ ] Completar el funnel medible: form starts, leads calificados, atribución, mercado y resultados de negocio sin duplicados.
- [~] SEO técnico y landings P0 publicados; falta monitorizar indexación, queries, Core Web Vitals y conversión.
- [ ] Medir rendimiento real de “alquiler sonido Bogotá”, “sonido eventos corporativos Bogotá”, “alquiler consolas Bogotá” y “Behringer WING Bogotá” antes de crear más páginas.
- [ ] Dashboard/Data Studio y controles de analítica desde Admin.
- [ ] Estrategia de contenido, casos, insights, podcast, formación y tutoriales.
- [ ] Ciclo de experimentación de conversión y ROI por canal.

### Plataforma, seguridad y calidad

- [~] Access, JWT, Turnstile, D1 y consentimiento dan una base de seguridad útil.
- [ ] Rate limiting verificable, pruebas de autorización y estudio explícito free-vs-paid de controles.
- [ ] Evaluar CSP, Referrer-Policy y Permissions-Policy sin romper GTM, Turnstile ni assets.
- [ ] Tests automatizados, lint, CI y migraciones/versionado de esquema D1.
- [ ] Observabilidad de deploys, errores, D1, R2 futuro y backups desde Dashboard.
- [ ] Refactor posterior a pruebas: `index.html`, `script.js`, `styles.css` y `worker.js` son actualmente monolíticos.
- [ ] Diagnóstico visible y validación real de detección COL/INT por locale/timezone.
- [ ] Revisar noreply, aliases y DMARC como configuración externa de correo.

## Decisiones e invariantes — no reabrir sin evidencia

- La marca se escribe **SD.Live**. En UI visible debe usarse el wordmark con punto flotante; en strings machine-readable se mantiene texto literal.
- Descriptor canónico: **Creative Audio**.
- Tagline canónica exacta: **Creative Audio. Technical systems. Built for the show.**
- SD.Live no se presenta como agencia genérica de eventos, rental house ni sociedad incorporada.
- Rental es Colombia-first. INT lo oculta por defecto; una intención directa `#rental` puede exponerlo.
- Los formularios de rental se envían únicamente a `rental@sdlive.show`, nunca a `hello@sdlive.show`.
- Cloudflare Access es la barrera real del Admin; no reemplazarla con un login visual falso.
- El pricing de rental vive en backend; no moverlo al cliente ni rediseñarlo sin un bug o requisito nuevo.
- No restaurar Netlify, Owner Access mockup, `site-runtime`, navegación mediante GTM, tagline anterior, cards duplicadas Theatre/Theater ni dirección residencial.
- No reconstruir CMS/D1, Access, privacidad, Turnstile, analítica o SEO desde cero si el componente actual puede extenderse.
- No guardar secretos ni datos sensibles en GitHub.

## Registro de milestones

### 2026-08-20 — baseline y ruleout P0

**Resultado:** P0 permanece abierto. Se verificó que la mayoría de la base está implementada y que quedan bloqueos concretos; no se debe reiniciar la migración ni reconstruir sistemas ya operativos.

**Evidencia principal:**

- `main` y producción verificados en `e81b9155c40950bde128218a6196c598f0457a86`.
- `/api/health` identificó `sdlive-cms-production`.
- `/api/admin/whoami` fue interceptado por Cloudflare Access.
- Los archivos críticos de producción coincidieron con GitHub.
- Se localizaron los tres riesgos visibles: redirect `www`, wordmark dinámico y regreso de WLive.
- Se confirmó que el endpoint público del Hero existe, pero el Home aún no lo consume.

**Cambios históricos relevantes ya incorporados:**

- `4c57746`: retiro del mockup Owner Access.
- `9a5a0ce` y `c3c5723`: retiro de `site-runtime`.
- `e81b915`: actualización de `lastmod` del sitemap después de la limpieza P0.

## Protocolo de actualización por milestone

Actualizar este archivo cuando ocurra uno de estos eventos:

1. Se cierra un milestone o uno de sus gates.
2. Aparece o se resuelve un bloqueo que cambia la fecha o el orden del roadmap.
3. Cambia una decisión/invariante acordada.
4. Producción deja de coincidir con el estado documentado.

En cada actualización:

- Registrar fecha, rama y SHA verificados.
- Mover los checkboxes afectados sin borrar el historial.
- Añadir evidencia breve en el registro de milestones.
- Definir un único siguiente gate accionable.
- Actualizar `README.md` solo si cambió arquitectura, rutas u operación.

No actualizar por cambios cosméticos aislados, microcopy o commits intermedios que todavía no cierran un resultado verificable.

## Orden recomendado inmediato

1. Corregir la regla externa de `www` en Cloudflare.
2. Corregir el renderer del wordmark y el alert de contacto en el repositorio.
3. Resolver la decisión WLive y aplicar el resultado.
4. Ejecutar smoke test y validación GA4 en producción.
5. Marcar P0 cerrado y actualizar este archivo con el SHA desplegado.
6. Empezar P1.1: binding del Hero CMS hacia Home con fallback estático.
