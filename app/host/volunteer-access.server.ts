// Which ONE event the promote-only volunteer password may work for. The epoch
// is bumped on every write, so a volunteer session minted before the change
// stops matching (see auth.server.ts). Volunteer sessions carry no identity —
// this is a capability switch, not an account (I1).

import { eq, sql } from "drizzle-orm";
import { events, hostSettings } from "~/db/schema.server";
import type { Db } from "~/db/types.server";

export type VolunteerAccess = { eventId: number | null; epoch: number };

export type SetVolunteerEventResult = { ok: true } | { ok: false; message: string };

// No row means no access; epoch 0 is never issued to a session.
export function getVolunteerAccess(db: Db): VolunteerAccess {
  const row = db.select().from(hostSettings).where(eq(hostSettings.id, 1)).get();
  return { eventId: row?.volunteerEventId ?? null, epoch: row?.volunteerEpoch ?? 0 };
}

// Only events that are, or are about to be, open make sense to staff.
export function setVolunteerEvent(db: Db, eventId: number | null): SetVolunteerEventResult {
  if (eventId !== null) {
    const event = db.select().from(events).where(eq(events.id, eventId)).get();
    if (!event) return { ok: false, message: "That event doesn’t exist." };
    if (event.status !== "scheduled" && event.status !== "open") {
      return { ok: false, message: "Volunteers can only be allowed on a scheduled or open event." };
    }
  }
  db.insert(hostSettings)
    .values({ id: 1, volunteerEventId: eventId, volunteerEpoch: 1 })
    .onConflictDoUpdate({
      target: hostSettings.id,
      set: {
        volunteerEventId: eventId,
        volunteerEpoch: sql`${hostSettings.volunteerEpoch} + 1`,
      },
    })
    .run();
  return { ok: true };
}

// Ends every volunteer session without changing the selected event.
export function revokeVolunteerSessions(db: Db): void {
  db.insert(hostSettings)
    .values({ id: 1, volunteerEventId: null, volunteerEpoch: 1 })
    .onConflictDoUpdate({
      target: hostSettings.id,
      set: { volunteerEpoch: sql`${hostSettings.volunteerEpoch} + 1` },
    })
    .run();
}
