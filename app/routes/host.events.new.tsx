import { Form, redirect } from "react-router";
import type { Route } from "./+types/host.events.new";
import { db } from "~/db/client.server";
import {
  createEvent,
  eventFormSchema,
  listActivePrompts,
} from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";

export function meta() {
  return [{ title: "New event — What's Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireHost(request);
  return { prompts: listActivePrompts(db) };
}

export async function action({ request }: Route.ActionArgs) {
  await requireHost(request);
  const form = await request.formData();
  const values = {
    slug: String(form.get("slug") ?? ""),
    name: String(form.get("name") ?? ""),
    venue: String(form.get("venue") ?? ""),
    address: String(form.get("address") ?? ""),
    zip: String(form.get("zip") ?? ""),
    city: String(form.get("city") ?? ""),
    startsAt: String(form.get("startsAt") ?? ""),
    endsAt: String(form.get("endsAt") ?? ""),
    promptId: String(form.get("promptId") ?? ""),
    newPromptText: String(form.get("newPromptText") ?? ""),
    newPromptSeasonLabel: String(form.get("newPromptSeasonLabel") ?? ""),
  };

  const parsed = eventFormSchema.safeParse(values);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the form.";
    return { error: message, values };
  }

  const result = createEvent(db, {
    fields: parsed.data,
    promptId: values.promptId ? Number(values.promptId) : undefined,
    newPromptText: values.newPromptText || undefined,
    newPromptSeasonLabel: values.newPromptSeasonLabel || undefined,
  });
  if (!result.ok) {
    return { error: result.message, values };
  }
  throw redirect(`/host/events/${result.event.id}`);
}

export default function HostEventsNew({ loaderData, actionData }: Route.ComponentProps) {
  const values = actionData?.values;
  return (
    <main className="container">
      <HostNav />
      <h1>New event</h1>
      <Form method="post" className="stack">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={values?.name} required />

        <label htmlFor="slug">Slug (goes on the printed QR — lowercase, digits, dashes)</label>
        <input
          id="slug"
          name="slug"
          defaultValue={values?.slug}
          pattern="[a-z0-9][a-z0-9-]*"
          required
        />

        <label htmlFor="venue">Venue (optional for now — required before the event can open)</label>
        <input id="venue" name="venue" defaultValue={values?.venue} />

        <label htmlFor="address">Address (optional)</label>
        <input id="address" name="address" defaultValue={values?.address} />

        <label htmlFor="city">City</label>
        <input id="city" name="city" defaultValue={values?.city} required />

        <label htmlFor="zip">ZIP (optional for now — required before the event can open)</label>
        <input id="zip" name="zip" defaultValue={values?.zip} />

        <label htmlFor="startsAt">Starts</label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          defaultValue={values?.startsAt}
          required
        />

        <label htmlFor="endsAt">Ends</label>
        <input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          defaultValue={values?.endsAt}
          required
        />

        <label htmlFor="promptId">Prompt (the season's question)</label>
        <select id="promptId" name="promptId" defaultValue={values?.promptId ?? ""}>
          <option value="">— pick a prompt —</option>
          {loaderData.prompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.text}
            </option>
          ))}
        </select>

        <label htmlFor="newPromptText">…or write a new prompt</label>
        <input id="newPromptText" name="newPromptText" defaultValue={values?.newPromptText} />

        <label htmlFor="newPromptSeasonLabel">
          Season label for the new prompt (optional — e.g. &ldquo;Season One&rdquo;; falls back to
          an ordinal label if left blank)
        </label>
        <input
          id="newPromptSeasonLabel"
          name="newPromptSeasonLabel"
          defaultValue={values?.newPromptSeasonLabel}
        />

        {actionData?.error ? (
          <p className="banner banner-error" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button type="submit">Create event</button>
      </Form>
    </main>
  );
}
