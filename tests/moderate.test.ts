import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { responseRevisions, responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { MAX_BODY_LENGTH } from "~/submissions/constants";
import {
  approveResponse,
  editCard,
  hideResponse,
  listForModeration,
} from "~/submissions/moderate.server";
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

function seedCard(db: Db, promptId: number, eventId: number, body = "a card") {
  return insertResponse(db, { promptId, eventId, body, channel: "card", now: NOW });
}

function rowOf(db: Db, id: number) {
  return db.select().from(responses).where(eq(responses.id, id)).get();
}

describe("editCard", () => {
  it("edits pending and approved cards in place, leaving status as it was", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const pending = seedCard(db, prompt.id, event.id, "typo card");
    const approved = seedCard(db, prompt.id, event.id, "another typo");
    expect(approveResponse(db, approved.id).ok).toBe(true);

    expect(editCard(db, pending.id, { body: "fixed card", nameFlag: false }).ok).toBe(true);
    expect(editCard(db, approved.id, { body: "fixed another", nameFlag: false }).ok).toBe(true);

    expect(rowOf(db, pending.id)).toMatchObject({ body: "fixed card", status: "pending" });
    expect(rowOf(db, approved.id)).toMatchObject({ body: "fixed another", status: "approved" });
  });

  it("refuses hidden cards, non-card responses, and unknown ids", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const hidden = seedCard(db, prompt.id, event.id, "hidden card");
    expect(hideResponse(db, hidden.id).ok).toBe(true);
    const site = seedResponse(db, prompt.id, event.id, "site take");
    const kiosk = insertResponse(db, {
      promptId: prompt.id,
      eventId: event.id,
      body: "kiosk take",
      channel: "kiosk",
      now: NOW,
    });

    for (const id of [hidden.id, site.id, kiosk.id, 999]) {
      expect(editCard(db, id, { body: "rewritten", nameFlag: true }), String(id)).toMatchObject({
        ok: false,
        error: "not-editable",
      });
    }
    // Refusals changed nothing: bodies and flags intact, no revisions.
    expect(rowOf(db, hidden.id)).toMatchObject({ body: "hidden card", nameFlag: false });
    expect(rowOf(db, site.id)).toMatchObject({ body: "site take", nameFlag: false });
    expect(rowOf(db, kiosk.id)).toMatchObject({ body: "kiosk take", nameFlag: false });
    expect(db.select().from(responseRevisions).all()).toHaveLength(0);
  });

  it("logs the prior body once per body change, in order, and deletes nothing", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const card = seedCard(db, prompt.id, event.id, "first");

    expect(editCard(db, card.id, { body: "second", nameFlag: false }).ok).toBe(true);
    expect(editCard(db, card.id, { body: "third", nameFlag: false }).ok).toBe(true);

    const revisions = db.select().from(responseRevisions).all();
    expect(revisions.map((row) => [row.responseId, row.body])).toEqual([
      [card.id, "first"],
      [card.id, "second"],
    ]);
    expect(revisions.every((row) => row.revisedAt instanceof Date)).toBe(true);
    expect(rowOf(db, card.id)?.body).toBe("third");
    expect(db.select().from(responses).all()).toHaveLength(1);
  });

  it("writes no revision for a flag-only edit or an unchanged body", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const card = seedCard(db, prompt.id, event.id, "same body");

    expect(editCard(db, card.id, { body: "same body", nameFlag: true }).ok).toBe(true);
    expect(rowOf(db, card.id)?.nameFlag).toBe(true);
    expect(editCard(db, card.id, { body: "  same body  ", nameFlag: false }).ok).toBe(true);
    expect(rowOf(db, card.id)?.nameFlag).toBe(false);
    expect(db.select().from(responseRevisions).all()).toHaveLength(0);
  });

  it("never touches created_at, created_bucket, or channel", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const card = seedCard(db, prompt.id, event.id, "before");
    const before = rowOf(db, card.id);

    expect(editCard(db, card.id, { body: "after", nameFlag: true }).ok).toBe(true);

    const after = rowOf(db, card.id);
    expect(after?.createdAt).toEqual(before?.createdAt);
    expect(after?.createdBucket).toBeNull();
    expect(after?.channel).toBe("card");
    expect(after?.status).toBe("pending");
  });

  it("trims the body and refuses blank or oversize bodies without writing anything", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const card = seedCard(db, prompt.id, event.id, "keep me");

    expect(editCard(db, card.id, { body: "  trimmed  ", nameFlag: false }).ok).toBe(true);
    expect(rowOf(db, card.id)?.body).toBe("trimmed");
    const revisionsAfterGoodEdit = db.select().from(responseRevisions).all().length;

    for (const body of ["   ", "", null, "x".repeat(MAX_BODY_LENGTH + 1)]) {
      expect(editCard(db, card.id, { body, nameFlag: true })).toMatchObject({
        ok: false,
        error: "invalid-body",
      });
    }
    expect(rowOf(db, card.id)).toMatchObject({ body: "trimmed", nameFlag: false });
    expect(db.select().from(responseRevisions).all()).toHaveLength(revisionsAfterGoodEdit);
  });
});
