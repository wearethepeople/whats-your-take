import { describe, expect, it } from "vitest";
import { eventDescription, revealPhrase } from "~/features/events/seo";

const base = {
  name: "Midsummer Art Fair",
  city: "Dallas",
  state: "TX",
  dayLabel: "Saturday, August 15, 2026",
  stopNumber: 1,
  status: "sealed" as const,
  liveState: null,
  takeCount: 18,
  revealDate: { date: new Date(Date.UTC(2027, 6, 1)), precision: "month" as const },
};

describe("eventDescription", () => {
  it("states the count and the reveal month for a finished stop", () => {
    expect(eventDescription(base)).toBe(
      "Midsummer Art Fair in Dallas, TX on Saturday, August 15, 2026. Stop 1 of the What’s Your Take? tour. 18 anonymous takes, sealed until July 2027.",
    );
  });

  it("uses the full date when the reveal is a specific day", () => {
    const text = eventDescription({
      ...base,
      revealDate: { date: new Date(Date.UTC(2027, 6, 4)), precision: "day" },
    });
    expect(text).toContain("sealed until July 4, 2027.");
  });

  it("says 'the reveal' when no date is set", () => {
    expect(eventDescription({ ...base, revealDate: null })).toContain("sealed until the reveal.");
  });

  it("uses the singular for one take", () => {
    expect(eventDescription({ ...base, takeCount: 1 })).toContain("1 anonymous take, sealed");
  });

  it("omits the count while cards are still being transcribed", () => {
    const text = eventDescription({ ...base, liveState: "transcribing" });
    expect(text).not.toMatch(/\d+ anonymous/);
    expect(text).toContain("Takes are anonymous and sealed until July 2027.");
  });

  it("omits a zero count", () => {
    expect(eventDescription({ ...base, takeCount: 0 })).not.toContain("0 anonymous");
  });

  it("invites in-person participation for upcoming and open stops", () => {
    for (const status of ["scheduled", "up-next"] as const) {
      const text = eventDescription({ ...base, status, takeCount: 0 });
      expect(text).toContain("You can only participate in person.");
      expect(text).not.toMatch(/\d+ anonymous/);
    }
  });

  it("falls back to the bare city when no state is recorded", () => {
    expect(eventDescription({ ...base, state: null })).toContain("in Dallas on Saturday");
  });
});

describe("revealPhrase", () => {
  it("names the configured month or day", () => {
    expect(revealPhrase({ date: new Date(Date.UTC(2027, 6, 1)), precision: "month" })).toBe(
      "July 2027",
    );
    expect(revealPhrase({ date: new Date(Date.UTC(2027, 6, 4)), precision: "day" })).toBe(
      "July 4, 2027",
    );
  });

  it("falls back to 'the reveal' when none is set", () => {
    expect(revealPhrase(null)).toBe("the reveal");
  });
});
