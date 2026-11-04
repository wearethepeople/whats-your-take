import { describe, expect, it } from "vitest";
import type { LedgerEvent } from "~/features/events/services/season.server";
import { buildTour, TOUR_CAP } from "~/features/events/tour";

const NOW = new Date("2026-11-04T15:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

let nextId = 1;
function ev(status: LedgerEvent["status"], daysFromNow: number): LedgerEvent {
  const id = nextId++;
  return {
    id,
    publicSlug: `e${id}`,
    name: `e${id}`,
    city: "Dallas",
    state: "TX",
    dateLabel: "",
    startsAt: new Date(NOW.getTime() + daysFromNow * DAY),
    takeCount: 0,
    status,
    liveState: null,
  };
}

describe("buildTour", () => {
  it("splits upcoming (open + scheduled) from past (sealed)", () => {
    const open = ev("up-next", 0);
    const scheduled = ev("scheduled", 3);
    const sealed = ev("sealed", -3);
    const tour = buildTour([sealed, scheduled, open], NOW);
    expect(tour.upcoming.map((e) => e.id)).toEqual([open.id, scheduled.id]);
    expect(tour.past.map((e) => e.id)).toEqual([sealed.id]);
  });

  it("orders upcoming soonest-first with the open stop leading", () => {
    const later = ev("scheduled", 20);
    const sooner = ev("scheduled", 2);
    const open = ev("up-next", 5);
    expect(buildTour([later, sooner, open], NOW).upcoming.map((e) => e.id)).toEqual([
      open.id,
      sooner.id,
      later.id,
    ]);
  });

  it("orders past most-recent-first", () => {
    const older = ev("sealed", -30);
    const newer = ev("sealed", -2);
    expect(buildTour([older, newer], NOW).past.map((e) => e.id)).toEqual([newer.id, older.id]);
  });

  it("caps each list at TOUR_CAP and reports how many upcoming are hidden", () => {
    const upcoming = Array.from({ length: TOUR_CAP + 3 }, (_, i) => ev("scheduled", i + 1));
    const past = Array.from({ length: TOUR_CAP + 2 }, (_, i) => ev("sealed", -(i + 1)));
    const tour = buildTour([...upcoming, ...past], NOW);
    expect(tour.upcoming).toHaveLength(TOUR_CAP);
    expect(tour.upcomingMore).toBe(3);
    expect(tour.past).toHaveLength(TOUR_CAP);
  });

  it("reports no hidden stops at exactly the cap", () => {
    const upcoming = Array.from({ length: TOUR_CAP }, (_, i) => ev("scheduled", i + 1));
    const tour = buildTour(upcoming, NOW);
    expect(tour.upcoming).toHaveLength(TOUR_CAP);
    expect(tour.upcomingMore).toBe(0);
  });

  it("returns empty lists for an empty ledger", () => {
    expect(buildTour([], NOW)).toEqual({
      upcoming: [],
      upcomingMore: 0,
      past: [],
      pastTotal: 0,
      pastTakes: 0,
      pastLiveState: null,
    });
  });

  it("attaches a countdown to scheduled stops within a week, not beyond", () => {
    const today = ev("scheduled", 0);
    const soon = ev("scheduled", 2);
    const far = ev("scheduled", 30);
    const tour = buildTour([today, soon, far], NOW);
    expect(tour.upcoming.map((e) => e.countdown)).toEqual([
      { kind: "today" },
      { kind: "days", days: 2 },
      null,
    ]);
  });

  it("totals every past stop and its takes, beyond the cap", () => {
    const past = Array.from({ length: TOUR_CAP + 2 }, (_, i) => ({
      ...ev("sealed", -(i + 1)),
      takeCount: 10,
    }));
    const open = { ...ev("up-next", 0), takeCount: 99 };
    const tour = buildTour([...past, open], NOW);
    expect(tour.past).toHaveLength(TOUR_CAP);
    expect(tour.pastTotal).toBe(TOUR_CAP + 2);
    expect(tour.pastTakes).toBe((TOUR_CAP + 2) * 10);
  });

  it("flags transcribing when a past stop has closed but not archived", () => {
    const archived = ev("sealed", -5);
    const closed = { ...ev("sealed", -1), liveState: "transcribing" as const };
    expect(buildTour([archived], NOW).pastLiveState).toBeNull();
    expect(buildTour([archived, closed], NOW).pastLiveState).toBe("transcribing");
  });

  it("never attaches a countdown to the open stop", () => {
    const open = ev("up-next", 0);
    expect(buildTour([open], NOW).upcoming[0].countdown).toBeNull();
  });
});
