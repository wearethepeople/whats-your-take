// I4 choke point — the only place in the app that inserts into `responses`.
// Timestamps are produced exclusively by the time helpers: created_at is
// hour-truncated, created_bucket is the only granularity a public surface
// ever sees. Do not insert responses anywhere else.

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
      createdBucket: bucketFor(input.now),
    })
    .returning()
    .get();
}
