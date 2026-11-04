import { countdownFor, type Countdown } from "~/features/events/countdown";
import type { LedgerEvent } from "~/features/events/services/season.server";

// Rows shown per side of the homepage tour before it defers to a full page.
export const TOUR_CAP = 5;

export type TourEvent = LedgerEvent & {
  // Only set on a scheduled stop that is today or within the coming week; the
  // open (up-next) stop never has one — it reads "Come find us".
  countdown: Countdown | null;
};

export type Tour = {
  // Open stop first, then scheduled soonest-first; capped at TOUR_CAP.
  upcoming: TourEvent[];
  upcomingMore: number;
  // Most recent first; capped at TOUR_CAP.
  past: TourEvent[];
  // Totals across every past stop, not just the capped rows. Sealed stops
  // only: the open stop's still-running count belongs to "Upcoming".
  pastTotal: number;
  pastTakes: number;
  // "transcribing" if any past stop has closed but isn't archived yet, so
  // pastTakes may still be catching up with what's on paper (see I2).
  pastLiveState: "transcribing" | null;
};

// Splits a season's ledger into the homepage's "where we're headed" and
// "where we've been" lists. Pure so the cap and ordering are testable with a
// fixed `now`.
export function buildTour(ledger: LedgerEvent[], now: Date = new Date()): Tour {
  const withCountdown = (event: LedgerEvent): TourEvent => ({
    ...event,
    countdown: event.status === "scheduled" ? countdownFor(event.startsAt, now) : null,
  });
  const byStart = (a: LedgerEvent, b: LedgerEvent) => a.startsAt.getTime() - b.startsAt.getTime();

  const upcomingAll = ledger
    .filter((event) => event.status !== "sealed")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "up-next" ? -1 : 1;
      return byStart(a, b);
    });
  const pastAll = ledger.filter((event) => event.status === "sealed").sort((a, b) => byStart(b, a));

  return {
    upcoming: upcomingAll.slice(0, TOUR_CAP).map(withCountdown),
    upcomingMore: Math.max(0, upcomingAll.length - TOUR_CAP),
    past: pastAll.slice(0, TOUR_CAP).map(withCountdown),
    pastTotal: pastAll.length,
    pastTakes: pastAll.reduce((sum, event) => sum + event.takeCount, 0),
    pastLiveState: pastAll.some((event) => event.liveState === "transcribing")
      ? "transcribing"
      : null,
  };
}
