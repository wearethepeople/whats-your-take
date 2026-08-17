// Season/homepage aggregates: the current season (the active, non-retired
// prompt), season-wide stats, and the public ledger of that season's
// events. Read-only aggregates only — no response bodies, no per-response
// timestamps, nothing finer than a season/event total (I4/I6). Under the
// sealed-until-reveal model (see INVARIANTS.md I3), a per-event take count
// is fine to expose — it's a count, not the corpus — but no per-event page
// built on this data may render response bodies before the season premiere.

import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { events, prompts, responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { galleryPublishedAt, listEventPhotos } from "~/photos/photos.server";
import { EVENT_PHOTOS_PREFIX } from "~/photos/storage.server";
import type { RevealDate } from "../reveal-date";

// Re-exported so existing callers (routes, lifecycle.server.ts) don't need
// a second import — the type itself lives in reveal-date.ts (not a .server
// module) since route components format reveal dates too, not just loaders.
export type { RevealDate };

function revealDateFrom(date: Date | null, precision: "day" | "month" | null): RevealDate | null {
  return date ? { date, precision: precision ?? "day" } : null;
}

// Event statuses that are real to the public — draft events don't exist
// for anyone outside the host console.
const PUBLIC_STATUSES = ["scheduled", "open", "closed", "archived"] as const;

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
export function seasonLabels(db: Db): Map<number, string> {
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
  revealDate: RevealDate | null;
};

// The active (non-retired) prompt IS the current season (a prompt is a
// season that runs until retired — see docs/spec.md Part I). At most one
// prompt may be non-retired at a time (prompts_single_active_season).
// Falls back to an ordinal label when the host hasn't set one.
export function currentSeason(db: Db): Season | undefined {
  const active = db
    .select({
      id: prompts.id,
      text: prompts.text,
      revealDate: prompts.revealDate,
      revealPrecision: prompts.revealPrecision,
    })
    .from(prompts)
    .where(isNull(prompts.retiredAt))
    .get();
  if (!active) return undefined;

  const label = seasonLabels(db).get(active.id) ?? "";
  return {
    promptId: active.id,
    promptText: active.text,
    label,
    revealDate: revealDateFrom(active.revealDate, active.revealPrecision),
  };
}

// The most recently retired prompt, or undefined if none has ever been
// retired. Distinct from currentSeason(): this is "the season that just
// closed," used to fill the gap between a season ending and the next one
// starting (see docs/spec.md's "In-between-seasons state").
export function mostRecentlyClosedSeason(db: Db): Season | undefined {
  const closed = db
    .select({
      id: prompts.id,
      text: prompts.text,
      revealDate: prompts.revealDate,
      revealPrecision: prompts.revealPrecision,
    })
    .from(prompts)
    .where(isNotNull(prompts.retiredAt))
    .orderBy(desc(prompts.retiredAt))
    .get();
  if (!closed) return undefined;

  const label = seasonLabels(db).get(closed.id) ?? "";
  return {
    promptId: closed.id,
    promptText: closed.text,
    label,
    revealDate: revealDateFrom(closed.revealDate, closed.revealPrecision),
  };
}

// currentSeason() if a season is live, else the most recently closed one —
// "the season whose reveal date is currently relevant." Used by pages that
// need a single reveal date to reference (the archive page) rather than a
// full SeasonView.
export function currentOrClosedSeason(db: Db): Season | undefined {
  return currentSeason(db) ?? mostRecentlyClosedSeason(db);
}

export type LedgerStatus = "scheduled" | "up-next" | "sealed";

// The public status a raw event.status maps to: open → currently at the
// table; scheduled → announced, not there yet; anything else (closed,
// archived) → sealed, done for now.
function publicStatus(status: string): LedgerStatus {
  if (status === "open") return "up-next";
  if (status === "scheduled") return "scheduled";
  return "sealed";
}

// A note on a stat/listing that a raw event.status alone doesn't convey:
// "open" — the table is live right now; "transcribing" — it closed but
// hasn't been archived yet, so a visible total may still be catching up
// with what's on paper (see I2). null once archived, or for
// scheduled/draft events that haven't happened yet.
//
// This picks a single state per season/archive by priority (open over
// transcribing) on the assumption that at most one is ever true at a
// time — today there are never concurrent tables. If that ever changes,
// a single note can no longer speak for a whole stat panel and this
// needs revisiting (per-event notes already don't have this problem —
// see LedgerEvent.liveState).
export type LiveState = "open" | "transcribing" | null;

function liveStateFor(status: string): LiveState {
  if (status === "open") return "open";
  if (status === "closed") return "transcribing";
  return null;
}

function aggregateLiveState(statuses: string[]): LiveState {
  if (statuses.includes("open")) return "open";
  if (statuses.includes("closed")) return "transcribing";
  return null;
}

export type LedgerEvent = {
  id: number;
  publicSlug: string;
  name: string;
  city: string;
  dateLabel: string;
  takeCount: number;
  status: LedgerStatus;
  liveState: LiveState;
};

export type SeasonStats = {
  stopCount: number;
  totalTakes: number;
  townCount: number;
  // See LiveState — totalTakes is accurate as far as it goes, but a
  // homepage visitor reading "0" while the table is open or just closed
  // would read the guestbook as unused rather than live/mid-ingestion,
  // so callers surface this to say otherwise.
  liveState: LiveState;
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

// Shared by seasonView() and closedSeasonView(): a season's aggregates +
// public ledger, given the season already resolved (currentSeason() or
// mostRecentlyClosedSeason()).
function seasonViewFor(db: Db, season: Season): SeasonView {
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
    status: publicStatus(event.status),
    liveState: liveStateFor(event.status),
  }));

  const stats: SeasonStats = {
    stopCount: seasonEvents.length,
    totalTakes: [...takeCounts.values()].reduce((sum, n) => sum + n, 0),
    townCount: new Set(seasonEvents.map((event) => event.city)).size,
    liveState: aggregateLiveState(seasonEvents.map((event) => event.status)),
  };

  return { season, stats, ledger };
}

// The current season's aggregates + public ledger, or undefined if no
// season is active yet (nothing to show).
export function seasonView(db: Db): SeasonView | undefined {
  const season = currentSeason(db);
  return season ? seasonViewFor(db, season) : undefined;
}

// The most recently closed season's final aggregates + ledger (all-sealed
// — a closed season has no "up next" stop), or undefined if no season has
// ever closed. Fills the homepage's in-between-seasons gap: a season that
// closed before the next one started is not "on its way," it already ran.
export function closedSeasonView(db: Db): SeasonView | undefined {
  const season = mostRecentlyClosedSeason(db);
  return season ? seasonViewFor(db, season) : undefined;
}

export type ArchiveEvent = LedgerEvent & {
  stopNumber: number;
  seasonLabel: string;
  // The prompt this event's season is scoped to — lets a caller (the
  // archive page) group events by season without a second query, and
  // without one flat list needing a header when there's only ever been
  // one season.
  promptId: number;
  // Kept (not just the formatted dateLabel) so callers can sort/range
  // without re-querying — see archiveView()'s dateRangeLabel and
  // upcomingLedger().
  startsAt: Date;
};

export type ArchiveView = {
  events: ArchiveEvent[];
  totalTakes: number;
  // "May 2026 — July 2026", derived from the real first/last event dates —
  // not a design placeholder like the handoff mock's hardcoded range.
  dateRangeLabel: string | null;
  // See LiveState / SeasonStats.liveState.
  liveState: LiveState;
};

// Every public event across every season — not just the current one —
// newest-first, with stopNumber/seasonLabel attached. Shared by
// archiveView() ("where the table has been") and upcomingLedger() ("what's
// coming up"): both read the same history, just sliced/ordered differently.
function publicEventRows(db: Db): ArchiveEvent[] {
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

  return allEvents.map((event, index) => ({
    id: event.id,
    publicSlug: event.publicSlug,
    name: event.name,
    city: event.city,
    dateLabel: formatDateLabel(event.startsAt),
    takeCount: takeCounts.get(event.id) ?? 0,
    status: publicStatus(event.status),
    liveState: liveStateFor(event.status),
    stopNumber: total - index,
    seasonLabel: labels.get(event.promptId) ?? "",
    promptId: event.promptId,
    startsAt: event.startsAt,
  }));
}

// "What's coming up" — the up-next (open) and scheduled stops, soonest
// first. Ascending stopNumber tracks ascending date (see
// publicEventRows()), so no extra sort key is needed.
export function upcomingLedger(db: Db): ArchiveEvent[] {
  return publicEventRows(db)
    .filter((event) => event.status === "up-next" || event.status === "scheduled")
    .sort((a, b) => a.stopNumber - b.stopNumber);
}

// The full public event history, across every season — not just the
// current one. Unlike seasonView(), this never scopes to a single prompt:
// "where the table has been" stays visible after a season closes and a new
// one starts, which is the point of an archive page.
export function archiveView(db: Db): ArchiveView {
  const archiveEvents = publicEventRows(db);

  let dateRangeLabel: string | null = null;
  if (archiveEvents.length > 0) {
    const monthYear = (date: Date) =>
      new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
    // publicEventRows() is newest-first.
    const earliest = monthYear(archiveEvents[archiveEvents.length - 1].startsAt);
    const latest = monthYear(archiveEvents[0].startsAt);
    dateRangeLabel = earliest === latest ? earliest : `${earliest} — ${latest}`;
  }

  const openEvent = archiveEvents.some((event) => event.liveState === "open");
  const transcribingEvent = archiveEvents.some((event) => event.liveState === "transcribing");

  return {
    events: archiveEvents,
    totalTakes: archiveEvents.reduce((sum, event) => sum + event.takeCount, 0),
    dateRangeLabel,
    liveState: openEvent ? "open" : transcribingEvent ? "transcribing" : null,
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
  // Nullable: a scheduled event may not have logistics locked down yet
  // (see the schema comment on events.venue).
  venue: string | null;
  address: string | null;
  city: string;
  zip: string | null;
  narrative: string | null;
  dayLabel: string;
  timeLabel: string;
  // Kept alongside the formatted labels above so callers (e.g. the
  // "add to calendar" .ics builder on /find-the-table) don't need to
  // re-parse dayLabel/timeLabel back into real dates.
  startsAt: Date;
  endsAt: Date;
  status: LedgerStatus;
  liveState: LiveState;
  stopNumber: number;
  seasonLabel: string;
  revealDate: RevealDate | null;
  takeCount: number;
  // "screens" combines site + kiosk — the public distinction that matters
  // is handwritten-in-person vs. typed, not the device.
  channelBreakdown: { card: number; screens: number };
  // Venue/atmosphere photos — see EventPhoto in docs/spec.md. Always []
  // unless the event is sealed and the host has published the gallery
  // (see buildEventDetail below); never gated to the season reveal like
  // ShowcaseCard would be, since these aren't response content.
  photos: { id: number; url: string; thumbnailUrl: string; caption: string | null }[];
};

type PublicEventRow = typeof events.$inferSelect;

// A single prompt's reveal date, for buildEventDetail() — an event page
// needs only its own season's date, not every prompt's (unlike
// seasonLabels(), which the archive's full-history views need in bulk).
function promptRevealDate(db: Db, promptId: number): RevealDate | null {
  const row = db
    .select({ revealDate: prompts.revealDate, revealPrecision: prompts.revealPrecision })
    .from(prompts)
    .where(eq(prompts.id, promptId))
    .get();
  return row ? revealDateFrom(row.revealDate, row.revealPrecision) : null;
}

// Shared by eventDetail() and nextStop() — both resolve one event row to
// the full public detail shape, just via a different lookup.
function buildEventDetail(db: Db, event: PublicEventRow): EventDetail {
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

  const status = publicStatus(event.status);
  // Skip the query entirely unless a sealed+published gallery could
  // actually have anything to show — no reason to fetch and discard.
  const sealedAndPublished = status === "sealed" && galleryPublishedAt(db, event.id) != null;
  const photos = sealedAndPublished
    ? listEventPhotos(db, event.id).map((photo) => ({
        id: photo.id,
        url: "/photos/" + photo.storageKey.slice(EVENT_PHOTOS_PREFIX.length),
        thumbnailUrl: "/photos/" + photo.thumbnailKey.slice(EVENT_PHOTOS_PREFIX.length),
        caption: photo.caption,
      }))
    : [];

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
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status,
    liveState: liveStateFor(event.status),
    stopNumber,
    seasonLabel: seasonLabels(db).get(event.promptId) ?? "",
    revealDate: promptRevealDate(db, event.promptId),
    takeCount: channelBreakdown.card + channelBreakdown.screens,
    channelBreakdown,
    photos,
  };
}

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
  return buildEventDetail(db, event);
}

// The single featured stop for the Find the Table page: the earliest
// currently-open event if one exists, else the soonest scheduled one, else
// undefined (nothing confirmed right now).
export function nextStop(db: Db): EventDetail | undefined {
  const open = db
    .select()
    .from(events)
    .where(eq(events.status, "open"))
    .orderBy(asc(events.startsAt))
    .get();
  const event =
    open ??
    db
      .select()
      .from(events)
      .where(eq(events.status, "scheduled"))
      .orderBy(asc(events.startsAt))
      .get();
  if (!event) return undefined;
  return buildEventDetail(db, event);
}
