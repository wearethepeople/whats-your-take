import { Form, redirect } from "react-router";
import type { Route } from "./+types/host.events.new";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { db } from "~/db/client.server";
import {
  createEvent,
  eventFormSchema,
  listActivePrompts,
} from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { Field, selectClassName } from "~/host/field";
import { HostNav } from "~/host/nav";
import { HostSection } from "~/host/section";

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
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <h1 className="mt-4 mb-4 text-2xl font-semibold">New event</h1>
      <HostSection title="Details">
        <Form method="post" className="flex flex-col items-start gap-3">
          <Field htmlFor="name" label="Name">
            <Input id="name" name="name" defaultValue={values?.name} required />
          </Field>

          <Field htmlFor="slug" label="Slug (goes on the printed QR — lowercase, digits, dashes)">
            <Input
              id="slug"
              name="slug"
              defaultValue={values?.slug}
              pattern="[a-z0-9][a-z0-9-]*"
              required
            />
          </Field>

          <Field
            htmlFor="venue"
            label="Venue (optional for now — required before the event can open)"
          >
            <Input id="venue" name="venue" defaultValue={values?.venue} />
          </Field>

          <Field htmlFor="address" label="Address (optional)">
            <Input id="address" name="address" defaultValue={values?.address} />
          </Field>

          <Field htmlFor="city" label="City">
            <Input id="city" name="city" defaultValue={values?.city} required />
          </Field>

          <Field htmlFor="zip" label="ZIP (optional for now — required before the event can open)">
            <Input id="zip" name="zip" defaultValue={values?.zip} />
          </Field>

          <Field htmlFor="startsAt" label="Starts">
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={values?.startsAt}
              required
            />
          </Field>

          <Field htmlFor="endsAt" label="Ends">
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={values?.endsAt}
              required
            />
          </Field>

          <Field htmlFor="promptId" label="Prompt (the season's question)">
            <select
              id="promptId"
              name="promptId"
              defaultValue={values?.promptId ?? ""}
              className={selectClassName}
            >
              <option value="">— pick a prompt —</option>
              {loaderData.prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.text}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor="newPromptText" label="…or write a new prompt">
            <Input id="newPromptText" name="newPromptText" defaultValue={values?.newPromptText} />
          </Field>

          <Field
            htmlFor="newPromptSeasonLabel"
            label={
              'Season label for the new prompt (optional — e.g. "Season One"; falls back to an ordinal label if left blank)'
            }
          >
            <Input
              id="newPromptSeasonLabel"
              name="newPromptSeasonLabel"
              defaultValue={values?.newPromptSeasonLabel}
            />
          </Field>

          {actionData?.error ? (
            <p className="banner banner-error" role="alert">
              {actionData.error}
            </p>
          ) : null}
          <Button type="submit">Create event</Button>
        </Form>
      </HostSection>
    </main>
  );
}
