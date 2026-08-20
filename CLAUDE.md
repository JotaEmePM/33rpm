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
- `POST /api/releases/importar` (admin) aplica el CSV del panel: reutiliza `parseReleaseBody` fila a fila, es **todo o nada** —una fila mala aborta la transacción entera— y las filas sin `id` se dan de alta con `slugify`. Con `sincronizar: true` el archivo se toma como la foto completa y `hideMissing` oculta lo que no aparezca; sin ese campo, una subida parcial sólo toca lo que trae.
- **Marcas del disco**: `is_new` (novedad del drop), `is_preorder` (preventa) e `is_featured` (portada). Se filtran con `novedad=1`, `preventa=1` y `destacado=1`, y como toda columna añadida después, entran por `ensureColumn`.
- **Visibilidad**: `releases.visible` decide si un disco se muestra. Oculto no es borrado —conserva stock e id— pero desaparece del catálogo, de `/api/meta`, de la búsqueda y de su propia ficha (404 salvo admin), y `createOrder` lo rechaza con 409. En el CSV se controla con la columna `visible` o poniendo `-1` en el stock. La columna se añade con `ensureColumn` en `migrate()`, porque `CREATE TABLE IF NOT EXISTS` no altera tablas ya creadas.

### `packages/frontend` — React 19, Vite, Tailwind v4, react-router 8

`api/` (cliente fetch tipado) → `hooks/` → `pages/`. Sin estado global salvo `CartProvider` y `FlyToCartProvider`, ambos por encima del router en `App.tsx`.

- Router en modo **data router** (`router/routes.tsx` + `router/index.ts`). Catálogo y ficha cargan por *loaders*; el resto usa `useAsync` / `useReleases`.
- Los filtros del catálogo viven en la URL (`genero`, `formato`, `estado`, `stock`, `orden`), no en estado local: así son enlazables y cada cambio es una navegación animable.
- El buscador del header es un combobox con sugerencias: `useSearchSuggestions` retrasa la consulta 200 ms y `useAsync` cancela la anterior, así que una respuesta lenta nunca pisa a la más reciente.
- El carrusel de la portada muestra los **destacados**; si no hay ninguno marcado cae a los discos más recientes, para que la portada nunca quede sin sección.
- El panel avisa antes de ocultar: al subir un CSV compara con el catálogo y, si faltan discos que hoy se ven, pide confirmación y los lista en vez de aplicarlo de una.
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
