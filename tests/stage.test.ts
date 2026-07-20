import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import * as schema from "~/db/schema.server";
import {
  CIRCUIT_BREAKER_PER_WINDOW,
  currentWindowStart,
  draftStatus,
  DRAFT_TTL_MINUTES,
  MAX_BODY_LENGTH,
  stageDraft,
  sweepExpired,
  WINDOW_SECONDS,
} from "~/submissions/stage.server";
import { promoteDraft } from "~/submissions/promote.server";
import { freshDb, seedOpenEvent } from "./helpers";

const NOW = new Date("2026-09-01T16:47:23Z");

test("staging stores a draft with a 6-digit code and the TTL", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);

  const result = stageDraft(db, { slug: event.slug, body: "Be kind to each other.", now: NOW });
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  expect(result.claimCode).toMatch(/^\d{6}$/);

  const draft = db.select().from(schema.stagedDrafts).get();
  expect(draft?.body).toBe("Be kind to each other.");
  expect(draft?.eventId).toBe(event.id);
  expect(draft?.code).toBe(result.claimCode);
  expect(draft?.promotedAt).toBeNull();
  expect(draft?.expiresAt).toEqual(new Date(NOW.getTime() + DRAFT_TTL_MINUTES * 60 * 1000));
});

test("body validation: blank and over-length rejected, boundary accepted, trimmed", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);

  const blank = stageDraft(db, { slug: event.slug, body: "   ", now: NOW });
  expect(blank).toMatchObject({ ok: false, error: "invalid-body" });

  const over = stageDraft(db, {
    slug: event.slug,
    body: "x".repeat(MAX_BODY_LENGTH + 1),
    now: NOW,
  });
  expect(over).toMatchObject({ ok: false, error: "invalid-body" });

  const boundary = stageDraft(db, {
    slug: event.slug,
    body: "x".repeat(MAX_BODY_LENGTH),
    now: NOW,
  });
  expect(boundary.ok).toBe(true);

  const padded = stageDraft(db, { slug: event.slug, body: "  trimmed  ", now: NOW });
  if (!padded.ok) throw new Error("expected ok");
  const row = db
    .select()
    .from(schema.stagedDrafts)
    .where(eq(schema.stagedDrafts.code, padded.claimCode))
    .get();
  expect(row?.body).toBe("trimmed");

  // Failed validation stages nothing and counts nothing.
  const windows = db.select().from(schema.presenceWindows).all();
  expect(windows.reduce((sum, w) => sum + w.submissionCount, 0)).toBe(2);
});

test("open/close enforcement: draft event is invisible, closed event refuses", () => {
  const { db } = freshDb();
  seedOpenEvent(db, { status: "draft" });
  expect(stageDraft(db, { slug: "event-one", body: "hello", now: NOW })).toMatchObject({
    ok: false,
    error: "not-found",
  });
  expect(stageDraft(db, { slug: "no-such-event", body: "hello", now: NOW })).toMatchObject({
    ok: false,
    error: "not-found",
  });

  const closed = freshDb();
  seedOpenEvent(closed.db, { status: "closed" });
  expect(stageDraft(closed.db, { slug: "event-one", body: "hello", now: NOW })).toMatchObject({
    ok: false,
    error: "event-closed",
  });
  expect(closed.db.select().from(schema.stagedDrafts).all()).toHaveLength(0);
});

test("circuit breaker: accepts up to the limit, then refuses but keeps counting", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);

  for (let i = 0; i < CIRCUIT_BREAKER_PER_WINDOW; i++) {
    const result = stageDraft(db, { slug: event.slug, body: `take ${i}`, now: NOW });
    expect(result.ok).toBe(true);
  }
  const refused = stageDraft(db, { slug: event.slug, body: "one too many", now: NOW });
  expect(refused).toMatchObject({ ok: false, error: "table-busy" });

  // The refusal still counted (telemetry) but staged nothing.
  const window = db.select().from(schema.presenceWindows).get();
  expect(window?.submissionCount).toBe(CIRCUIT_BREAKER_PER_WINDOW + 1);
  expect(db.select().from(schema.stagedDrafts).all()).toHaveLength(CIRCUIT_BREAKER_PER_WINDOW);

  // The next window starts fresh.
  const nextWindow = new Date(NOW.getTime() + WINDOW_SECONDS * 1000);
  const accepted = stageDraft(db, { slug: event.slug, body: "new window", now: nextWindow });
  expect(accepted.ok).toBe(true);
});

test("presence windows land on the 60s grid and hold counts only", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  stageDraft(db, { slug: event.slug, body: "hello", now: NOW });

  const window = db.select().from(schema.presenceWindows).get();
  expect(window?.windowStart).toEqual(currentWindowStart(NOW));
  expect(window?.windowEnd).toEqual(new Date(currentWindowStart(NOW).getTime() + 60_000));
  // I2 structural check: nothing but event, bounds, and a count.
  expect(Object.keys(window ?? {}).sort()).toEqual([
    "eventId",
    "id",
    "submissionCount",
    "windowEnd",
    "windowStart",
  ]);
});

test("claim code collisions retry until a free code is found", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);

  const codes = ["111111", "111111", "222222"];
  let calls = 0;
  const first = stageDraft(
    db,
    { slug: event.slug, body: "first", now: NOW },
    { generateCode: () => codes[calls++]! },
  );
  const second = stageDraft(
    db,
    { slug: event.slug, body: "second", now: NOW },
    { generateCode: () => codes[calls++]! },
  );
  if (!first.ok || !second.ok) throw new Error("expected both to stage");
  expect(first.claimCode).toBe("111111");
  expect(second.claimCode).toBe("222222");
  expect(calls).toBe(3);
});

test("sweep removes expired drafts and frees their codes", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const staged = stageDraft(db, { slug: event.slug, body: "ephemeral", now: NOW });
  if (!staged.ok) throw new Error("expected ok");

  const afterExpiry = new Date(NOW.getTime() + (DRAFT_TTL_MINUTES + 1) * 60 * 1000);
  sweepExpired(db, afterExpiry);
  expect(db.select().from(schema.stagedDrafts).all()).toHaveLength(0);

  // Staging at a later time sweeps opportunistically too.
  const again = stageDraft(
    db,
    { slug: event.slug, body: "reuse", now: afterExpiry },
    { generateCode: () => staged.claimCode },
  );
  expect(again.ok).toBe(true);
});

test("draft status: waiting → promoted → gone after sweep; unknown is gone", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const staged = stageDraft(db, { slug: event.slug, body: "status walk", now: NOW });
  if (!staged.ok) throw new Error("expected ok");

  expect(draftStatus(db, { code: staged.claimCode, now: NOW })).toBe("waiting");

  const promoted = promoteDraft(db, { code: staged.claimCode, now: NOW });
  expect(promoted.ok).toBe(true);
  expect(draftStatus(db, { code: staged.claimCode, now: NOW })).toBe("promoted");

  const afterExpiry = new Date(NOW.getTime() + (DRAFT_TTL_MINUTES + 1) * 60 * 1000);
  sweepExpired(db, afterExpiry);
  expect(draftStatus(db, { code: staged.claimCode, now: afterExpiry })).toBe("gone");

  expect(draftStatus(db, { code: "000000", now: NOW })).toBe("gone");
});
