import type { LedgerEvent } from "~/features/events/services/season.server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The stop the homepage's "Next stop" strip announces: the open (up-next)
// event if there is one, else the soonest scheduled event starting within
// the coming week. Pure so the window is testable with a fixed `now`.
export function bannerStop(ledger: LedgerEvent[], now: Date = new Date()): LedgerEvent | undefined {
  const open = ledger.find((event) => event.status === "up-next");
  if (open) return open;

  const t = now.getTime();
  return ledger
    .filter((event) => {
      const start = event.startsAt.getTime();
      return event.status === "scheduled" && start >= t && start <= t + WEEK_MS;
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
}
