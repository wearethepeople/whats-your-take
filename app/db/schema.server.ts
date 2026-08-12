import { isNull, sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Schema source of truth is docs/spec.md Part II; changes land there first.

// A prompt IS a season: one question reused across events/geographies until
// retired.
export const prompts = sqliteTable(
  "prompts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    text: text("text").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    retiredAt: integer("retired_at", { mode: "timestamp" }),
    // Host-settable, not host-required: public copy (e.g. the homepage's
    // season stamp) falls back to an ordinal label ("Season One", "Season
    // Two", ...) derived from creation order when this is unset.
    seasonLabel: text("season_label"),
    // When this season's corpus opens to the public. Host-settable,
    // nullable — a season can run with no announced date yet. Cadence
    // between seasons is deliberately undecided (docs/spec.md), so this is
    // per-prompt, not a single site-wide constant.
    revealDate: integer("reveal_date", { mode: "timestamp" }),
    // "day" once the date is locked, "month" while the host only wants to
    // commit to e.g. "July 2027". Only meaningful when revealDate is set;
    // month precision stores the 1st and is never rendered with a day.
    revealPrecision: text("reveal_precision", { enum: ["day", "month"] }),
  },
  (table) => [
    // At most one row may have retired_at IS NULL: "the current season" is
    // an enforced invariant, not a query heuristic (currentSeason() in
    // season.server.ts relies on this uniqueness). Partial unique index —
    // every qualifying row indexes the same constant, so a second one
    // collides.
    uniqueIndex("prompts_single_active_season")
      .on(sql`1`)
      .where(isNull(table.retiredAt)),
  ],
);

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Submission-only — printed on the physical QR, resolved by the /e/:slug
  // flow. Never selected by a public marketing-site query/loader (the repo
  // is public on GitHub and this value is meant to reach people only via
  // the printed QR, not be crawlable from the site). Public pages use
  // publicSlug instead.
  slug: text("slug").notNull().unique(),
  // date+city composite, auto-generated once at creation and immutable
  // after (see generatePublicSlug in lifecycle.server.ts) — the identifier
  // for public URLs (/events/:publicSlug), deliberately unrelated to slug.
  publicSlug: text("public_slug").notNull().unique(),
  promptId: integer("prompt_id")
    .notNull()
    .references(() => prompts.id),
  name: text("name").notNull(),
  // Nullable: a "scheduled" event may be public before logistics are
  // locked down. Required before the event can transition to "open" (see
  // transitionEvent's readiness gate in lifecycle.server.ts).
  venue: text("venue"),
  address: text("address"),
  zip: text("zip"),
  city: text("city").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  // Host-authored, optional — free text for the public event detail page
  // (how the day went). Never response content; the page works fine
  // without it.
  narrative: text("narrative"),
  status: text("status", { enum: ["draft", "scheduled", "open", "closed", "archived"] })
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

// Anonymous "bring the table to your town" pointers — a general area, not
// a specific event (WrTP finds the actual events to attend). No contact
// info collected, matching the anonymity posture used everywhere else on
// the site, even though this persona (someone suggesting a town) isn't
// the "participant" I1 governs. Real timestamps (unlike responses.createdAt):
// I4's hour-truncation exists to stop a participant's on-site presence
// from being correlated with photos/video of who was at the table, which
// doesn't apply to a remote area suggestion, and this data is host-facing
// only, never public.
export const tableRequests = sqliteTable("table_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Raw, as typed — city name or ZIP, no validation beyond non-empty.
  area: text("area").notNull(),
  // Optional context: a specific venue/event offer, timing, whatever's
  // relevant. Where "want the table at your event" (a specific-venue
  // offer) lands when someone has a specific place in mind, vs. just a
  // general area.
  note: text("note"),
  // Resolved synchronously at insert time from a bundled offline dataset
  // (see resolve-area.server.ts) — no live geocoding call. Null forever
  // if the dataset has no match and no host has manually resolved it.
  resolvedCity: text("resolved_city"),
  resolvedState: text("resolved_state"),
  resolvedCounty: text("resolved_county"),
  // "geonames" (resolved from the bundled file) or "manual" (a host typed
  // it in by hand after the automatic lookup came up empty).
  resolvedSource: text("resolved_source", { enum: ["geonames", "manual"] }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
