import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { db, dialect } from "./index";

async function main() {
  if (dialect === "sqlite") {
    migrateSqlite(db as never, { migrationsFolder: "./drizzle/sqlite" });
  } else {
    await migratePostgres(db as never, {
      migrationsFolder: "./drizzle/postgres",
    });
  }
  console.log(`Migrations appliquées (${dialect})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
