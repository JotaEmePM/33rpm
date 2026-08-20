import { AUTH_SCHEMA_SQL } from "./auth-schema.js"
import { all, client } from "./connection.js"

/** DDL del catálogo. Única fuente de verdad: la usan el arranque local y la migración a Turso. */
export const CATALOG_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      genre TEXT NOT NULL,
      label TEXT NOT NULL,
      format TEXT NOT NULL,
      condition TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      is_new INTEGER NOT NULL DEFAULT 0,
      is_preorder INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      position TEXT NOT NULL,
      title TEXT NOT NULL,
      duration TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_id);

    CREATE TABLE IF NOT EXISTS release_images (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      pathname TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_release_images_release ON release_images(release_id);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      phone TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      address TEXT,
      city TEXT,
      region TEXT,
      subtotal INTEGER NOT NULL,
      shipping_cost INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      payment_status TEXT,
      payment_id TEXT,
      preference_id TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      release_id TEXT NOT NULL,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

    CREATE TABLE IF NOT EXISTS wishlist (
      user_id TEXT NOT NULL,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, release_id)
    );

    CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `

/** `CREATE TABLE IF NOT EXISTS` no toca las tablas ya creadas: las columnas nuevas se añaden aparte. */
async function ensureColumn(table: string, column: string, definition: string): Promise<void> {
  const columns = await all<{ name: string }>(`PRAGMA table_info(${table})`)
  if (columns.some((existing) => existing.name === column)) return
  await client.execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
}

export async function migrate(): Promise<void> {
  await client.executeMultiple(AUTH_SCHEMA_SQL)
  await client.executeMultiple(CATALOG_SCHEMA_SQL)
  await ensureColumn("releases", "visible", "visible INTEGER NOT NULL DEFAULT 1")
  await ensureColumn("releases", "is_preorder", "is_preorder INTEGER NOT NULL DEFAULT 0")
  await ensureColumn("releases", "is_featured", "is_featured INTEGER NOT NULL DEFAULT 0")
  await ensureColumn("orders", "payment_status", "payment_status TEXT")
  await ensureColumn("orders", "payment_id", "payment_id TEXT")
  await ensureColumn("orders", "preference_id", "preference_id TEXT")
  await ensureColumn("orders", "paid_at", "paid_at TEXT")
}
