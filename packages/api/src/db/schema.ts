import { AUTH_SCHEMA_SQL } from "./auth-schema.js"
import { client } from "./connection.js"

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

    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `

export async function migrate(): Promise<void> {
  await client.executeMultiple(AUTH_SCHEMA_SQL)
  await client.executeMultiple(CATALOG_SCHEMA_SQL)
}
