// Moderation is append-only (I5): pending→approved, pending→hidden,
// approved→hidden. hidden is terminal — it is absent from every source
// list below, so terminality is structural, and the legal-source check
// lives in the UPDATE's WHERE clause (no read-then-write race). Nothing
// here (or anywhere) deletes a response.

import { and, asc, eq, inArray } from "drizzle-orm";
import { responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";

export type ResponseRow = typeof responses.$inferSelect;

export type ModerateError = "invalid-transition";

export type ModerateResult = { ok: true } | { ok: false; error: ModerateError; message: string };

// Review order matches the export's public order (created_at, body) — the
// list must not reconstruct intra-hour submission sequence either (I4).
export function listForModeration(db: Db, eventId: number): ResponseRow[] {
  return db
    .select()
    .from(responses)
    .where(eq(responses.eventId, eventId))
    .orderBy(asc(responses.createdAt), asc(responses.body))
    .all();
}

export function approveResponse(db: Db, id: number): ModerateResult {
  const changes = db
    .update(responses)
    .set({ status: "approved" })
    .where(and(eq(responses.id, id), eq(responses.status, "pending")))
    .run().changes;
  if (changes === 0) {
    return {
      ok: false,
      error: "invalid-transition",
      message: "Only a pending response can be approved — hidden is terminal.",
    };
  }
  return { ok: true };
}

export function hideResponse(db: Db, id: number): ModerateResult {
  const changes = db
    .update(responses)
    .set({ status: "hidden" })
    .where(and(eq(responses.id, id), inArray(responses.status, ["pending", "approved"])))
    .run().changes;
  if (changes === 0) {
    return {
      ok: false,
      error: "invalid-transition",
      message: "That response is already hidden (or doesn't exist).",
    };
  }
  return { ok: true };
}
