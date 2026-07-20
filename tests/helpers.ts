import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "~/db/schema.server";

export function freshDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "wyt-test-"));
  const sqlite = new Database(path.join(dir, "test.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db, sqlite };
}

type Db = ReturnType<typeof freshDb>["db"];

export function seedOpenEvent(db: Db, overrides: { status?: "draft" | "open" | "closed" } = {}) {
  const prompt = db
    .insert(schema.prompts)
    .values({ text: "What would you remind an American in 2075?" })
    .returning()
    .get();
  const event = db
    .insert(schema.events)
    .values({
      slug: "event-one",
      promptId: prompt.id,
      name: "Event One",
      venue: "The Park",
      zip: "75201",
      city: "Dallas",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      endsAt: new Date("2026-09-01T23:00:00Z"),
      status: overrides.status ?? "open",
    })
    .returning()
    .get();
  return { prompt, event };
}
