import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.server";

const databasePath = process.env.DATABASE_PATH ?? "./data/sqlite.db";
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
