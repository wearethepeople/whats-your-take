import { Fragment, useEffect, useState } from "react";
import { data, Form, Link, useFetcher } from "react-router";
import type { Route } from "./+types/host.events.$id.moderation";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { getEvent } from "~/features/events/services/lifecycle.server";
import { Field } from "~/host/field";
import { HostSection } from "~/host/section";
import { MAX_BODY_LENGTH } from "~/submissions/constants";
import {
  approveResponse,
  editCard,
  hideResponse,
  listForModeration,
} from "~/submissions/moderate.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Moderation · ${loaderData?.event.name ?? "Event"} · What’s Your Take?` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  const rows = listForModeration(db, event.id).map((row) => ({
    id: row.id,
    body: row.body,
    channel: row.channel,
    status: row.status,
    nameFlag: row.nameFlag,
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
        : intent === "edit"
          ? editCard(db, responseId, {
              body: form.get("body"),
              nameFlag: form.get("nameFlag") === "on",
            })
          : ({ ok: false, message: "Unknown action." } as const);
  const done = { approve: "Approved.", hide: "Hidden.", edit: "Saved." }[intent];
  return result.ok
    ? { ok: true as const, message: done ?? "Done." }
    : { ok: false as const, message: result.message };
}

type ModerationRow = {
  id: number;
  body: string;
  channel: string;
  nameFlag: boolean;
  createdBucket: string | null;
};

function EditCardForm({ row, onDone }: { row: ModerationRow; onDone: () => void }) {
  const fetcher = useFetcher<typeof action>();
  const saved = fetcher.state === "idle" && fetcher.data?.ok === true;
  useEffect(() => {
    if (saved) onDone();
  }, [saved, onDone]);
  return (
    <fetcher.Form method="post" className="flex flex-col items-start gap-3">
      <input type="hidden" name="intent" value="edit" />
      <input type="hidden" name="responseId" value={row.id} />
      <Field htmlFor={`body-${row.id}`} label="Card text">
        <Textarea
          id={`body-${row.id}`}
          name="body"
          rows={6}
          maxLength={MAX_BODY_LENGTH}
          defaultValue={row.body}
          required
        />
      </Field>
      <label
        htmlFor={`nameFlag-${row.id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <input
          id={`nameFlag-${row.id}`}
          name="nameFlag"
          type="checkbox"
          defaultChecked={row.nameFlag}
          className="size-4"
        />
        Name or identifier was written on card
      </label>
      {fetcher.data && !fetcher.data.ok ? (
        <p className="banner banner-error" role="alert">
          {fetcher.data.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={fetcher.state !== "idle"}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </fetcher.Form>
  );
}

function ResponseList({
  rows,
  actions,
  editable = false,
}: {
  rows: ModerationRow[];
  actions: ("approve" | "hide")[];
  editable?: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  if (rows.length === 0) return <p className="text-muted-foreground">None.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
          {editingId === row.id ? (
            <EditCardForm row={row} onDone={() => setEditingId(null)} />
          ) : (
            <>
              <blockquote className="m-0 border-l-2 border-border py-0 pl-3 whitespace-pre-wrap">
                {row.body}
              </blockquote>
              <p className="mt-1 mb-2 text-sm text-muted-foreground">
                {row.channel}
                {row.createdBucket ? ` · ${row.createdBucket}` : ""}
                {row.nameFlag ? " · name or identifier on card" : ""}
              </p>
              <div className="flex gap-2">
                {actions.map((intent) => (
                  <Fragment key={intent}>
                    {intent === "hide" && editable && row.channel === "card" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(row.id)}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Form method="post">
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
                  </Fragment>
                ))}
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function HostModeration({ loaderData, actionData }: Route.ComponentProps) {
  const { event, pending, approved, hidden } = loaderData;
  return (
    <>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">
        Moderation · {event.name}{" "}
        <span className={`status-badge status-${event.status}`}>{event.status}</span>
      </h1>
      <p className="mb-4">
        <Link to={`/host/events/${event.id}`} className="text-primary underline underline-offset-4">
          Back to the event
        </Link>
      </p>

      {event.status === "open" ? (
        <p className="banner banner-warn mb-4" role="alert">
          This event is still open. The design says the host doesn&rsquo;t read responses mid-event;
          the mirror waits for close. Proceed only if you must.
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
          <ResponseList rows={pending} actions={["approve", "hide"]} editable />
        </HostSection>

        <HostSection title={`Approved (${approved.length})`}>
          <ResponseList rows={approved} actions={["hide"]} editable />
        </HostSection>

        <HostSection title={`Hidden (${hidden.length}): terminal, kept in the archive`}>
          <ResponseList rows={hidden} actions={[]} />
        </HostSection>
      </div>
    </>
  );
}
