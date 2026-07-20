import { describe, expect, it } from "vitest";
import { responses } from "~/db/schema.server";
import { bucketFor, truncateToHour } from "~/db/time.server";
import { enterCard } from "~/submissions/card.server";
import { MAX_BODY_LENGTH } from "~/submissions/constants";
import { freshDb, seedOpenEvent } from "./helpers";

const NOW = new Date("2026-09-01T19:23:45Z");

describe("enterCard", () => {
  it("inserts a pending card response through the I4 choke point", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const result = enterCard(db, { eventId: event.id, body: "  from a card  ", now: NOW });
    expect(result.ok).toBe(true);

    const row = db.select().from(responses).get();
    expect(row).toBeDefined();
    expect(row?.channel).toBe("card");
    expect(row?.status).toBe("pending");
    expect(row?.promptId).toBe(prompt.id);
    expect(row?.body).toBe("from a card");
    // I4 on this second write path: hour-truncated, bucket only.
    expect(row?.createdAt).toEqual(truncateToHour(NOW));
    expect(row?.createdBucket).toBe(bucketFor(NOW));
  });

  it("accepts cards while the event is open or closed", () => {
    for (const status of ["open", "closed"] as const) {
      const { db } = freshDb();
      const { event } = seedOpenEvent(db, { status });
      expect(enterCard(db, { eventId: event.id, body: "card", now: NOW }).ok, status).toBe(true);
    }
  });

  it("refuses cards while the event is draft or archived", () => {
    for (const status of ["draft", "archived"] as const) {
      const { db } = freshDb();
      const { event } = seedOpenEvent(db, { status });
      expect(enterCard(db, { eventId: event.id, body: "card", now: NOW }), status).toMatchObject({
        ok: false,
        error: "event-not-accepting",
      });
      expect(db.select().from(responses).all()).toHaveLength(0);
    }
  });

  it("refuses a missing event, a blank card, and an oversize card", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db);
    expect(enterCard(db, { eventId: 999, body: "card", now: NOW })).toMatchObject({
      ok: false,
      error: "not-found",
    });
    expect(enterCard(db, { eventId: event.id, body: "   ", now: NOW })).toMatchObject({
      ok: false,
      error: "invalid-body",
    });
    expect(
      enterCard(db, { eventId: event.id, body: "x".repeat(MAX_BODY_LENGTH + 1), now: NOW }),
    ).toMatchObject({ ok: false, error: "invalid-body" });
    expect(db.select().from(responses).all()).toHaveLength(0);
  });
});
