import { Link } from "react-router";
import type { Route } from "./+types/host.events";
import { db } from "~/db/client.server";
import { liveCount } from "~/features/events/services/counts.server";
import { listEvents } from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";
import { sweepExpired } from "~/submissions/stage.server";

export function meta() {
  return [{ title: "Events — What's Your Take?" }];
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
    <main className="container">
      <HostNav />
      <h1>Events</h1>
      <p>
        <Link to="/host/events/new">New event</Link>
      </p>
      {loaderData.events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <ul className="event-list">
          {loaderData.events.map((event) => (
            <li key={event.id}>
              <Link to={`/host/events/${event.id}`}>{event.name}</Link>{" "}
              <span className={`status-badge status-${event.status}`}>{event.status}</span>
              <br />
              <span className="event-meta">
                {event.venue} · <span style={{ color: "#aaa" }}>/e/{event.slug}</span> ·{" "}
                {event.total} in the book
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
