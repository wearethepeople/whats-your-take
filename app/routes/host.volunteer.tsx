import { eq } from "drizzle-orm";
import type { Route } from "./+types/host.volunteer";
import { db } from "~/db/client.server";
import { events } from "~/db/schema.server";
import { liveCount } from "~/features/events/services/counts.server";
import { requireVolunteer } from "~/host/auth.server";
import { promoteFromRequest } from "~/host/promote-action.server";
import { PromoteForm } from "~/host/promote-form";

export function meta() {
  return [{ title: "Promote · What’s Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { eventId } = await requireVolunteer(request, db);
  // Name, status and count only — never response bodies (I6).
  const event = db
    .select({ name: events.name, status: events.status })
    .from(events)
    .where(eq(events.id, eventId))
    .get();
  if (!event) throw new Response("Not found", { status: 404 });
  return { name: event.name, open: event.status === "open", total: liveCount(db, eventId).total };
}

export async function action({ request }: Route.ActionArgs) {
  const { eventId } = await requireVolunteer(request, db);
  return promoteFromRequest(db, request, eventId);
}

export default function VolunteerPromote({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">Promote a take</h1>
      <p className="mb-4 text-muted-foreground">
        {loaderData.name} · {loaderData.total} in the book
        {loaderData.open ? "" : " · not open yet"}
      </p>
      <PromoteForm actionData={actionData} />
    </>
  );
}
