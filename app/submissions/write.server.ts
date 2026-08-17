// I4 choke point — the only place in the app that inserts into `responses`.
// Timestamps are produced exclusively by the time helpers: created_at is
// hour-truncated, created_bucket is the only granularity a public surface
// ever sees. Do not insert responses anywhere else.
//
// created_bucket is derived from `now`, which is the moment of THIS insert —
// meaningful for kiosk/site (submission IS the moment), but not for card:
// a card's insert happens whenever the host gets around to transcribing it,
// which can be hours after the participant wrote it at the table. So card
// rows get no bucket rather than a fabricated one (see card.server.ts).

import { responses } from "~/db/schema.server";
import { bucketFor, truncateToHour } from "~/db/time.server";
import type { DbOrTx } from "~/db/types.server";

export function insertResponse(
  db: DbOrTx,
  input: {
    promptId: number;
    eventId: number;
    body: string;
    channel: "kiosk" | "site" | "card";
    now: Date;
  },
) {
  return db
    .insert(responses)
    .values({
      promptId: input.promptId,
      eventId: input.eventId,
      body: input.body,
      channel: input.channel,
      createdAt: truncateToHour(input.now),
      createdBucket: input.channel === "card" ? null : bucketFor(input.now),
    })
    .returning()
    .get();
}
