import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { responses } from "~/db/schema.server";
import { liveCount } from "~/features/events/services/counts.server";
import { stageDraft } from "~/submissions/stage.server";
import { insertResponse } from "~/submissions/write.server";
import { freshDb, seedOpenEvent } from "./helpers";

const NOW = new Date("2026-09-01T19:23:45Z");

describe("liveCount", () => {
  it("returns zero for an event with no responses", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db);
    expect(liveCount(db, event.id)).toEqual({
      total: 0,
      byChannel: { site: 0, kiosk: 0, card: 0 },
    });
  });

  it("totals per channel and counts every status alike", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const base = { promptId: prompt.id, eventId: event.id, now: NOW };
    insertResponse(db, { ...base, body: "one", channel: "site" });
    insertResponse(db, { ...base, body: "two", channel: "site" });
    insertResponse(db, { ...base, body: "three", channel: "kiosk" });
    const card = insertResponse(db, { ...base, body: "four", channel: "card" });
    // A hidden row was still a real participant — the count keeps it.
    db.update(responses).set({ status: "hidden" }).where(eq(responses.id, card.id)).run();

    expect(liveCount(db, event.id)).toEqual({
      total: 4,
      byChannel: { site: 2, kiosk: 1, card: 1 },
    });
  });

  it("ignores other events and staged drafts", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db);
    const other = seedOpenEvent(db, { slug: "event-two" });
    insertResponse(db, {
      promptId: other.prompt.id,
      eventId: other.event.id,
      body: "elsewhere",
      channel: "site",
      now: NOW,
    });
    expect(stageDraft(db, { slug: event.slug, body: "staged only", now: NOW }).ok).toBe(true);

    expect(liveCount(db, event.id).total).toBe(0);
    expect(liveCount(db, other.event.id).total).toBe(1);
  });
});
