// Season/homepage aggregates: the current season (the active, non-retired
// prompt), season-wide stats, and the public ledger of that season's
// events. Read-only aggregates only — no response bodies, no per-response
// timestamps, nothing finer than a season/event total (I4/I6). Under the
// sealed-until-reveal model (see INVARIANTS.md I3), a per-event take count
// is fine to expose — it's a count, not the corpus — but no per-event page
// built on this data may render response bodies before the season premiere.

import { and, count, desc, eq, inArray, isNull, lte } from "drizzle-orm";
import { events, prompts, responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";

// Not locked to any specific date — the announced premiere date is a
// season-level decision, not fixed in code. Update when the date is
// set/changes.
export const REVEAL_DATE = new Date("2027-07-04T00:00:00");

// Event statuses that are real to the public — draft events don't exist
// for anyone outside the host console.
const PUBLIC_STATUSES = ["open", "closed", "archived"] as const;

const ORDINAL_WORDS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function ordinalSeasonLabel(ordinal: number): string {
  const word = ORDINAL_WORDS[ordinal - 1] ?? String(ordinal);
  return `Season ${word}`;
}

export type Season = {
  promptId: number;
  promptText: string;
  label: string;
};

// The active (non-retired) prompt IS the current season (a prompt is a
// season that runs until retired — see docs/spec.md Part I). If more than
// one prompt is somehow non-retired at once, the most recently created one
// is "current." Falls back to an ordinal label ("Season One", "Season
// Two", ...) derived from creation order (by id, which tracks
// autoincrement/creation order) when the host hasn't set one.
export function currentSeason(db: Db): Season | undefined {
  const active = db
    .select({ id: prompts.id, text: prompts.text, seasonLabel: prompts.seasonLabel })
    .from(prompts)
    .where(isNull(prompts.retiredAt))
    .orderBy(desc(prompts.createdAt), desc(prompts.id))
    .get();
  if (!active) return undefined;

  const label =
    active.seasonLabel ??
    ordinalSeasonLabel(
      db.select({ n: count() }).from(prompts).where(lte(prompts.id, active.id)).get()?.n ?? 1,
    );

  return { promptId: active.id, promptText: active.text, label };
}

export type LedgerStatus = "up-next" | "sealed";

export type LedgerEvent = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dateLabel: string;
  takeCount: number;
  status: LedgerStatus;
};

export type SeasonStats = {
  stopCount: number;
  totalTakes: number;
  townCount: number;
};

export type SeasonView = {
  season: Season;
  stats: SeasonStats;
  ledger: LedgerEvent[];
};

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(date);
}

function eventTakeCounts(db: Db, eventIds: number[]): Map<number, number> {
  if (eventIds.length === 0) return new Map();
  const rows = db
    .select({ eventId: responses.eventId, n: count() })
    .from(responses)
    .where(inArray(responses.eventId, eventIds))
    .groupBy(responses.eventId)
    .all();
  return new Map(rows.map((row) => [row.eventId, row.n]));
}

// The current season's aggregates + public ledger, or undefined if no
// season is active yet (nothing to show).
export function seasonView(db: Db): SeasonView | undefined {
  const season = currentSeason(db);
  if (!season) return undefined;

  const seasonEvents = db
    .select({
      id: events.id,
      slug: events.slug,
      name: events.name,
      city: events.city,
      startsAt: events.startsAt,
      status: events.status,
    })
    .from(events)
    .where(and(eq(events.promptId, season.promptId), inArray(events.status, PUBLIC_STATUSES)))
    .orderBy(desc(events.startsAt))
    .all();

  const takeCounts = eventTakeCounts(
    db,
    seasonEvents.map((event) => event.id),
  );

  const ledger: LedgerEvent[] = seasonEvents.map((event) => ({
    id: event.id,
    slug: event.slug,
    name: event.name,
    city: event.city,
    dateLabel: formatDateLabel(event.startsAt),
    takeCount: takeCounts.get(event.id) ?? 0,
    status: event.status === "open" ? "up-next" : "sealed",
  }));

  const stats: SeasonStats = {
    stopCount: seasonEvents.length,
    totalTakes: [...takeCounts.values()].reduce((sum, n) => sum + n, 0),
    townCount: new Set(seasonEvents.map((event) => event.city)).size,
  };

  return { season, stats, ledger };
}
