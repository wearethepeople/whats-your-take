import { data, Form, Link } from "react-router";
import type { Route } from "./+types/host.events.$id";
import { db } from "~/db/client.server";
import { liveCount } from "~/events/counts.server";
import {
  eventFormSchema,
  getEvent,
  TRANSITION_SOURCES,
  transitionEvent,
  updateEvent,
  type EventStatus,
} from "~/events/manage.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.event.name ?? "Event"} — What's Your Take?` }];
}

// datetime-local round-trip for the edit form (server-local time; the
// fields are informational — nothing gates on them).
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const STATUSES: EventStatus[] = ["draft", "open", "closed", "archived"];

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
          message: "Archiving is one-way — type the event's slug to confirm.",
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
    <main className="container">
      <HostNav />
      <h1>
        {event.name} <span className={`status-badge status-${event.status}`}>{event.status}</span>
      </h1>

      {actionData ? (
        <p
          className={`banner ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}

      <section aria-labelledby="count-heading">
        <h2 id="count-heading">In the book</h2>
        <p className="live-count">
          <strong>{count.total}</strong> total · {count.byChannel.site} site ·{" "}
          {count.byChannel.kiosk} kiosk · {count.byChannel.card} cards
        </p>
      </section>

      <section aria-labelledby="table-heading">
        <h2 id="table-heading">Run the table</h2>
        <ul>
          <li>
            Public form: <code>/e/{event.slug}</code> · <Link to={`/e/${event.slug}`}>open</Link>
          </li>
          <li>
            Kiosk URL (add to home screen from here): <code>/e/{event.slug}?kiosk=1</code> ·{" "}
            <Link to={`/e/${event.slug}?kiosk=1`}>open</Link>
          </li>
          <li>
            <Link to={`/host/events/${event.id}/cards`}>Card entry</Link>
          </li>
          <li>
            <Link to={`/host/events/${event.id}/moderation`}>Moderation</Link>
          </li>
          <li>
            Export: <a href={`/host/events/${event.id}/export/csv`}>CSV</a> ·{" "}
            <a href={`/host/events/${event.id}/export/json`}>JSON</a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Status</h2>
        {legalTargets.length === 0 ? (
          <p>Archived is terminal — this event is done.</p>
        ) : (
          legalTargets.map((to) =>
            to === "archived" ? (
              <Form method="post" className="stack" key={to}>
                <input type="hidden" name="intent" value="transition" />
                <input type="hidden" name="to" value={to} />
                <label htmlFor="confirmSlug">Type the slug to archive (one-way)</label>
                <input id="confirmSlug" name="confirmSlug" autoComplete="off" />
                <button type="submit">Archive</button>
              </Form>
            ) : (
              <Form method="post" key={to} className="inline-form">
                <input type="hidden" name="intent" value="transition" />
                <input type="hidden" name="to" value={to} />
                <button type="submit">
                  {to === "open" && event.status === "closed" ? "Reopen" : `Mark ${to}`}
                </button>
              </Form>
            ),
          )
        )}
      </section>

      <section aria-labelledby="edit-heading">
        <h2 id="edit-heading">Edit</h2>
        <Form method="post" className="stack">
          <input type="hidden" name="intent" value="update" />
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={event.name} required />

          <label htmlFor="slug">
            Slug {event.status === "draft" ? "" : "(locked once the event leaves draft)"}
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={event.slug}
            readOnly={event.status !== "draft"}
            pattern="[a-z0-9][a-z0-9-]*"
            required
          />

          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" defaultValue={event.venue} required />

          <label htmlFor="address">Address (optional)</label>
          <input id="address" name="address" defaultValue={event.address ?? ""} />

          <label htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={event.city} required />

          <label htmlFor="zip">ZIP</label>
          <input id="zip" name="zip" defaultValue={event.zip} required />

          <label htmlFor="startsAt">Starts</label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={event.startsAtInput}
            required
          />

          <label htmlFor="endsAt">Ends</label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={event.endsAtInput}
            required
          />

          <button type="submit">Save</button>
        </Form>
      </section>
    </main>
  );
}
