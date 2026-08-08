// Season/homepage aggregates: the current season (the active, non-retired
// prompt), season-wide stats, and the public ledger of that season's
// events. Read-only aggregates only — no response bodies, no per-response
// timestamps, nothing finer than a season/event total (I4/I6). Under the
// sealed-until-reveal model (see INVARIANTS.md I3), a per-event take count
// is fine to expose — it's a count, not the corpus — but no per-event page
// built on this data may render response bodies before the season premiere.

import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
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

// Every prompt's resolved label, keyed by id: the host-set seasonLabel, or
// an ordinal ("Season One", "Season Two", ...) derived from creation order
// (id order tracks autoincrement/creation order) when unset. One query
// covers every prompt at once so callers needing more than one label (the
// full-history ledger) don't do it per-row.
function seasonLabels(db: Db): Map<number, string> {
  const all = db
    .select({ id: prompts.id, seasonLabel: prompts.seasonLabel })
    .from(prompts)
    .orderBy(asc(prompts.id))
    .all();
  return new Map(
    all.map((prompt, index) => [prompt.id, prompt.seasonLabel ?? ordinalSeasonLabel(index + 1)]),
  );
}

export type Season = {
  promptId: number;
  promptText: string;
  label: string;
};

// The active (non-retired) prompt IS the current season (a prompt is a
// season that runs until retired — see docs/spec.md Part I). At most one
// prompt may be non-retired at a time (prompts_single_active_season).
// Falls back to an ordinal label when the host hasn't set one.
export function currentSeason(db: Db): Season | undefined {
  const active = db
    .select({ id: prompts.id, text: prompts.text })
    .from(prompts)
    .where(isNull(prompts.retiredAt))
    .get();
  if (!active) return undefined;

  const label = seasonLabels(db).get(active.id) ?? "";
  return { promptId: active.id, promptText: active.text, label };
}

export type LedgerStatus = "up-next" | "sealed";

export type LedgerEvent = {
  id: number;
  publicSlug: string;
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
      publicSlug: events.publicSlug,
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
    publicSlug: event.publicSlug,
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

export type ArchiveEvent = LedgerEvent & { stopNumber: number; seasonLabel: string };

export type ArchiveView = {
  events: ArchiveEvent[];
  totalTakes: number;
  // "May 2026 — July 2026", derived from the real first/last event dates —
  // not a design placeholder like the handoff mock's hardcoded range.
  dateRangeLabel: string | null;
};

// The full public event history, across every season — not just the
// current one. Unlike seasonView(), this never scopes to a single prompt:
// "where the table has been" stays visible after a season closes and a new
// one starts, which is the point of an archive page.
export function archiveView(db: Db): ArchiveView {
  const allEvents = db
    .select({
      id: events.id,
      publicSlug: events.publicSlug,
      name: events.name,
      city: events.city,
      startsAt: events.startsAt,
      status: events.status,
      promptId: events.promptId,
    })
    .from(events)
    .where(inArray(events.status, PUBLIC_STATUSES))
    .orderBy(desc(events.startsAt))
    .all();

  const takeCounts = eventTakeCounts(
    db,
    allEvents.map((event) => event.id),
  );
  const labels = seasonLabels(db);
  const total = allEvents.length;

  const archiveEvents: ArchiveEvent[] = allEvents.map((event, index) => ({
    id: event.id,
    publicSlug: event.publicSlug,
    name: event.name,
    city: event.city,
    dateLabel: formatDateLabel(event.startsAt),
    takeCount: takeCounts.get(event.id) ?? 0,
    status: event.status === "open" ? "up-next" : "sealed",
    stopNumber: total - index,
    seasonLabel: labels.get(event.promptId) ?? "",
  }));

  let dateRangeLabel: string | null = null;
  if (allEvents.length > 0) {
    const monthYear = (date: Date) =>
      new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
    // allEvents is newest-first.
    const earliest = monthYear(allEvents[allEvents.length - 1].startsAt);
    const latest = monthYear(allEvents[0].startsAt);
    dateRangeLabel = earliest === latest ? earliest : `${earliest} — ${latest}`;
  }

  return {
    events: archiveEvents,
    totalTakes: [...takeCounts.values()].reduce((sum, n) => sum + n, 0),
    dateRangeLabel,
  };
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimeLabel(starts: Date, ends: Date): string {
  const time = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric" })
      .format(date)
      .replace(":00 ", " ");
  return `${time(starts)} – ${time(ends)}`;
}

export type EventDetail = {
  id: number;
  publicSlug: string;
  name: string;
  venue: string;
  address: string | null;
  city: string;
  zip: string;
  narrative: string | null;
  dayLabel: string;
  timeLabel: string;
  status: LedgerStatus;
  stopNumber: number;
  seasonLabel: string;
  takeCount: number;
  // "screens" combines site + kiosk — the public distinction that matters
  // is handwritten-in-person vs. typed, not the device.
  channelBreakdown: { card: number; screens: number };
};

// A single event's public detail page data, or undefined if the publicSlug
// doesn't resolve to a real (non-draft) event. Deliberately looked up by
// publicSlug, not the submission slug — see the schema comment on
// events.slug for why the two must never be conflated.
export function eventDetail(db: Db, publicSlug: string): EventDetail | undefined {
  const event = db
    .select()
    .from(events)
    .where(and(eq(events.publicSlug, publicSlug), inArray(events.status, PUBLIC_STATUSES)))
    .get();
  if (!event) return undefined;

  // Stop number: this event's 1-based position among all public events in
  // chronological order — computed the same way as archiveView() so the
  // numbers agree between the two pages.
  const allPublicEvents = db
    .select({ id: events.id, startsAt: events.startsAt })
    .from(events)
    .where(inArray(events.status, PUBLIC_STATUSES))
    .orderBy(asc(events.startsAt), asc(events.id))
    .all();
  const stopNumber = allPublicEvents.findIndex((row) => row.id === event.id) + 1;

  const channelRows = db
    .select({ channel: responses.channel, n: count() })
    .from(responses)
    .where(eq(responses.eventId, event.id))
    .groupBy(responses.channel)
    .all();
  const channelBreakdown = { card: 0, screens: 0 };
  for (const row of channelRows) {
    if (row.channel === "card") channelBreakdown.card += row.n;
    else channelBreakdown.screens += row.n;
  }

  return {
    id: event.id,
    publicSlug: event.publicSlug,
    name: event.name,
    venue: event.venue,
    address: event.address,
    city: event.city,
    zip: event.zip,
    narrative: event.narrative,
    dayLabel: formatDayLabel(event.startsAt),
    timeLabel: formatTimeLabel(event.startsAt, event.endsAt),
    status: event.status === "open" ? "up-next" : "sealed",
    stopNumber,
    seasonLabel: seasonLabels(db).get(event.promptId) ?? "",
    takeCount: channelBreakdown.card + channelBreakdown.screens,
    channelBreakdown,
  };
}
