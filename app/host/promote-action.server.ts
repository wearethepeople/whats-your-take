// The promote form's action, shared by the host console and the volunteer
// screen. `eventId` is set only for a volunteer session and comes from that
// session, never from the form.

import type { Db } from "~/db/types.server";
import { promoteDraft } from "~/submissions/promote.server";

export async function promoteFromRequest(db: Db, request: Request, eventId?: number) {
  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  const result = promoteDraft(db, { code, now: new Date(), eventId });
  // The code prefixes both outcomes: during a fast run of scans the banner
  // text can change before it's read, so it needs to say which code it's
  // about, not just what happened.
  const prefix = code ? `${code}: ` : "";
  // submittedAt keys the form so the input clears for the next code.
  if (result.ok) {
    return { ok: true as const, message: `${prefix}it’s in the book.`, submittedAt: Date.now() };
  }
  return { ok: false as const, message: `${prefix}${result.message}`, submittedAt: Date.now() };
}
