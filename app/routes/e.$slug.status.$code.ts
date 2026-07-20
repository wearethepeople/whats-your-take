// Resource route for the participant's post-submit poll. Status only —
// never a body, never a count, nothing cacheable (I6: no analytics, no
// mirror; this endpoint exists so a participant learns their own take
// landed, nothing more).

import type { Route } from "./+types/e.$slug.status.$code";
import { db } from "~/db/client.server";
import { draftStatus } from "~/submissions/stage.server";

export async function loader({ params }: Route.LoaderArgs) {
  const status = draftStatus(db, { code: params.code, now: new Date() });
  return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
