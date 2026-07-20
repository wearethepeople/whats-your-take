import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// Ephemeral pre-corpus holding pen: a participant STAGES a draft, the host
// PROMOTES it into responses by claim code. Not a response — rows are swept
// after expiry (append-only I5 applies to responses only). body is nulled at
// promotion; code + promoted_at persist only until sweep to serve the
// participant's status poll. Deliberately no created_at column, and nothing
// here ever references a response row (I2). Residual inference: an hour with
// exactly one response narrows it to its promotion moment for anyone holding
// the pre-sweep staging table — the trade-off the 2026-07-19 hour-truncation
// amendment accepted.
export const stagedDrafts = sqliteTable(
  "staged_drafts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    // Nullable by design: nulled at promotion. Inserts enforce non-null in code.
    body: text("body"),
    code: text("code").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    promotedAt: integer("promoted_at", { mode: "timestamp" }),
  },
  (table) => [
    // Globally unique among live rows so the host types a code without
    // picking an event; sweep frees codes for reuse.
    uniqueIndex("staged_drafts_code_unique").on(table.code),
  ],
);

// I2 — counts only, never referenced by any response or draft. Per-60s-clock-
// window staging counts: telemetry for anomaly eyeballing (reviewed at hour
// granularity) plus the circuit breaker. No auth function.
export const presenceWindows = sqliteTable(
  "presence_windows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
    windowEnd: integer("window_end", { mode: "timestamp" }).notNull(),
    submissionCount: integer("submission_count").notNull().default(0),
  },
  (table) => [
    // Required by the upsert-increment in stage.server.ts.
    uniqueIndex("presence_windows_event_window").on(table.eventId, table.windowStart),
  ],
);
