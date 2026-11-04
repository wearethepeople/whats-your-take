import { DEFAULT_TIME_ZONE } from "~/lib/timezone";

const DAY_MS = 24 * 60 * 60 * 1000;

// How far ahead a scheduled stop gets a countdown instead of "Scheduled".
export const COUNTDOWN_WINDOW_DAYS = 7;

export type Countdown = { kind: "today" } | { kind: "days"; days: number };

// UTC midnight of the calendar day `date` falls on in `timeZone`.
function localDayStart(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

// Calendar-day countdown to a scheduled stop: "today" on the day itself,
// else whole days remaining, up to COUNTDOWN_WINDOW_DAYS. null when the stop
// is further out, or its day has already passed.
//
// event.startsAt holds the host's entered wall-clock time with no real
// timezone attached (see find-the-table.tsx's icsLocalTimestamp), so its
// calendar day is read with getUTC*(); `now` is a real instant, so its day is
// read in the event timezone. Comparing days, not instants, keeps "Today"
// true all evening in Central time even after UTC has rolled over.
export function countdownFor(
  startsAt: Date,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): Countdown | null {
  const startDay = Date.UTC(
    startsAt.getUTCFullYear(),
    startsAt.getUTCMonth(),
    startsAt.getUTCDate(),
  );
  const days = Math.round((startDay - localDayStart(now, timeZone)) / DAY_MS);
  if (days < 0 || days > COUNTDOWN_WINDOW_DAYS) return null;
  return days === 0 ? { kind: "today" } : { kind: "days", days };
}

export function countdownLabel(countdown: Countdown): string {
  if (countdown.kind === "today") return "Today";
  return `In ${countdown.days} ${countdown.days === 1 ? "day" : "days"}`;
}
