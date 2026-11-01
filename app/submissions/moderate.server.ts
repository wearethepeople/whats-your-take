// Moderation is append-only (I5): pending→approved, pending→hidden,
// approved→hidden. hidden is terminal — it is absent from every source
// list below, so terminality is structural, and the legal-source check
// lives in the UPDATE's WHERE clause (no read-then-write race). Nothing
// here (or anywhere) deletes a response. editCard and redactName are the only
// content mutations, both pending/approved only: editCard on card rows, with
// the prior body appended to response_revisions in the same transaction (I5);
// redactName on kiosk/site rows, logging that it happened but not the text.

import { and, asc, eq, inArray } from "drizzle-orm";
import { responseRevisions, responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { NAME_PLACEHOLDER } from "./constants";
import { bodySchema } from "./stage.server";

export type ResponseRow = typeof responses.$inferSelect;

export type ModerateError = "invalid-transition" | "invalid-body" | "not-editable";

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
      message: "Only a pending response can be approved. Hidden is terminal.",
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

// Edits in place; status, created_at and created_bucket are never touched.
// The editable-row check (card, pending/approved) and the write share one
// transaction, so a row can't change state between them.
export function editCard(
  db: Db,
  id: number,
  input: { body: unknown; nameFlag: boolean },
): ModerateResult {
  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid-body",
      message: parsed.error.issues[0]?.message ?? "That card can't be used.",
    };
  }
  const body = parsed.data;
  return db.transaction((tx) => {
    const current = tx
      .select({ body: responses.body })
      .from(responses)
      .where(
        and(
          eq(responses.id, id),
          eq(responses.channel, "card"),
          inArray(responses.status, ["pending", "approved"]),
        ),
      )
      .get();
    if (!current) {
      return {
        ok: false,
        error: "not-editable",
        message: "Only a pending or approved card can be edited.",
      } as const;
    }
    if (current.body !== body) {
      tx.insert(responseRevisions).values({ responseId: id, body: current.body }).run();
    }
    tx.update(responses).set({ body, nameFlag: input.nameFlag }).where(eq(responses.id, id)).run();
    return { ok: true } as const;
  });
}

// Name redaction for digital rows (I1/I5). The new body must carry the
// placeholder and differ from the old one, so this can't be used to rewrite a
// participant's words. The revision row has a NULL body on purpose: logging
// the prior text would copy the name into a second table. Same transaction
// and row-state guard as editCard.
export function redactName(db: Db, id: number, input: { body: unknown }): ModerateResult {
  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid-body",
      message: parsed.error.issues[0]?.message ?? "That response can't be used.",
    };
  }
  const body = parsed.data;
  if (!body.includes(NAME_PLACEHOLDER)) {
    return {
      ok: false,
      error: "invalid-body",
      message: `Replace the name with ${NAME_PLACEHOLDER}.`,
    };
  }
  return db.transaction((tx) => {
    const current = tx
      .select({ body: responses.body })
      .from(responses)
      .where(
        and(
          eq(responses.id, id),
          inArray(responses.channel, ["kiosk", "site"]),
          inArray(responses.status, ["pending", "approved"]),
        ),
      )
      .get();
    if (!current) {
      return {
        ok: false,
        error: "not-editable",
        message: "Only a pending or approved digital response can be redacted.",
      } as const;
    }
    if (current.body === body) {
      return {
        ok: false,
        error: "invalid-body",
        message: "Nothing was redacted. The text is unchanged.",
      } as const;
    }
    tx.insert(responseRevisions).values({ responseId: id, body: null }).run();
    tx.update(responses).set({ body, nameFlag: true }).where(eq(responses.id, id)).run();
    return { ok: true } as const;
  });
}
