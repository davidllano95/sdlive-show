# SD.Live

Sitio público, formularios operativos y CMS inicial de **SD.Live**, una práctica de audio creativo y sistemas técnicos para shows. La frase canónica de marca es:

> Creative Audio. Technical systems. Built for the show.

- Producción: [https://sdlive.show](https://sdlive.show)
- Repositorio: [davidllano95/sdlive-show](https://github.com/davidllano95/sdlive-show)
- Estado, pendientes y handoff: [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)

## Estado actual

El sitio público está en producción sobre Cloudflare Workers. La migración base, formularios, privacidad, analítica, SEO técnico inicial y la primera versión del Admin/CMS están implementados. **P0 — base pública estable está cerrado** desde el 2026-08-20: redirect `www`, wordmark dinámico, smoke test y validación GA4 en producción quedaron completados. El milestone actual es **P1 — conectar el CMS con producción**, empezando por el binding del Hero publicado hacia el Home con fallback estático. **WLive se mantiene visible**; no es un bloqueo ni un elemento a retirar.

En GA4 Realtime se validaron `contact_email_click`, `contact_whatsapp_click` y `generate_lead`; un único envío real produjo un único `generate_lead`, con `lead_type = contact` y `market = colombia`. La separación de tráfico interno/testing y la revisión de qué eventos deben seguir como Key Events quedan como optimización posterior.

`PROJECT_STATUS.md` es la fuente de verdad para saber qué está hecho, cómo está hecho, qué falta y cuál es el siguiente paso. Se actualiza al cerrar un milestone o cuando cambia materialmente su alcance; no por cada parche pequeño.

## Arquitectura

| Capa | Implementación actual |
|---|---|
| Hosting y API | Cloudflare Worker `fragrant-brook-7554` |
| Sitio | HTML, CSS y JavaScript estáticos, sin build frontend |
| Datos | Cloudflare D1, binding `CMS_DB`, base `sdlive-cms-production` |
| Admin | Cloudflare Access + validación JWT en el Worker con `jose` |
| Formularios | Turnstile, validación server-side, D1 y notificaciones con Resend |
| Analítica | GTM `GTM-W4LDB4T7`, Consent Mode y GA4 `G-F6MR3GJ716`; `analytics-consent.js` carga antes de GTM |
| SEO | Canonicals, `hreflang`, JSON-LD, Open Graph, `robots.txt` y sitemap |

El Worker sirve los assets estáticos y procesa `/api/*` antes del fallback de archivos. No hay R2 ni pipeline de build en esta versión.

## Rutas públicas principales

| Ruta | Uso |
|---|---|
| `/` | Home bilingüe e interacción principal |
| `/en/` | Landing general en inglés |
| `/es-co/` | Landing general en español para Colombia |
| `/theatre-sound-design-audio-post` | Teatro, diseño sonoro y audio post |
| `/audio-eventos-streaming-teatro-bogota` | Servicios de audio en Bogotá |
| `/alquiler-sonido-wing-midas-dl32-bogota` | Alquiler de equipos en Colombia |
| `/en/audio-equipment-rental-bogota` | Versión en inglés de alquiler |
| `/privacy` | Política de privacidad |
| `/admin/` | Dashboard protegido por Cloudflare Access |
| `/admin/editor/` | Editor de contenido protegido |

Cloudflare aplica el manejo automático de URLs HTML con trailing slash. Los redirects de dominio se administran fuera de este repositorio; su estado se documenta en `PROJECT_STATUS.md`.

## API actual

### Pública

- `GET /api/health`: salud del Worker y conexión D1.
- `GET /api/content/hero`: Hero publicado en el CMS.
- `POST /api/contact`: captura de contacto, consentimiento, Turnstile, D1 y correo a `hello@sdlive.show`.
- `POST /api/rental`: cotización de alquiler, precios calculados en servidor, Turnstile, D1 y correo exclusivo a `rental@sdlive.show`.

### Protegida

- `GET /api/admin/whoami`
- `GET` y `PUT /api/admin/content/hero`
- `POST /api/admin/content/hero/publish`
- `GET /api/admin/content/hero/revisions`

Las rutas `/api/admin/*` requieren Cloudflare Access. El Worker vuelve a verificar el JWT, su audiencia y el correo autorizado; la interfaz Admin no es una barrera de seguridad por sí sola.

## CMS y Admin

La versión actual del Admin es **V6.4**. Incluye Dashboard, Editor, previews COL/INT, EN/ES y Desktop/Mobile, selección de elementos, Focus Mode, borrador de Hero, publicación y revisiones guardadas en D1.

Solo el Hero tiene persistencia editorial completa. El endpoint público ya existe, pero el Home todavía no consume `/api/content/hero`; por eso el binding CMS → sitio público es el primer trabajo de P1. El resto de las secciones siguen siendo preview-only.

## Formularios y correo

- Contacto: destino y remitente `hello@sdlive.show`.
- Alquiler: destino y remitente `rental@sdlive.show`; no debe enviarse a `hello@`.
- Consentimiento aceptado actualmente: versión `2026-08-19`.
- Secretos requeridos por el Worker: `TURNSTILE_SECRET_KEY` y `RESEND_API_KEY`.

No se deben guardar secretos, tokens ni datos personales en el repositorio.

## Desarrollo

Requisitos: Node.js, npm, una cuenta Cloudflare con acceso al Worker/D1 y Wrangler autenticado.

```bash
npm install
npx wrangler dev
```

La configuración productiva vive en `wrangler.jsonc`. Los secretos se configuran en Cloudflare, no en ese archivo. Antes de desplegar, validar localmente el JavaScript, las rutas públicas, los flujos de contacto/alquiler y las rutas protegidas del Admin.

## Protocolo de mantenimiento

- Actualizar `PROJECT_STATUS.md` cuando se cierre un milestone, aparezca o se resuelva un bloqueo material, o cambie el alcance acordado.
- Actualizar este README cuando cambien la arquitectura, las rutas, las dependencias operativas o el proceso de incorporación.
- Cada corte de estado debe registrar fecha, commit verificado, evidencia y siguiente gate.
- No duplicar el backlog en Issues, README y documentos externos sin definir una única fuente de verdad.

Para retomar el proyecto en una conversación nueva, empezar por [`PROJECT_STATUS.md`](./PROJECT_STATUS.md), verificar el SHA de `main` y trabajar sobre el primer ítem pendiente del milestone actual.