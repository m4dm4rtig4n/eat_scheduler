import { defineConfig } from "drizzle-kit";
import * as fs from "node:fs";

const url = process.env.DATABASE_URL ?? "file:./data/eat.db";
const isPostgres =
  url.startsWith("postgres://") || url.startsWith("postgresql://");

if (process.env.NODE_ENV !== "production") {
  try {
    const env = fs.readFileSync(".env.local", "utf-8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
  } catch {}
}

export default defineConfig(
  isPostgres
    ? {
        dialect: "postgresql",
        schema: "./src/lib/db/schema-postgres.ts",
        out: "./drizzle/postgres",
        dbCredentials: { url },
      }
    : {
        dialect: "sqlite",
        schema: "./src/lib/db/schema-sqlite.ts",
        out: "./drizzle/sqlite",
        dbCredentials: { url: url.replace(/^file:/, "") },
      }
);
