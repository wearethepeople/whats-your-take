// Card transcription: the host types physical cards in via the batch form.
// Cards need no presence gate — they were physically at the table. Accepted
// while the event is open (lulls) or closed (the post-close pass through the
// card stack); close hard-stops only the digital staging/promotion paths.

import { eq } from "drizzle-orm";
import { events } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { bodySchema } from "./stage.server";
import { insertResponse } from "./write.server";

export type CardEntryError = "not-found" | "event-not-accepting" | "invalid-body";

export type CardEntryResult = { ok: true } | { ok: false; error: CardEntryError; message: string };

export function enterCard(
  db: Db,
  input: { eventId: number; body: unknown; now: Date },
): CardEntryResult {
  const event = db.select().from(events).where(eq(events.id, input.eventId)).get();
  if (!event) {
    return { ok: false, error: "not-found", message: "No such event." };
  }
  if (event.status !== "open" && event.status !== "closed") {
    return {
      ok: false,
      error: "event-not-accepting",
      message: "Cards can only be entered while the event is open or closed.",
    };
  }
  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid-body",
      message: parsed.error.issues[0]?.message ?? "That card can't be used.",
    };
  }
  insertResponse(db, {
    promptId: event.promptId,
    eventId: event.id,
    body: parsed.data,
    channel: "card",
    now: input.now,
  });
  return { ok: true };
}
