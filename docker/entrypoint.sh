#!/bin/sh
set -e

# Applique les migrations selon le dialecte détecté via DATABASE_URL
echo "[entrypoint] Applying migrations to ${DATABASE_URL%%@*}…"
node -e "
const url = process.env.DATABASE_URL || 'file:/data/eat.db';
const isPg = url.startsWith('postgres://') || url.startsWith('postgresql://');
const folder = isPg ? './drizzle/postgres' : './drizzle/sqlite';

(async () => {
  if (isPg) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const client = postgres(url, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: folder });
    await client.end();
  } else {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const Database = (await import('better-sqlite3')).default;
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    const file = url.replace(/^file:/, '');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const sqlite = new Database(file);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: folder });
  }
  console.log('[entrypoint] Migrations OK');
})().catch((err) => {
  console.error('[entrypoint] Migration failed:', err);
  process.exit(1);
});
"

exec "$@"
