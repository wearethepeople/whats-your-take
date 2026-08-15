import { Link } from "react-router";
import type { Route } from "./+types/host.events";
import { db } from "~/db/client.server";
import { liveCount } from "~/features/events/services/counts.server";
import { listEvents } from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";
import { HostSection } from "~/host/section";
import { sweepExpired } from "~/submissions/stage.server";

export function meta() {
  return [{ title: "Events · What’s Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireHost(request);
  // The dashboard is visited all day — a free moment to clear expired
  // staged drafts (post-promotion code stubs included).
  sweepExpired(db, new Date());
  const rows = listEvents(db).map((event) => ({
    id: event.id,
    slug: event.slug,
    name: event.name,
    venue: event.venue,
    status: event.status,
    total: liveCount(db, event.id).total,
  }));
  return { events: rows };
}

export default function HostEvents({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <div className="mt-4 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link to="/host/events/new" className="text-sm text-primary underline underline-offset-4">
          New event
        </Link>
      </div>
      <HostSection title="All events">
        {loaderData.events.length === 0 ? (
          <p className="text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {loaderData.events.map((event) => (
              <li key={event.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <Link
                  to={`/host/events/${event.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  {event.name}
                </Link>{" "}
                <span className={`status-badge status-${event.status}`}>{event.status}</span>
                <br />
                <span className="text-sm text-muted-foreground">
                  {event.venue} · /e/{event.slug} · {event.total} in the book
                </span>
              </li>
            ))}
          </ul>
        )}
      </HostSection>
    </main>
  );
}
