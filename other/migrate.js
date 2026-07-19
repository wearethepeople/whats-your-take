// Applies committed migrations from ./drizzle using drizzle-orm's migrator.
// Used by both `npm run db:migrate` and the production entrypoint, so dev
// and prod share one migration code path (drizzle-kit is dev-only and not
// present in the production image).
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const databasePath = process.env.DATABASE_PATH ?? "./data/sqlite.db";
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
sqlite.close();
console.log(`migrations applied to ${databasePath}`);
