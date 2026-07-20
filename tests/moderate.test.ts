import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { approveResponse, hideResponse, listForModeration } from "~/submissions/moderate.server";
import { insertResponse } from "~/submissions/write.server";
import { freshDb, seedOpenEvent } from "./helpers";

const NOW = new Date("2026-09-01T19:23:45Z");

function seedResponse(db: Db, promptId: number, eventId: number, body = "a take") {
  return insertResponse(db, { promptId, eventId, body, channel: "site", now: NOW });
}

function statusOf(db: Db, id: number) {
  return db.select().from(responses).where(eq(responses.id, id)).get()?.status;
}

describe("moderation transitions", () => {
  it("walks the full matrix and never deletes a row", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const a = seedResponse(db, prompt.id, event.id, "approve me");
    const b = seedResponse(db, prompt.id, event.id, "hide me from pending");
    const c = seedResponse(db, prompt.id, event.id, "hide me after approval");

    // pending→approved
    expect(approveResponse(db, a.id).ok).toBe(true);
    expect(statusOf(db, a.id)).toBe("approved");
    // approved→approved refused
    expect(approveResponse(db, a.id)).toMatchObject({ ok: false, error: "invalid-transition" });

    // pending→hidden
    expect(hideResponse(db, b.id).ok).toBe(true);
    expect(statusOf(db, b.id)).toBe("hidden");

    // approved→hidden
    expect(approveResponse(db, c.id).ok).toBe(true);
    expect(hideResponse(db, c.id).ok).toBe(true);
    expect(statusOf(db, c.id)).toBe("hidden");

    // hidden is terminal: no un-hide, no approve
    expect(approveResponse(db, b.id)).toMatchObject({ ok: false, error: "invalid-transition" });
    expect(hideResponse(db, b.id)).toMatchObject({ ok: false, error: "invalid-transition" });
    expect(statusOf(db, b.id)).toBe("hidden");

    // unknown id refused
    expect(approveResponse(db, 999)).toMatchObject({ ok: false });
    expect(hideResponse(db, 999)).toMatchObject({ ok: false });

    // I5: every refusal left the archive intact — nothing was ever deleted
    expect(db.select().from(responses).all()).toHaveLength(3);
  });

  it("lists an event's responses in the public (created_at, body) order", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const other = seedOpenEvent(db, { slug: "event-two" });
    seedResponse(db, prompt.id, event.id, "zebra");
    seedResponse(db, prompt.id, event.id, "apple");
    seedResponse(db, other.prompt.id, other.event.id, "elsewhere");

    const listed = listForModeration(db, event.id);
    expect(listed.map((row) => row.body)).toEqual(["apple", "zebra"]);
  });
});
