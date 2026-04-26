import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import Database from "better-sqlite3";
import postgres from "postgres";
import path from "node:path";
import fs from "node:fs";

import * as sqliteSchema from "./schema-sqlite";
import * as postgresSchema from "./schema-postgres";

export type Dialect = "sqlite" | "postgres";

function detectDialect(url: string): Dialect {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgres";
  }
  if (url.startsWith("file:") || url.endsWith(".db") || url.endsWith(".sqlite")) {
    return "sqlite";
  }
  throw new Error(
    `Impossible de détecter le dialecte depuis DATABASE_URL: ${url}`
  );
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? "file:./data/eat.db";

export const dialect: Dialect = detectDialect(DATABASE_URL);

type SqliteDb = ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>;
type PostgresDb = ReturnType<typeof drizzlePostgres<typeof postgresSchema>>;

declare global {
  var __eat_db: SqliteDb | PostgresDb | undefined;
}

function createDb(): SqliteDb | PostgresDb {
  if (dialect === "sqlite") {
    const filePath = DATABASE_URL.replace(/^file:/, "");
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    const sqlite = new Database(absPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    return drizzleSqlite(sqlite, { schema: sqliteSchema });
  }
  const client = postgres(DATABASE_URL, { max: 10 });
  return drizzlePostgres(client, { schema: postgresSchema });
}

export const db: SqliteDb | PostgresDb =
  globalThis.__eat_db ?? (globalThis.__eat_db = createDb());

export const schema = dialect === "sqlite" ? sqliteSchema : postgresSchema;
export { sqliteSchema, postgresSchema };
