import { data, Form, Link } from "react-router";
import type { Route } from "./+types/host.events.$id";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { liveCount } from "~/features/events/services/counts.server";
import {
  eventFormSchema,
  getEvent,
  TRANSITION_SOURCES,
  transitionEvent,
  updateEvent,
  type EventStatus,
} from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { Field } from "~/host/field";
import { HostSection } from "~/host/section";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.event.name ?? "Event"} · What’s Your Take?` }];
}

// datetime-local round-trip for the edit form (server-local time; the
// fields are informational — nothing gates on them).
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const STATUSES: EventStatus[] = ["draft", "scheduled", "open", "closed", "archived"];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireHost(request);
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  return {
    event: {
      ...event,
      startsAtInput: toLocalInput(event.startsAt),
      endsAtInput: toLocalInput(event.endsAt),
    },
    count: liveCount(db, event.id),
    legalTargets: STATUSES.filter((to) => TRANSITION_SOURCES[to].includes(event.status)),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireHost(request);
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const submittedAt = Date.now();

  switch (intent) {
    case "transition": {
      const to = String(form.get("to") ?? "") as EventStatus;
      if (!STATUSES.includes(to)) {
        return { ok: false as const, message: "Unknown status.", submittedAt };
      }
      if (to === "archived" && String(form.get("confirmSlug") ?? "") !== event.slug) {
        return {
          ok: false as const,
          message: "Archiving is one-way. Type the event’s slug to confirm.",
          submittedAt,
        };
      }
      const result = transitionEvent(db, { id: event.id, to, now: new Date() });
      return result.ok
        ? { ok: true as const, message: `Event is now ${to}.`, submittedAt }
        : { ok: false as const, message: result.message, submittedAt };
    }
    case "update": {
      const parsed = eventFormSchema.safeParse({
        slug: String(form.get("slug") ?? ""),
        name: String(form.get("name") ?? ""),
        venue: String(form.get("venue") ?? ""),
        address: String(form.get("address") ?? ""),
        zip: String(form.get("zip") ?? ""),
        city: String(form.get("city") ?? ""),
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
        narrative: String(form.get("narrative") ?? ""),
      });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Check the form.";
        return { ok: false as const, message, submittedAt };
      }
      const result = updateEvent(db, { id: event.id, fields: parsed.data });
      return result.ok
        ? { ok: true as const, message: "Saved.", submittedAt }
        : { ok: false as const, message: result.message, submittedAt };
    }
    default:
      return { ok: false as const, message: "Unknown action.", submittedAt };
  }
}

export default function HostEventDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { event, count, legalTargets } = loaderData;
  return (
    <>
      <h1 className="mt-4 mb-4 text-2xl font-semibold">
        {event.name} <span className={`status-badge status-${event.status}`}>{event.status}</span>
      </h1>

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
        <HostSection title="In the book">
          <p className="live-count">
            <strong>{count.total}</strong> total · {count.byChannel.site} site ·{" "}
            {count.byChannel.kiosk} kiosk · {count.byChannel.card} cards
          </p>
        </HostSection>

        <HostSection title="Run the table">
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              Public form: <code>/e/{event.slug}</code> ·{" "}
              <Link to={`/e/${event.slug}`} className="text-primary underline underline-offset-4">
                open
              </Link>
            </li>
            <li>
              Kiosk URL (add to home screen from here): <code>/e/{event.slug}?kiosk=1</code> ·{" "}
              <Link
                to={`/e/${event.slug}?kiosk=1`}
                className="text-primary underline underline-offset-4"
              >
                open
              </Link>
            </li>
            <li>
              <Link to="/host/promote" className="text-primary underline underline-offset-4">
                Promote (scan or type a code)
              </Link>
            </li>
            <li>
              <Link
                to={`/host/events/${event.id}/cards`}
                className="text-primary underline underline-offset-4"
              >
                Card entry
              </Link>
            </li>
            <li>
              <Link
                to={`/host/events/${event.id}/moderation`}
                className="text-primary underline underline-offset-4"
              >
                Moderation
              </Link>
            </li>
            <li>
              Export:{" "}
              <a
                href={`/host/events/${event.id}/export/csv`}
                className="text-primary underline underline-offset-4"
              >
                CSV
              </a>{" "}
              ·{" "}
              <a
                href={`/host/events/${event.id}/export/json`}
                className="text-primary underline underline-offset-4"
              >
                JSON
              </a>
            </li>
          </ul>
        </HostSection>

        <HostSection title="Status">
          {legalTargets.length === 0 ? (
            <p className="text-muted-foreground">Archived is terminal. This event is done.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              {legalTargets.map((to) =>
                to === "archived" ? (
                  <Form method="post" className="flex items-end gap-2" key={to}>
                    <input type="hidden" name="intent" value="transition" />
                    <input type="hidden" name="to" value={to} />
                    <Field htmlFor="confirmSlug" label="Type the slug to archive (one-way)">
                      <Input id="confirmSlug" name="confirmSlug" autoComplete="off" />
                    </Field>
                    <Button type="submit" variant="destructive">
                      Archive
                    </Button>
                  </Form>
                ) : (
                  <Form method="post" key={to}>
                    <input type="hidden" name="intent" value="transition" />
                    <input type="hidden" name="to" value={to} />
                    <Button type="submit" variant="outline">
                      {to === "open" && event.status === "closed" ? "Reopen" : `Mark ${to}`}
                    </Button>
                  </Form>
                ),
              )}
            </div>
          )}
        </HostSection>

        <HostSection title="Edit">
          <Form method="post" className="flex flex-col items-start gap-3">
            <input type="hidden" name="intent" value="update" />
            <Field htmlFor="name" label="Name">
              <Input id="name" name="name" defaultValue={event.name} required />
            </Field>

            <Field
              htmlFor="slug"
              label={`Slug ${event.status === "draft" ? "" : "(locked once the event leaves draft)"}`}
            >
              <Input
                id="slug"
                name="slug"
                defaultValue={event.slug}
                readOnly={event.status !== "draft"}
                pattern="[a-z0-9][a-z0-9-]*"
                required
              />
            </Field>

            <Field htmlFor="venue" label="Venue (required before the event can open)">
              <Input id="venue" name="venue" defaultValue={event.venue ?? ""} />
            </Field>

            <Field htmlFor="address" label="Address (optional)">
              <Input id="address" name="address" defaultValue={event.address ?? ""} />
            </Field>

            <Field htmlFor="city" label="City">
              <Input id="city" name="city" defaultValue={event.city} required />
            </Field>

            <Field htmlFor="zip" label="ZIP (required before the event can open)">
              <Input id="zip" name="zip" defaultValue={event.zip ?? ""} />
            </Field>

            <Field htmlFor="startsAt" label="Starts">
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                defaultValue={event.startsAtInput}
                required
              />
            </Field>

            <Field htmlFor="endsAt" label="Ends">
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                defaultValue={event.endsAtInput}
                required
              />
            </Field>

            <Field
              htmlFor="narrative"
              label="Narrative (optional: how the day went, for the public event page)"
            >
              <Textarea
                id="narrative"
                name="narrative"
                defaultValue={event.narrative ?? ""}
                rows={5}
              />
            </Field>

            <Button type="submit">Save</Button>
          </Form>
        </HostSection>
      </div>
    </>
  );
}
