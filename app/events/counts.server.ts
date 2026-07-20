// The live count is the only mid-event mirror (I6). Numbers only: nothing
// here selects body, and staged drafts are never counted — they're
// pre-corpus ephemera whose expiry would make the whiteboard number go down.

import { count, eq } from "drizzle-orm";
import { responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";

export type LiveCount = {
  total: number;
  byChannel: { site: number; kiosk: number; card: number };
};

// All statuses: the whiteboard number is participation volume, and a hidden
// row was still a real participant (I5 — hidden is archive, not deletion).
export function liveCount(db: Db, eventId: number): LiveCount {
  const rows = db
    .select({ channel: responses.channel, n: count() })
    .from(responses)
    .where(eq(responses.eventId, eventId))
    .groupBy(responses.channel)
    .all();
  const byChannel = { site: 0, kiosk: 0, card: 0 };
  for (const row of rows) byChannel[row.channel] = row.n;
  return { total: byChannel.site + byChannel.kiosk + byChannel.card, byChannel };
}
