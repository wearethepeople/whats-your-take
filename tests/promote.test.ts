import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import * as schema from "~/db/schema.server";
import { bucketFor, truncateToHour } from "~/db/time.server";
import { promoteDraft } from "~/submissions/promote.server";
import { DRAFT_TTL_MINUTES, stageDraft } from "~/submissions/stage.server";
import { freshDb, seedOpenEvent } from "./helpers";

const STAGED_AT = new Date("2026-09-01T16:47:23Z");
const PROMOTED_AT = new Date("2026-09-01T16:49:41Z");

function stagedCode(db: ReturnType<typeof freshDb>["db"], slug: string): string {
  const result = stageDraft(db, { slug, body: "Be kind to each other.", now: STAGED_AT });
  if (!result.ok) throw new Error(`staging failed: ${result.error}`);
  return result.claimCode;
}

test("promotion births a pending site response from the staged body", () => {
  const { db } = freshDb();
  const { event, prompt } = seedOpenEvent(db);
  const code = stagedCode(db, event.slug);

  const result = promoteDraft(db, { code, now: PROMOTED_AT });
  expect(result.ok).toBe(true);

  const response = db.select().from(schema.responses).get();
  expect(response?.body).toBe("Be kind to each other.");
  expect(response?.status).toBe("pending");
  expect(response?.channel).toBe("site");
  expect(response?.eventId).toBe(event.id);
  expect(response?.promptId).toBe(prompt.id);
});

test("I4 on the real write path: created_at is hour-truncated, bucket set", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const code = stagedCode(db, event.slug);
  promoteDraft(db, { code, now: PROMOTED_AT });

  const response = db.select().from(schema.responses).get();
  expect(response?.createdAt).toEqual(truncateToHour(PROMOTED_AT));
  expect(response?.createdAt).toEqual(new Date("2026-09-01T16:00:00Z"));
  expect(response?.createdBucket).toBe(bucketFor(PROMOTED_AT));
});

test("I2: after promotion the staged row keeps no body and no response link", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const code = stagedCode(db, event.slug);
  promoteDraft(db, { code, now: PROMOTED_AT });

  const draft = db.select().from(schema.stagedDrafts).get();
  expect(draft?.body).toBeNull();
  expect(draft?.promotedAt).toEqual(PROMOTED_AT);
  expect(draft?.code).toBe(code); // survives until sweep for the status poll
  // Structural: the staging table has no column that could reference a response.
  expect(Object.keys(draft ?? {}).sort()).toEqual([
    "body",
    "code",
    "eventId",
    "expiresAt",
    "id",
    "promotedAt",
  ]);
});

test("unknown, expired, and double-promoted codes are refused", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);

  expect(promoteDraft(db, { code: "000000", now: PROMOTED_AT })).toMatchObject({
    ok: false,
    error: "unknown",
  });

  const code = stagedCode(db, event.slug);
  const afterExpiry = new Date(STAGED_AT.getTime() + (DRAFT_TTL_MINUTES + 1) * 60 * 1000);
  expect(promoteDraft(db, { code, now: afterExpiry })).toMatchObject({
    ok: false,
    error: "expired",
  });
  expect(db.select().from(schema.responses).all()).toHaveLength(0);

  expect(promoteDraft(db, { code, now: PROMOTED_AT }).ok).toBe(true);
  expect(promoteDraft(db, { code, now: PROMOTED_AT })).toMatchObject({
    ok: false,
    error: "already-promoted",
  });
  expect(db.select().from(schema.responses).all()).toHaveLength(1);
});

test("closing the event hard-stops promotion of already-staged drafts", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const code = stagedCode(db, event.slug);

  db.update(schema.events).set({ status: "closed" }).where(eq(schema.events.id, event.id)).run();

  expect(promoteDraft(db, { code, now: PROMOTED_AT })).toMatchObject({
    ok: false,
    error: "event-closed",
  });
  expect(db.select().from(schema.responses).all()).toHaveLength(0);
});

test("promotion trims host-typed whitespace around the code", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const code = stagedCode(db, event.slug);
  expect(promoteDraft(db, { code: `  ${code} `, now: PROMOTED_AT }).ok).toBe(true);
});
