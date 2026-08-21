# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**33rpm** es una tienda de vinilos: monorepo pnpm + Lerna con un API Express (`packages/api`) y un frontend React (`packages/frontend`).

## Comandos

Desde la raíz:

```bash
pnpm dev      # lerna run dev --parallel: levanta API y frontend a la vez
pnpm build    # compila ambos paquetes
pnpm lint     # biome en ambos paquetes
pnpm check    # biome check --write sobre todo el repo
```

Por paquete, sin cambiar de directorio:

```bash
pnpm --dir packages/api dev          # tsx watch, escucha en :3000
pnpm --dir packages/api db:push      # crea el esquema y siembra la base configurada
pnpm --dir packages/api typecheck    # tsc --noEmit
pnpm --dir packages/frontend dev     # Vite en :5173 (salta de puerto si está ocupado)
pnpm --dir packages/frontend build   # tsc -b && vite build
pnpm --dir packages/frontend lint:oxlint
```

`lint:fix` (biome) existe en ambos paquetes y es la forma normal de formatear.

**No hay tests ni runner instalado.** La comprobación habitual es levantar ambos servicios y atacar los endpoints con `curl` a través del proxy del frontend (`/api` → `:3000`, configurado en `vite.config.ts`), que de paso valida el proxy y el CORS.

## Arquitectura

### `packages/api` — Express 5, TypeScript ESM

`routes/` (HTTP y validación) → `repositories/` (SQL) → `db/`. Los imports internos llevan extensión `.js` (NodeNext).

- **Persistencia con `@libsql/client`**: una sola base para catálogo, pedidos y auth. Sin `TURSO_DATABASE_URL` es un archivo local (`data/33rpm.db`); con ella, Turso. Todo el acceso a datos es **asíncrono**.
- `db/connection.ts` expone `all/one/run` y una `transaction()` que **pasa el ejecutor** al trabajo: quien participa en la transacción lo recibe como último parámetro (`getRelease(id, tx)`). Un repositorio llamado sin ejecutor abre la suya si la necesita, como `createOrder`.
- `migrate()` y `seed()` **no corren al arrancar**: `pnpm db:push` los aplica sobre la base que digan las variables de entorno, y en desarrollo `index.ts` los ejecuta una vez. El catálogo se siembra desde `db/seed-data.ts` con 12 discos inventados.
- `index.ts` crea la app con `express()` y `create-app.ts` la configura: ese reparto es lo que hace que Vercel reconozca el entrypoint (ver *Despliegue*).
- `db/auth-schema.ts` es **SQL generado**, no escrito a mano: `pnpm dlx @better-auth/cli generate --config src/auth/auth.ts`. Al cambiar plugins o campos de usuario hay que regenerarlo.
- Validación propia en `lib/validation.ts` (clase `Validator`, responde 422 con la lista de campos que fallaron). No hay zod.
- `createOrder` descuenta stock dentro de la transacción y devuelve 409 si no alcanza.
- `POST /api/releases/importar` (admin) aplica el CSV del panel: reutiliza `parseReleaseBody` fila a fila y es **todo o nada** —una fila mala aborta la transacción entera—. Cada fila es alta o edición según **exista ya ese id**, que se consulta de una vez con `existingReleaseIds`: un id nuevo (o vacío) crea el disco, uno conocido lo actualiza. Los ids del archivo pasan por `slugify`, así que una mayúscula o un espacio de más no crea duplicados. Con `sincronizar: true` el archivo se toma como la foto completa y `hideMissing` oculta lo que no aparezca; sin ese campo, una subida parcial sólo toca lo que trae.
- **Marcas del disco**: `is_new` (novedad del drop), `is_preorder` (preventa) e `is_featured` (portada). Se filtran con `novedad=1`, `preventa=1` y `destacado=1`, y como toda columna añadida después, entran por `ensureColumn`.
- **Fotos en Vercel Blob**: `release_images` guarda url, pathname y cuál es la portada (`is_primary`). El navegador redimensiona la foto y la manda **en binario crudo** a `POST /api/releases/:id/imagenes`, que la sube con `put()` y la registra; así no hay multipart ni tokens de cliente, y el secreto no sale del servidor. Sin `BLOB_READ_WRITE_TOKEN` la ruta responde 503 en vez de fallar de forma rara.
- Al borrar un disco o una foto, los blobs se eliminan **fuera de la transacción**: la base ya está limpia y un huérfano en el store es menos grave que un error a medio camino.
- **Last.fm**: `GET /api/lastfm/album?url=` (admin) traduce una URL `last.fm/music/Artista/Album` en artista, título, pistas con duración y etiquetas; la clave vive en el servidor (`LASTFM_API_KEY`) y sólo se usa `album.getInfo`, que es lectura pública y no necesita el shared secret. Ojo: `wiki.published` es la fecha del wiki, **no** el año de edición, así que el año no se autocompleta.
- **Portada de Last.fm**: si un disco con ficha se queda sin fotos, se copia la imagen `large` (174 px; `COVER_SIZE` en `lib/lastfm.ts` cambia a `extralarge` o `mega`) al store de Blob y queda de portada. Ocurre al dar de alta, al importar y con el botón del panel; nunca pisa una foto subida a mano, y si falla sólo queda un aviso en el log porque es un extra del alta, no parte de ella. Se descarta el placeholder que Last.fm devuelve para los álbumes sin carátula.
- La importación CSV completa desde Last.fm lo que el archivo no traiga (artista, título, tracklist) antes de validar; lo escrito en el CSV siempre manda. Se consultan como mucho 40 fichas por subida, de cuatro en cuatro, para no agotar el tiempo de la función.
- **Pagos con Mercado Pago (Checkout Pro)**: `POST /api/orders/:id/pago` crea la preferencia —con el despacho como una línea más— y devuelve el `init_point` al que se manda al cliente; el pedido viaja como `external_reference`. `POST /api/pagos/webhook` recibe el aviso, **valida la firma** (`x-signature`: HMAC-SHA256 de `id:…;request-id:…;ts:…;`) y consulta el pago antes de creer nada. Sin `MP_ACCESS_TOKEN` la ruta de cobro responde 503 y el checkout cae al resguardo de siempre. `auto_return` sólo se manda si la URL de vuelta es pública: con `localhost` Mercado Pago responde 400 (`invalid_auto_return`), así que en desarrollo se omite y el cliente vuelve pulsando el botón del comprobante.
- El webhook responde 200 salvo firma inválida: un error nuestro haría que Mercado Pago reintentara cinco veces. `applyPaymentResult` es idempotente porque esas notificaciones se repiten.
- **Stock y pago**: el pedido reserva stock al crearse. Un pago rechazado o cancelado lo anula y **devuelve las unidades**; un reembolso anula el pedido pero **no repone**, porque el disco pudo haber salido ya. Un pedido `enviado` no retrocede por una notificación.
- **Lista de deseos**: `wishlist` (user_id + release_id) guarda ids, no copias, así que la lista muestra siempre el precio de hoy. `/api/lista-deseos` exige sesión —cualquier cliente, no sólo admin— y sólo devuelve discos visibles: ocultar uno lo saca de la lista y de su contador, pero la marca sobrevive y vuelve sola si el disco reaparece.
- **Visibilidad**: `releases.visible` decide si un disco se muestra. Oculto no es borrado —conserva stock e id— pero desaparece del catálogo, de `/api/meta`, de la búsqueda y de su propia ficha (404 salvo admin), y `createOrder` lo rechaza con 409. En el CSV se controla con la columna `visible` o poniendo `-1` en el stock; `-2` **elimina** el disco (con sus pistas), y por eso `deleteRelease` borra las pistas a mano en vez de fiarse del `ON DELETE CASCADE`, que en el SQLite local está apagado. Los pedidos guardan su copia de artista, título y precio, así que borrar no toca el histórico. La columna se añade con `ensureColumn` en `migrate()`, porque `CREATE TABLE IF NOT EXISTS` no altera tablas ya creadas.

### `packages/frontend` — React 19, Vite, Tailwind v4, react-router 8

`api/` (cliente fetch tipado) → `hooks/` → `pages/`. Sin estado global salvo `CartProvider` y `FlyToCartProvider`, ambos por encima del router en `App.tsx`.

- Router en modo **data router** (`router/routes.tsx` + `router/index.ts`). Catálogo y ficha cargan por *loaders*; el resto usa `useAsync` / `useReleases`.
- Los filtros del catálogo viven en la URL (`genero`, `formato`, `estado`, `stock`, `orden`), no en estado local: así son enlazables y cada cambio es una navegación animable.
- El buscador del header es un combobox con sugerencias: `useSearchSuggestions` retrasa la consulta 200 ms y `useAsync` cancela la anterior, así que una respuesta lenta nunca pisa a la más reciente.
- `/api/meta` expone `paymentsEnabled` (si hay `MP_ACCESS_TOKEN`): el checkout cambia el botón a «Ir a pagar» y sólo promete el resguardo de pedido pendiente cuando de verdad no hay pasarela. `OrderConfirmation` es sólo el recibo —su aviso sale de `paymentStatus`— y cada página pone sus acciones.
- El checkout crea el pedido, pide el cobro y **sale de la tienda** hacia Mercado Pago; se vuelve a `/pedido/:id`, que refresca solo mientras el pago esté en proceso y deja reintentar si quedó pendiente.
- `WishlistProvider` mantiene los ids de la lista de deseos por encima del router, junto a `CartProvider`. El corazón pinta el cambio antes de que responda el servidor y lo revierte si falla; sin sesión lleva a `/login` con el destino de vuelta.
- La ficha muestra la galería (`ReleaseGallery`): miniaturas al costado y flechas sobre la foto, sin zoom. En catálogo y buscador se usa `images[0]`, que el API garantiza que es la portada.
- El panel sube las fotos desde `ImageManager`, que redimensiona a 1600 px y las convierte a WebP antes de enviarlas. `/admin/fotos` lista los discos sin foto —los que entran por CSV llegan así— para cargarlas de corrido.
- El carrusel de la portada muestra los **destacados**; si no hay ninguno marcado cae a los discos más recientes, para que la portada nunca quede sin sección.
- `/admin/pedidos` lista los pedidos con su estado de cobro, deja cambiar el estado del pedido y despliega cada uno con sus discos, teléfono y dirección. El listado del API devuelve **como mucho 50** (`listOrders`), que es lo que hay hasta que haga falta paginar.
- El panel avisa antes de ocultar o borrar: al subir un CSV compara con el catálogo y, si faltan discos que hoy se ven o alguna fila trae `-2`, pide confirmación y los lista en vez de aplicarlo de una.
- El CSV del panel se arma y se lee en el cliente (`lib/csv.ts` para el formato, `lib/catalog-csv.ts` para las columnas en español). Lleva BOM porque si no Excel destroza los acentos, y al leer detecta si el separador es coma, punto y coma o tabulador.
- Tailwind v4 **sin `tailwind.config`**: los tokens (`ink`, `paper`, `volt`, `font-display`…) se declaran en `@theme` dentro de `src/index.css`.

## Reglas que rompen el build si se ignoran

- **Biome**: sin punto y coma, comillas dobles, 100 columnas, comas finales. Pasa `lint:fix` antes de dar nada por terminado.
- El `biome.json` del frontend necesita `css.parser.tailwindDirectives`; sin eso Biome no parsea `@theme` ni `@utility`.
- **`erasableSyntaxOnly`** en el frontend prohíbe las *parameter properties* (`constructor(private x)`). Por eso `ApiError` declara sus campos aparte.
- `verbatimModuleSyntax`: los tipos se importan con `import type`.
- **`RouterProvider` se importa de `react-router/dom`**, nunca de `react-router`: solo ese dispara las view transitions.
- En `create-app.ts`, `toNodeHandler(auth)` va montado **antes** de `express.json()` — better-auth parsea su propio cuerpo.
- `packages/api/tsconfig.json` tiene `declaration: false` a propósito: con `true`, los tipos inferidos de better-auth no compilan.

## Seguridad y autenticación

- Entrada **solo por magic link**, enviado con **Resend** (`auth/magic-link-mailer.ts`, plantilla en `auth/magic-link-email.ts`). Sin `RESEND_API_KEY` el enlace se imprime en el log, que es como funciona el desarrollo; en producción, sin clave, falla en vez de fingir el envío.
- `middleware/require-auth.ts` identifica por JWT `Bearer` (verificado contra JWKS con `jose` en `auth/verify-token.ts`) o por cookie de sesión. El `verifyJWT` de better-auth **no funciona** fuera de su contexto interno; no volver a intentarlo.
- `requireAdmin` protege escrituras de catálogo y la gestión de pedidos. El `RequireAdmin` del frontend es solo comodidad visual: la autorización real es del API.
- `middleware/security.ts` concentra helmet, CORS por lista blanca y tres niveles de rate limit (global, auth, escrituras). Un origen no autorizado produce `CorsError` → 403.
- Turso es opcional en desarrollo: sin `TURSO_DATABASE_URL` todo vive en el SQLite local. Las variables están en `packages/api/.env.example`; el esquema se aplica con `pnpm db:push`.
- `AUTH_JWKS_URL` existe porque en Vercel el API se sirve tras el proxy del frontend: pedirse las claves a sí mismo por `BETTER_AUTH_URL` daría la vuelta larga.

## Despliegue (Vercel)

Dos proyectos sobre el mismo repo, ambos con despliegue automático al empujar a `master`:

| Proyecto | Root directory | URL |
| --- | --- | --- |
| `33rpm-web` | `packages/frontend` | https://33rpm-web.vercel.app |
| `33rpm-api` | `packages/api` | https://33rpm-api-jotaemepms-projects.vercel.app |

- El frontend **hace de proxy**: `packages/frontend/vercel.json` reescribe `/api/*` hacia el API. Así la sesión es cookie de primera parte; con dominios separados serían cookies de terceros y Safari las bloquea. Por eso `BETTER_AUTH_URL`, `APP_URL` y `CORS_ORIGINS` apuntan al **dominio del frontend**.
- Vercel detecta el API como servidor Express y arranca el entrypoint que encuentre en `outputDirectory` (`dist`). Busca `app`/`index`/`server` por ese orden y **exige que el entrypoint importe `express`**: de ahí que `index.ts` haga el `express()` y que no exista `dist/app.js`.
- La base de producción es la rama `prd` de Turso. El esquema se aplica desde fuera (`pnpm db:push` con las variables de `prd`), nunca en el arranque en frío.
- Las variables de producción viven en Vercel (`vercel env ls --cwd packages/api`). `NODE_ENV` la pone Vercel.
- El correo sale desde `MAIL_FROM`, hoy `33rpm <onboarding@resend.dev>`. Ese remitente de pruebas de Resend **solo entrega a la dirección dueña de la cuenta** (`jotaemepm@outlook.com`): a cualquier otro destinatario Resend responde 403 y el acceso da 500. Para abrirlo a clientes hay que verificar un dominio en resend.com/domains y cambiar `MAIL_FROM`; no hay que tocar código.
- El límite de intentos de auth cuenta la IP real del cliente tras el proxy: `X-Forwarded-For` falsificada no reinicia el contador (comprobado en producción).

## Convenciones de producto

- **Todo en español**: interfaz, comentarios, mensajes de error del API y nombres de parámetros de query.
- Precios en pesos chilenos enteros, formateados con `lib/format.ts`.
- Dirección visual "póster de concierto": negro y `volt`, bordes duros, bloques planos; sin sombras ni degradados.
- Los datos que aún no existen se marcan como `[PLACEHOLDER]` visible (dirección de la tienda, tarifa de despacho…) en vez de inventarse.
- Las animaciones (view transitions, vuelo al carrito, carrusel) respetan `prefers-reduced-motion`, y los `view-transition-name` deben ser únicos en pantalla o la transición se cancela.
