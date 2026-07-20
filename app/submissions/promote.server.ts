// Promotion: the host's half of the submit handshake, and the only road into
// the corpus. Runs solely behind host auth. I2: the staged row's body is
// nulled here, so after promotion nothing links a claim code to a response
// beyond event_id and the coarse time bucket; code + promoted_at persist
// only until sweep, to serve the participant's status poll.

import { eq } from "drizzle-orm";
import { events, stagedDrafts } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { insertResponse } from "./write.server";

export type PromoteError = "unknown" | "expired" | "already-promoted" | "event-closed";

export type PromoteResult = { ok: true } | { ok: false; error: PromoteError; message: string };

function err(error: PromoteError, message: string): PromoteResult {
  return { ok: false, error, message };
}

export function promoteDraft(db: Db, input: { code: string; now: Date }): PromoteResult {
  const code = input.code.trim();
  const draft = db.select().from(stagedDrafts).where(eq(stagedDrafts.code, code)).get();

  if (!draft) {
    return err("unknown", "No draft matches that code — ask them to re-check their screen.");
  }
  if (draft.promotedAt) {
    return err("already-promoted", "Already in — that code was promoted earlier.");
  }
  if (draft.expiresAt <= input.now || draft.body === null) {
    return err(
      "expired",
      "That code expired. Their draft is saved on their phone — ask them to resubmit.",
    );
  }
  const event = db.select().from(events).where(eq(events.id, draft.eventId)).get();
  if (!event || event.status !== "open") {
    return err("event-closed", "This event is no longer open — promotion stopped at close.");
  }

  const body = draft.body;
  db.transaction((tx) => {
    insertResponse(tx, {
      promptId: event.promptId,
      eventId: event.id,
      body,
      channel: "site",
      now: input.now,
    });
    tx.update(stagedDrafts)
      .set({ body: null, promotedAt: input.now })
      .where(eq(stagedDrafts.id, draft.id))
      .run();
  });
  return { ok: true };
}
