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

- **Persistencia con `node:sqlite`** (`DatabaseSync`), no better-sqlite3. Requiere Node 24 y avisa de API experimental al arrancar.
- `db/connection.ts` expone un `transaction()` **reentrante** (contador de profundidad): `createOrder` llama a funciones que ya transaccionan, y SQLite no anida `BEGIN`.
- `migrate()` y `seed()` corren al construir la app en `app.ts`, no como paso aparte. El catálogo se siembra desde `db/seed-data.ts` con 12 discos inventados.
- `db/auth-schema.ts` es **SQL generado**, no escrito a mano: `pnpm dlx @better-auth/cli generate --config src/auth/auth.ts`. Al cambiar plugins o campos de usuario hay que regenerarlo.
- Validación propia en `lib/validation.ts` (clase `Validator`, responde 422 con la lista de campos que fallaron). No hay zod.
- `createOrder` descuenta stock dentro de la transacción y devuelve 409 si no alcanza.

### `packages/frontend` — React 19, Vite, Tailwind v4, react-router 8

`api/` (cliente fetch tipado) → `hooks/` → `pages/`. Sin estado global salvo `CartProvider` y `FlyToCartProvider`, ambos por encima del router en `App.tsx`.

- Router en modo **data router** (`router/routes.tsx` + `router/index.ts`). Catálogo y ficha cargan por *loaders*; el resto usa `useAsync` / `useReleases`.
- Los filtros del catálogo viven en la URL (`genero`, `formato`, `estado`, `stock`, `orden`), no en estado local: así son enlazables y cada cambio es una navegación animable.
- Tailwind v4 **sin `tailwind.config`**: los tokens (`ink`, `paper`, `volt`, `font-display`…) se declaran en `@theme` dentro de `src/index.css`.

## Reglas que rompen el build si se ignoran

- **Biome**: sin punto y coma, comillas dobles, 100 columnas, comas finales. Pasa `lint:fix` antes de dar nada por terminado.
- El `biome.json` del frontend necesita `css.parser.tailwindDirectives`; sin eso Biome no parsea `@theme` ni `@utility`.
- **`erasableSyntaxOnly`** en el frontend prohíbe las *parameter properties* (`constructor(private x)`). Por eso `ApiError` declara sus campos aparte.
- `verbatimModuleSyntax`: los tipos se importan con `import type`.
- **`RouterProvider` se importa de `react-router/dom`**, nunca de `react-router`: solo ese dispara las view transitions.
- En `app.ts`, `toNodeHandler(auth)` va montado **antes** de `express.json()` — better-auth parsea su propio cuerpo.
- `packages/api/tsconfig.json` tiene `declaration: false` a propósito: con `true`, los tipos inferidos de better-auth no compilan.

## Seguridad y autenticación

- Entrada **solo por magic link**. En desarrollo el enlace se imprime en el log (`auth/magic-link-mailer.ts`); en producción **falla explícitamente** hasta enchufar un proveedor de correo.
- `middleware/require-auth.ts` identifica por JWT `Bearer` (verificado contra JWKS con `jose` en `auth/verify-token.ts`) o por cookie de sesión. El `verifyJWT` de better-auth **no funciona** fuera de su contexto interno; no volver a intentarlo.
- `requireAdmin` protege escrituras de catálogo y la gestión de pedidos. El `RequireAdmin` del frontend es solo comodidad visual: la autorización real es del API.
- `middleware/security.ts` concentra helmet, CORS por lista blanca y tres niveles de rate limit (global, auth, escrituras). Un origen no autorizado produce `CorsError` → 403.
- Turso es opcional: sin `TURSO_DATABASE_URL` la auth usa el SQLite local. Las variables están en `packages/api/.env.example`; para migrar el esquema a Turso, `pnpm dlx @better-auth/cli migrate`.

## Convenciones de producto

- **Todo en español**: interfaz, comentarios, mensajes de error del API y nombres de parámetros de query.
- Precios en pesos chilenos enteros, formateados con `lib/format.ts`.
- Dirección visual "póster de concierto": negro y `volt`, bordes duros, bloques planos; sin sombras ni degradados.
- Los datos que aún no existen se marcan como `[PLACEHOLDER]` visible (dirección de la tienda, tarifa de despacho…) en vez de inventarse.
- Las animaciones (view transitions, vuelo al carrito, carrusel) respetan `prefers-reduced-motion`, y los `view-transition-name` deben ser únicos en pantalla o la transición se cancela.
