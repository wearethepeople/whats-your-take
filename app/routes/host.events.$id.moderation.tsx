import { data, Form, Link } from "react-router";
import type { Route } from "./+types/host.events.$id.moderation";
import { Button } from "~/components/ui/button";
import { db } from "~/db/client.server";
import { getEvent } from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";
import { HostSection } from "~/host/section";
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
  if (rows.length === 0) return <p className="text-muted-foreground">None.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
          <blockquote className="m-0 border-l-2 border-border py-0 pl-3 whitespace-pre-wrap">
            {row.body}
          </blockquote>
          <p className="mt-1 mb-2 text-sm text-muted-foreground">
            {row.channel} · {row.createdBucket}
          </p>
          <div className="flex gap-2">
            {actions.map((intent) => (
              <Form method="post" key={intent}>
                <input type="hidden" name="intent" value={intent} />
                <input type="hidden" name="responseId" value={row.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant={intent === "hide" ? "destructive" : "outline"}
                >
                  {intent === "approve" ? "Approve" : "Hide"}
                </Button>
              </Form>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function HostModeration({ loaderData, actionData }: Route.ComponentProps) {
  const { event, pending, approved, hidden } = loaderData;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <h1 className="mt-4 mb-2 text-2xl font-semibold">
        Moderation — {event.name}{" "}
        <span className={`status-badge status-${event.status}`}>{event.status}</span>
      </h1>
      <p className="mb-4">
        <Link to={`/host/events/${event.id}`} className="text-primary underline underline-offset-4">
          Back to the event
        </Link>
      </p>

      {event.status === "open" ? (
        <p className="banner banner-warn mb-4" role="alert">
          This event is still open. The design says the host doesn&rsquo;t read responses mid-event
          — the mirror waits for close. Proceed only if you must.
        </p>
      ) : null}

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
        <HostSection title={`Pending (${pending.length})`}>
          <ResponseList rows={pending} actions={["approve", "hide"]} />
        </HostSection>

        <HostSection title={`Approved (${approved.length})`}>
          <ResponseList rows={approved} actions={["hide"]} />
        </HostSection>

        <HostSection title={`Hidden (${hidden.length}) — terminal, kept in the archive`}>
          <ResponseList rows={hidden} actions={[]} />
        </HostSection>
      </div>
    </main>
  );
}
