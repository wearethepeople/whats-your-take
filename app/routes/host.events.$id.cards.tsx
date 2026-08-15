import { useEffect, useRef } from "react";
import { data, Form, Link } from "react-router";
import type { Route } from "./+types/host.events.$id.cards";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { liveCount } from "~/features/events/services/counts.server";
import { getEvent } from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { Field } from "~/host/field";
import { HostNav } from "~/host/nav";
import { HostSection } from "~/host/section";
import { enterCard } from "~/submissions/card.server";
import { MAX_BODY_LENGTH } from "~/submissions/constants";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Card entry · ${loaderData?.event.name ?? "Event"} · What’s Your Take?` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireHost(request);
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  return {
    event: { id: event.id, name: event.name, venue: event.venue, status: event.status },
    cardCount: liveCount(db, event.id).byChannel.card,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireHost(request);
  const form = await request.formData();
  const result = enterCard(db, {
    eventId: Number(params.id),
    body: form.get("body"),
    now: new Date(),
  });
  const entered = Number(form.get("entered") ?? 0) + (result.ok ? 1 : 0);
  return result.ok
    ? { ok: true as const, message: "In the book. Next card.", entered, submittedAt: Date.now() }
    : { ok: false as const, message: result.message, entered, submittedAt: Date.now() };
}

export default function HostCardEntry({ loaderData, actionData }: Route.ComponentProps) {
  const { event, cardCount } = loaderData;
  const accepting = event.status === "open" || event.status === "closed";
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <h1 className="mt-4 mb-4 text-2xl font-semibold">
        Card entry <span className={`status-badge status-${event.status}`}>{event.status}</span>
      </h1>
      <p className="mb-4 text-muted-foreground">
        Typing into <strong className="text-foreground">{event.name}</strong> at {event.venue}.{" "}
        <Link to={`/host/events/${event.id}`} className="text-primary underline underline-offset-4">
          Event page
        </Link>
        . {cardCount} cards in the book
        {actionData?.entered ? ` · ${actionData.entered} entered this session` : ""}.
      </p>
      {accepting ? (
        <HostSection title="Enter a card">
          <CardForm key={actionData?.submittedAt ?? "initial"} actionData={actionData} />
        </HostSection>
      ) : (
        <p className="banner banner-error">
          Cards can&rsquo;t be entered while the event is {event.status}.
        </p>
      )}
    </main>
  );
}

function CardForm({ actionData }: { actionData: Route.ComponentProps["actionData"] }) {
  const formRef = useRef<HTMLFormElement>(null);

  // Ctrl/Cmd+Enter submits — keeps the transcription flow on the keyboard.
  useEffect(() => {
    function onKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Enter" && (keyEvent.metaKey || keyEvent.ctrlKey)) {
        formRef.current?.requestSubmit();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Form method="post" className="flex flex-col items-start gap-3" ref={formRef}>
      <input type="hidden" name="entered" value={actionData?.entered ?? 0} />
      <Field htmlFor="body" label="Card text (one card per entry; Ctrl/Cmd+Enter to submit)">
        <Textarea id="body" name="body" rows={6} maxLength={MAX_BODY_LENGTH} autoFocus required />
      </Field>
      {actionData ? (
        <p
          className={`banner ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}
      <Button type="submit">Enter card</Button>
    </Form>
  );
}
