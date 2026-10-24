import { eq } from "drizzle-orm";
import { Link } from "react-router";
import type { Route } from "./+types/host.promote";
import { db } from "~/db/client.server";
import { events } from "~/db/schema.server";
import { liveCount } from "~/features/events/services/counts.server";
import { promoteFromRequest } from "~/host/promote-action.server";
import { PromoteForm } from "~/host/promote-form";

export function meta() {
  return [{ title: "Promote · What’s Your Take?" }];
}

export async function loader() {
  // Names and counts only — never response bodies (I6).
  const open = db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.status, "open"))
    .all();
  return {
    openEvents: open.map((event) => ({
      id: event.id,
      name: event.name,
      total: liveCount(db, event.id).total,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  return promoteFromRequest(db, request);
}

export default function HostPromote({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <>
      <h1 className="mt-4 mb-4 text-2xl font-semibold">Promote a take</h1>
      <p className="mb-4 text-muted-foreground">
        {loaderData.openEvents.length > 0 ? (
          <>
            Open:{" "}
            {loaderData.openEvents.map((event, index) => (
              <span key={event.id}>
                {index > 0 ? " · " : ""}
                <Link
                  to={`/host/events/${event.id}`}
                  className="text-primary underline underline-offset-4"
                >
                  {event.name}
                </Link>{" "}
                · {event.total} in the book
              </span>
            ))}
          </>
        ) : (
          "No event is open right now."
        )}
      </p>
      <PromoteForm actionData={actionData} />
    </>
  );
}
