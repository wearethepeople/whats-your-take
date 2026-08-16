import { describe, expect, it } from "vitest";
import {
  archiveView,
  nextStop,
  seasonView,
  upcomingLedger,
} from "~/features/events/services/season.server";
import * as schema from "~/db/schema.server";
import { freshDb } from "./helpers";

type Db = ReturnType<typeof freshDb>["db"];

function seedPrompt(db: Db) {
  return db
    .insert(schema.prompts)
    .values({ text: "What would you remind an American in 2075?" })
    .returning()
    .get();
}

function seedEvent(
  db: Db,
  promptId: number,
  overrides: {
    slug: string;
    status: "draft" | "scheduled" | "open" | "closed" | "archived";
    startsAt: Date;
    venue?: string | null;
    zip?: string | null;
    city?: string;
  },
) {
  return db
    .insert(schema.events)
    .values({
      slug: overrides.slug,
      publicSlug: `pub-${overrides.slug}`,
      promptId,
      name: `Event ${overrides.slug}`,
      venue: overrides.venue === undefined ? "The Park" : overrides.venue,
      zip: overrides.zip === undefined ? "75201" : overrides.zip,
      city: overrides.city ?? "Dallas",
      startsAt: overrides.startsAt,
      endsAt: new Date(overrides.startsAt.getTime() + 8 * 60 * 60 * 1000),
      status: overrides.status,
    })
    .returning()
    .get();
}

describe("nextStop", () => {
  it("prefers the earliest open event over any scheduled one", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "later-open",
      status: "open",
      startsAt: new Date("2026-09-10T15:00:00Z"),
    });
    seedEvent(db, prompt.id, {
      slug: "future-scheduled",
      status: "scheduled",
      startsAt: new Date("2026-09-05T15:00:00Z"),
      venue: null,
      zip: null,
    });
    const stop = nextStop(db);
    expect(stop?.publicSlug).toBe("pub-later-open");
  });

  it("falls back to the soonest scheduled event when nothing's open", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "far-scheduled",
      status: "scheduled",
      startsAt: new Date("2026-10-01T15:00:00Z"),
      venue: null,
      zip: null,
    });
    seedEvent(db, prompt.id, {
      slug: "near-scheduled",
      status: "scheduled",
      startsAt: new Date("2026-09-05T15:00:00Z"),
      venue: null,
      zip: null,
    });
    const stop = nextStop(db);
    expect(stop?.publicSlug).toBe("pub-near-scheduled");
    expect(stop?.venue).toBeNull();
    expect(stop?.status).toBe("scheduled");
  });

  it("is undefined when nothing is open or scheduled", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "past",
      status: "closed",
      startsAt: new Date("2026-01-01T15:00:00Z"),
    });
    expect(nextStop(db)).toBeUndefined();
  });
});

describe("upcomingLedger", () => {
  it("lists open and scheduled stops, soonest first, excluding sealed/draft", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "closed-one",
      status: "closed",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });
    seedEvent(db, prompt.id, {
      slug: "open-one",
      status: "open",
      startsAt: new Date("2026-09-01T15:00:00Z"),
    });
    seedEvent(db, prompt.id, {
      slug: "scheduled-later",
      status: "scheduled",
      startsAt: new Date("2026-10-01T15:00:00Z"),
      venue: null,
      zip: null,
    });
    seedEvent(db, prompt.id, {
      slug: "draft-one",
      status: "draft",
      startsAt: new Date("2026-11-01T15:00:00Z"),
      venue: null,
      zip: null,
    });

    const upcoming = upcomingLedger(db);
    expect(upcoming.map((event) => event.publicSlug)).toEqual([
      "pub-open-one",
      "pub-scheduled-later",
    ]);
    expect(upcoming[0].status).toBe("up-next");
    expect(upcoming[1].status).toBe("scheduled");
  });
});

describe("status mapping", () => {
  it("seasonView maps open/scheduled/closed to up-next/scheduled/sealed", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "open-one",
      status: "open",
      startsAt: new Date("2026-09-01T15:00:00Z"),
    });
    seedEvent(db, prompt.id, {
      slug: "scheduled-one",
      status: "scheduled",
      startsAt: new Date("2026-10-01T15:00:00Z"),
      venue: null,
      zip: null,
    });
    seedEvent(db, prompt.id, {
      slug: "closed-one",
      status: "closed",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });

    const view = seasonView(db);
    const byStatus = new Map(view?.ledger.map((event) => [event.publicSlug, event.status]));
    expect(byStatus.get("pub-open-one")).toBe("up-next");
    expect(byStatus.get("pub-scheduled-one")).toBe("scheduled");
    expect(byStatus.get("pub-closed-one")).toBe("sealed");
  });

  it("flags liveState as transcribing when an event has closed but not archived", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "closed-one",
      status: "closed",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });

    const view = seasonView(db);
    expect(view?.stats.liveState).toBe("transcribing");
  });

  it("flags liveState as open when an event is currently open", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "open-one",
      status: "open",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });

    const view = seasonView(db);
    expect(view?.stats.liveState).toBe("open");
  });

  it("liveState is null once every closed event is archived", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "archived-one",
      status: "archived",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });

    const view = seasonView(db);
    expect(view?.stats.liveState).toBeNull();
  });

  it("flags liveState on the individual ledger row, not just season-wide", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "closed-one",
      status: "closed",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });
    seedEvent(db, prompt.id, {
      slug: "open-one",
      status: "open",
      startsAt: new Date("2026-09-01T15:00:00Z"),
    });

    const view = seasonView(db);
    const byStatus = new Map(view?.ledger.map((event) => [event.publicSlug, event.liveState]));
    expect(byStatus.get("pub-closed-one")).toBe("transcribing");
    expect(byStatus.get("pub-open-one")).toBe("open");
  });

  it("archiveView flags liveState as transcribing when any archived event is still closed", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "closed-one",
      status: "closed",
      startsAt: new Date("2026-08-01T15:00:00Z"),
    });

    const archive = archiveView(db);
    expect(archive.liveState).toBe("transcribing");
    expect(archive.events[0].liveState).toBe("transcribing");
  });

  it("archiveView agrees with seasonView's status mapping", () => {
    const { db } = freshDb();
    const prompt = seedPrompt(db);
    seedEvent(db, prompt.id, {
      slug: "scheduled-one",
      status: "scheduled",
      startsAt: new Date("2026-10-01T15:00:00Z"),
      venue: null,
      zip: null,
    });

    const archive = archiveView(db);
    expect(archive.events[0].status).toBe("scheduled");
  });
});
