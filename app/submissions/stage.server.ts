// Staging: the public half of the submit handshake. A participant's draft
// becomes an ephemeral staged_drafts row + claim code; nothing here writes
// into responses (promotion is the host's authenticated act — see
// promote.server.ts). Never refuse a plausible submission: the circuit
// breaker exists for scripted abuse, not busy tables.

import { randomInt } from "node:crypto";
import { eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { events, presenceWindows, stagedDrafts } from "~/db/schema.server";
import type { Db } from "~/db/types.server";

import { DRAFT_TTL_MINUTES, MAX_BODY_LENGTH } from "./constants";

export const WINDOW_SECONDS = 60;
export const CIRCUIT_BREAKER_PER_WINDOW = 100;
export { DRAFT_TTL_MINUTES, MAX_BODY_LENGTH };
const CODE_RETRY_LIMIT = 5;

export const bodySchema = z
  .string()
  .trim()
  .min(1, "Write something first — the card is blank.")
  .max(MAX_BODY_LENGTH, `Keep it under ${MAX_BODY_LENGTH} characters.`);

export function currentWindowStart(now: Date): Date {
  const ms = WINDOW_SECONDS * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export function generateClaimCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export type StageError = "not-found" | "event-closed" | "invalid-body" | "table-busy";

export type StageResult =
  | { ok: true; claimCode: string }
  | { ok: false; error: StageError; message: string };

function err(error: StageError, message: string): StageResult {
  return { ok: false, error, message };
}

// Expired rows leave (drafts are pre-corpus ephemera, not responses — I5
// applies to responses only); sweeping also frees claim codes for reuse.
export function sweepExpired(db: Db, now: Date): void {
  db.delete(stagedDrafts).where(lt(stagedDrafts.expiresAt, now)).run();
}

export function stageDraft(
  db: Db,
  input: { slug: string; body: unknown; now: Date },
  options: { generateCode?: () => string } = {},
): StageResult {
  const generateCode = options.generateCode ?? generateClaimCode;

  const event = db.select().from(events).where(eq(events.slug, input.slug)).get();
  if (!event || event.status === "draft") {
    return err("not-found", "There's no table at this address.");
  }
  if (event.status !== "open") {
    return err("event-closed", "This table has closed — submissions ended with the event.");
  }

  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) {
    return err("invalid-body", parsed.error.issues[0]?.message ?? "That response can't be used.");
  }

  sweepExpired(db, input.now);

  const windowStart = currentWindowStart(input.now);
  const windowEnd = new Date(windowStart.getTime() + WINDOW_SECONDS * 1000);
  const expiresAt = new Date(input.now.getTime() + DRAFT_TTL_MINUTES * 60 * 1000);

  return db.transaction((tx) => {
    // Telemetry counts every attempt, including ones the breaker refuses —
    // returning (not throwing) below keeps the increment committed.
    const window = tx
      .insert(presenceWindows)
      .values({ eventId: event.id, windowStart, windowEnd, submissionCount: 1 })
      .onConflictDoUpdate({
        target: [presenceWindows.eventId, presenceWindows.windowStart],
        set: { submissionCount: sql`${presenceWindows.submissionCount} + 1` },
      })
      .returning()
      .get();

    if (window.submissionCount > CIRCUIT_BREAKER_PER_WINDOW) {
      return err("table-busy", "The table is flooded right now — wait a minute and try again.");
    }

    for (let attempt = 0; attempt < CODE_RETRY_LIMIT; attempt++) {
      const claimCode = generateCode();
      try {
        tx.insert(stagedDrafts)
          .values({ eventId: event.id, body: parsed.data, code: claimCode, expiresAt })
          .run();
        return { ok: true, claimCode };
      } catch (cause) {
        if (!isUniqueViolation(cause)) throw cause;
      }
    }
    // ~1M live codes would be needed to get here by chance.
    throw new Error("could not allocate a claim code");
  });
}

export type DraftStatus = "waiting" | "promoted" | "gone";

export function draftStatus(db: Db, input: { code: string; now: Date }): DraftStatus {
  const row = db.select().from(stagedDrafts).where(eq(stagedDrafts.code, input.code)).get();
  if (!row || row.expiresAt <= input.now) return "gone";
  return row.promotedAt ? "promoted" : "waiting";
}

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    String((cause as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT")
  );
}
