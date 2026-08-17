// Public photo-serving resource route: streams event photos out of the
// (private) Tigris bucket. Bucket stays private rather than public-read —
// it also holds the Litestream SQLite replica, and this route is the one
// choke point that can guarantee only event-photo keys are ever served.

import { data } from "react-router";
import type { Route } from "./+types/photos.$";
import { EVENT_PHOTOS_PREFIX, getPhoto } from "~/photos/storage.server";

export async function loader({ params }: Route.LoaderArgs) {
  const key = EVENT_PHOTOS_PREFIX + (params["*"] ?? "");
  // Defense-in-depth: this route may only ever serve event-photo keys,
  // regardless of what params["*"] contains — never sqlite.db or anything
  // else in the bucket.
  if (!key.startsWith(EVENT_PHOTOS_PREFIX)) throw data(null, { status: 404 });

  const photo = await getPhoto(key);
  if (!photo) throw data(null, { status: 404 });

  return new Response(new Uint8Array(photo.body), {
    headers: {
      "Content-Type": photo.contentType,
      // Keys are immutable — a re-upload is always a new key, never an
      // in-place overwrite — so this is safe to cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Blocks the common hotlinking case (another origin embedding this
      // URL directly) in browsers that honor CORP; does nothing against
      // scripted/bot fetching, which is an accepted risk at this app's
      // scale (see docs/spec.md's EventPhoto entry).
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
