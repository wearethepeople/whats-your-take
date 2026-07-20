// Per-event web app manifest: start_url must carry the event slug and the
// kiosk param, so this can't be a static file. Add-to-home-screen from the
// kiosk URL + Guided Access is the whole device-hardening story — no
// server-side kiosk state exists (spec, kiosk flow).

import { eq } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/e.$slug.manifest";
import { db } from "~/db/client.server";
import { events } from "~/db/schema.server";

export async function loader({ params }: Route.LoaderArgs) {
  const event = db
    .select({ name: events.name, slug: events.slug, status: events.status })
    .from(events)
    .where(eq(events.slug, params.slug))
    .get();
  // Same not-found rule as the form: draft events don't exist publicly.
  if (!event || event.status === "draft") throw data(null, { status: 404 });

  return new Response(
    JSON.stringify({
      name: `What's Your Take? — ${event.name}`,
      short_name: "Your Take",
      start_url: `/e/${event.slug}?kiosk=1`,
      scope: `/e/${event.slug}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-store",
      },
    },
  );
}
