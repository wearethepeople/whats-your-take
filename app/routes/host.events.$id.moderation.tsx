import { data, Form, Link } from "react-router";
import type { Route } from "./+types/host.events.$id.moderation";
import { db } from "~/db/client.server";
import { getEvent } from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";
import { approveResponse, hideResponse, listForModeration } from "~/submissions/moderate.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Moderation — ${loaderData?.event.name ?? "Event"} — What's Your Take?` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireHost(request);
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  const rows = listForModeration(db, event.id).map((row) => ({
    id: row.id,
    body: row.body,
    channel: row.channel,
    status: row.status,
    createdBucket: row.createdBucket,
  }));
  return {
    event: { id: event.id, name: event.name, status: event.status },
    pending: rows.filter((row) => row.status === "pending"),
    approved: rows.filter((row) => row.status === "approved"),
    hidden: rows.filter((row) => row.status === "hidden"),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireHost(request);
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const responseId = Number(form.get("responseId"));
  const result =
    intent === "approve"
      ? approveResponse(db, responseId)
      : intent === "hide"
        ? hideResponse(db, responseId)
        : ({ ok: false, message: "Unknown action." } as const);
  return result.ok
    ? { ok: true as const, message: intent === "approve" ? "Approved." : "Hidden." }
    : { ok: false as const, message: result.message };
}

function ResponseList({
  rows,
  actions,
}: {
  rows: { id: number; body: string; channel: string; createdBucket: string }[];
  actions: ("approve" | "hide")[];
}) {
  if (rows.length === 0) return <p>None.</p>;
  return (
    <ul className="moderation-list">
      {rows.map((row) => (
        <li key={row.id}>
          <blockquote>{row.body}</blockquote>
          <p className="event-meta">
            {row.channel} · {row.createdBucket}
          </p>
          {actions.map((intent) => (
            <Form method="post" className="inline-form" key={intent}>
              <input type="hidden" name="intent" value={intent} />
              <input type="hidden" name="responseId" value={row.id} />
              <button type="submit">{intent === "approve" ? "Approve" : "Hide"}</button>
            </Form>
          ))}
        </li>
      ))}
    </ul>
  );
}

export default function HostModeration({ loaderData, actionData }: Route.ComponentProps) {
  const { event, pending, approved, hidden } = loaderData;
  return (
    <main className="container">
      <HostNav />
      <h1>
        Moderation — {event.name}{" "}
        <span className={`status-badge status-${event.status}`}>{event.status}</span>
      </h1>
      <p>
        <Link to={`/host/events/${event.id}`}>Back to the event</Link>
      </p>

      {event.status === "open" ? (
        <p className="banner banner-warn" role="alert">
          This event is still open. The design says the host doesn&rsquo;t read responses mid-event
          — the mirror waits for close. Proceed only if you must.
        </p>
      ) : null}

      {actionData ? (
        <p
          className={`banner ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}

      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending ({pending.length})</h2>
        <ResponseList rows={pending} actions={["approve", "hide"]} />
      </section>

      <section aria-labelledby="approved-heading">
        <h2 id="approved-heading">Approved ({approved.length})</h2>
        <ResponseList rows={approved} actions={["hide"]} />
      </section>

      <section aria-labelledby="hidden-heading">
        <h2 id="hidden-heading">Hidden ({hidden.length}) — terminal, kept in the archive</h2>
        <ResponseList rows={hidden} actions={[]} />
      </section>
    </main>
  );
}
