import { describe, expect, it } from "vitest";
import { countdownFor, countdownLabel } from "~/features/events/countdown";

// Wall-clock start times are stored as UTC fields (see countdown.ts), so
// these are "10:00 on Nov 6" as the host typed it.
const start = (iso: string) => new Date(`${iso}Z`);

// 2026-11-04 15:00 UTC = 09:00 CST (Wed).
const NOW = new Date("2026-11-04T15:00:00Z");

describe("countdownFor", () => {
  it("is 'today' on the day of the event", () => {
    expect(countdownFor(start("2026-11-04T18:00:00"), NOW)).toEqual({ kind: "today" });
  });

  it("is 'today' even if the start time has already passed", () => {
    expect(countdownFor(start("2026-11-04T08:00:00"), NOW)).toEqual({ kind: "today" });
  });

  it("counts calendar days, not 24-hour blocks", () => {
    // 22:00 CST Nov 4 — 20 real hours before 18:00 on Nov 5, still 1 day.
    const lateNow = new Date("2026-11-05T04:00:00Z");
    expect(countdownFor(start("2026-11-05T18:00:00"), lateNow)).toEqual({ kind: "days", days: 1 });
  });

  it("reads today in Central time after UTC has rolled to the next day", () => {
    // 21:00 CST Nov 4 = 03:00Z Nov 5.
    const eveningNow = new Date("2026-11-05T03:00:00Z");
    expect(countdownFor(start("2026-11-04T18:00:00"), eveningNow)).toEqual({ kind: "today" });
  });

  it("counts days up to and including seven", () => {
    expect(countdownFor(start("2026-11-05T10:00:00"), NOW)).toEqual({ kind: "days", days: 1 });
    expect(countdownFor(start("2026-11-11T10:00:00"), NOW)).toEqual({ kind: "days", days: 7 });
  });

  it("is null beyond seven days", () => {
    expect(countdownFor(start("2026-11-12T10:00:00"), NOW)).toBeNull();
  });

  it("is null once the event's day has passed", () => {
    expect(countdownFor(start("2026-11-03T10:00:00"), NOW)).toBeNull();
  });

  it("handles the DST change (Nov 1 2026) without drifting a day", () => {
    const beforeFallBack = new Date("2026-10-30T15:00:00Z");
    expect(countdownFor(start("2026-11-03T10:00:00"), beforeFallBack)).toEqual({
      kind: "days",
      days: 4,
    });
  });
});

describe("countdownLabel", () => {
  it("labels today, singular and plural days", () => {
    expect(countdownLabel({ kind: "today" })).toBe("Today");
    expect(countdownLabel({ kind: "days", days: 1 })).toBe("In 1 day");
    expect(countdownLabel({ kind: "days", days: 3 })).toBe("In 3 days");
  });
});
