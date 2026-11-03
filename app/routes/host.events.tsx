import { Link } from "react-router";
import type { Route } from "./+types/host.events";
import { db } from "~/db/client.server";
import { liveCount } from "~/features/events/services/counts.server";
import { listEvents, splitEventsByTime } from "~/features/events/services/lifecycle.server";
import { HostSection } from "~/host/section";
import { sweepExpired } from "~/submissions/stage.server";

export function meta() {
  return [{ title: "Events · What’s Your Take?" }];
}

export async function loader() {
  // The dashboard is visited all day — a free moment to clear expired
  // staged drafts (post-promotion code stubs included).
  sweepExpired(db, new Date());
  // Formatted here, not in the component, so server and client can't
  // disagree on timezone during hydration.
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const { upcoming, past } = splitEventsByTime(listEvents(db));
  const toRow = (event: ReturnType<typeof listEvents>[number]) => ({
    id: event.id,
    slug: event.slug,
    name: event.name,
    venue: event.venue,
    status: event.status,
    dateLabel: dateFormat.format(event.startsAt),
    total: liveCount(db, event.id).total,
  });
  return { upcoming: upcoming.map(toRow), past: past.map(toRow) };
}

type EventListRow = Route.ComponentProps["loaderData"]["upcoming"][number];

export default function HostEvents({ loaderData }: Route.ComponentProps) {
  const { upcoming, past } = loaderData;
  return (
    <>
      <div className="mt-4 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link to="/host/events/new" className="text-sm text-primary underline underline-offset-4">
          New event
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <HostSection title="Upcoming">
          <EventList events={upcoming} empty="Nothing upcoming." />
        </HostSection>
        <HostSection title="Past">
          <EventList events={past} empty="No past events yet." />
        </HostSection>
      </div>
    </>
  );
}

function EventList({ events, empty }: { events: EventListRow[]; empty: string }) {
  if (events.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
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
            {event.dateLabel} · {event.venue} · /e/{event.slug} · {event.total} in the book
          </span>
        </li>
      ))}
    </ul>
  );
}
