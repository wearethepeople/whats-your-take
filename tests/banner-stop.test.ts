import { describe, expect, it } from "vitest";
import { bannerStop } from "~/features/events/banner-stop";
import type { LedgerEvent } from "~/features/events/services/season.server";

const NOW = new Date("2026-11-04T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function ev(slug: string, status: LedgerEvent["status"], startsAt: Date): LedgerEvent {
  return {
    id: 1,
    publicSlug: slug,
    name: slug,
    city: "Dallas",
    state: "TX",
    dateLabel: "",
    startsAt,
    takeCount: 0,
    status,
    liveState: null,
  };
}

describe("bannerStop", () => {
  it("returns a scheduled event starting within a week", () => {
    const soon = ev("soon", "scheduled", new Date(NOW.getTime() + 3 * DAY));
    expect(bannerStop([soon], NOW)).toBe(soon);
  });

  it("includes the 7-day boundary and excludes beyond it", () => {
    const edge = ev("edge", "scheduled", new Date(NOW.getTime() + 7 * DAY));
    const past = ev("past-edge", "scheduled", new Date(NOW.getTime() + 7 * DAY + 1));
    expect(bannerStop([edge], NOW)).toBe(edge);
    expect(bannerStop([past], NOW)).toBeUndefined();
  });

  it("ignores scheduled events already in the past", () => {
    const past = ev("past", "scheduled", new Date(NOW.getTime() - DAY));
    expect(bannerStop([past], NOW)).toBeUndefined();
  });

  it("ignores sealed events inside the window", () => {
    const sealed = ev("sealed", "sealed", new Date(NOW.getTime() + DAY));
    expect(bannerStop([sealed], NOW)).toBeUndefined();
  });

  it("picks the soonest of several in-window events", () => {
    const later = ev("later", "scheduled", new Date(NOW.getTime() + 5 * DAY));
    const sooner = ev("sooner", "scheduled", new Date(NOW.getTime() + 2 * DAY));
    expect(bannerStop([later, sooner], NOW)).toBe(sooner);
  });

  it("prefers the open event over a nearer scheduled one", () => {
    const open = ev("open", "up-next", new Date(NOW.getTime() - DAY));
    const soon = ev("soon", "scheduled", new Date(NOW.getTime() + DAY));
    expect(bannerStop([soon, open], NOW)).toBe(open);
  });

  it("shows an open event regardless of date (existing behavior)", () => {
    const open = ev("open", "up-next", new Date(NOW.getTime() + 30 * DAY));
    expect(bannerStop([open], NOW)).toBe(open);
  });
});
