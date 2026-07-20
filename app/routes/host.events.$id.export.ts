// Host-only export resource route: /host/events/:id/export.csv|.json.
// Host-only is not publication — the public corpus page (post-close only)
// is slice 5; this download exists so review and synthesis can start.

import { data } from "react-router";
import type { Route } from "./+types/host.events.$id.export";
import { db } from "~/db/client.server";
import { getEvent } from "~/events/manage.server";
import { requireHost } from "~/host/auth.server";
import { exportRows, toCsv, toJson } from "~/submissions/export.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireHost(request);
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  const format = params.format;
  if (format !== "csv" && format !== "json") throw data(null, { status: 404 });

  const rows = exportRows(db, event.id);
  const body = format === "csv" ? toCsv(rows) : toJson(rows);
  return new Response(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json",
      "Content-Disposition": `attachment; filename="${event.slug}-corpus.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
