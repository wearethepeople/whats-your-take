import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Schema source of truth is docs/spec.md Part II; changes land there first.

// A prompt IS a season: one question reused across events/geographies until
// retired.
export const prompts = sqliteTable("prompts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  retiredAt: integer("retired_at", { mode: "timestamp" }),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  promptId: integer("prompt_id")
    .notNull()
    .references(() => prompts.id),
  name: text("name").notNull(),
  venue: text("venue").notNull(),
  address: text("address"),
  zip: text("zip").notNull(),
  city: text("city").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["draft", "open", "closed", "archived"] })
    .notNull()
    .default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const responses = sqliteTable("responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  promptId: integer("prompt_id")
    .notNull()
    .references(() => prompts.id),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  body: text("body").notNull(),
  channel: text("channel", { enum: ["kiosk", "site", "card"] }).notNull(),
  status: text("status", { enum: ["pending", "approved", "hidden"] })
    .notNull()
    .default("pending"),
  showcase: integer("showcase", { mode: "boolean" }).notNull().default(false),
  // I4: hour-truncated at write via truncateToHour — sub-hour submission
  // timing is never stored. No DB default on purpose: every insert must go
  // through the time helpers.
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  // The only time granularity that ever reaches a public surface.
  createdBucket: text("created_bucket").notNull(),
});
