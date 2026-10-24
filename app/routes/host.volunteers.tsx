import { eq, inArray } from "drizzle-orm";
import { Form } from "react-router";
import type { Route } from "./+types/host.volunteers";
import { Button } from "~/components/ui/button";
import { db } from "~/db/client.server";
import { events } from "~/db/schema.server";
import { volunteerPassword } from "~/host/env.server";
import { Field, selectClassName } from "~/host/field";
import { HostSection } from "~/host/section";
import {
  getVolunteerAccess,
  revokeVolunteerSessions,
  setVolunteerEvent,
} from "~/host/volunteer-access.server";

export function meta() {
  return [{ title: "Volunteers · What’s Your Take?" }];
}

export async function loader() {
  const { eventId } = getVolunteerAccess(db);
  const current =
    eventId === null
      ? null
      : (db
          .select({ id: events.id, name: events.name, status: events.status })
          .from(events)
          .where(eq(events.id, eventId))
          .get() ?? null);
  const choices = db
    .select({ id: events.id, name: events.name, status: events.status })
    .from(events)
    .where(inArray(events.status, ["scheduled", "open"]))
    .orderBy(events.startsAt)
    .all();
  // Whether the secret is set — never its value.
  return { configured: volunteerPassword() !== null, current, choices };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "allow") {
    const result = setVolunteerEvent(db, Number(form.get("eventId")));
    return result.ok
      ? { ok: true as const, message: "Saved. Volunteers were signed out." }
      : { ok: false as const, message: result.message };
  }
  if (intent === "off") {
    setVolunteerEvent(db, null);
    return { ok: true as const, message: "Volunteer access is off." };
  }
  if (intent === "revoke") {
    revokeVolunteerSessions(db);
    return { ok: true as const, message: "Volunteers were signed out." };
  }
  return { ok: false as const, message: "Unknown action." };
}

export default function HostVolunteers({ loaderData, actionData }: Route.ComponentProps) {
  const { configured, current, choices } = loaderData;
  return (
    <>
      <h1 className="mt-4 mb-4 text-2xl font-semibold">Volunteers</h1>
      <p className="mb-4 text-muted-foreground">
        The volunteer password can promote takes for one event, and nothing else. Changing or
        turning off the event signs volunteers out.
      </p>
      {actionData ? (
        <p
          className={`banner mb-4 ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        <HostSection title="Status">
          {configured ? null : (
            <p className="banner banner-error">
              No volunteer password is set (VOLUNTEER_PASSWORD), so volunteers can’t sign in.
            </p>
          )}
          <p>
            {current
              ? `Allowed on: ${current.name} (${current.status})`
              : "Volunteer access is off."}
          </p>
        </HostSection>
        <HostSection title="Allow volunteers on an event">
          <Form method="post" className="flex flex-col items-start gap-3">
            <input type="hidden" name="intent" value="allow" />
            <Field htmlFor="eventId" label="Event">
              <select
                id="eventId"
                name="eventId"
                className={selectClassName}
                defaultValue={current?.id ?? ""}
                required
              >
                <option value="" disabled>
                  Choose an event
                </option>
                {choices.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.status})
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit">Allow</Button>
          </Form>
        </HostSection>
        <HostSection title="Turn off">
          <div className="flex flex-wrap gap-3">
            <Form method="post">
              <input type="hidden" name="intent" value="revoke" />
              <Button type="submit" variant="outline">
                Sign out volunteers
              </Button>
            </Form>
            <Form method="post">
              <input type="hidden" name="intent" value="off" />
              <Button type="submit" variant="outline" disabled={!current}>
                Turn off volunteer access
              </Button>
            </Form>
          </div>
        </HostSection>
      </div>
    </>
  );
}
