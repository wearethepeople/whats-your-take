import { Form } from "react-router";
import type { Route } from "./+types/host.prompts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { db } from "~/db/client.server";
import {
  listPromptsAdmin,
  retirePrompt,
  updatePromptSeasonLabel,
} from "~/features/events/services/lifecycle.server";
import { requireHost } from "~/host/auth.server";
import { Field } from "~/host/field";
import { HostNav } from "~/host/nav";
import { HostSection } from "~/host/section";

export function meta() {
  return [{ title: "Prompts · What's Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireHost(request);
  return { prompts: listPromptsAdmin(db) };
}

export async function action({ request }: Route.ActionArgs) {
  await requireHost(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = Number(form.get("id"));

  if (intent === "retire") {
    const result = retirePrompt(db, id);
    return result.ok
      ? { ok: true as const, message: "Prompt retired. The season is closed." }
      : { ok: false as const, message: result.message };
  }

  if (intent === "label") {
    const seasonLabel = String(form.get("seasonLabel") ?? "").trim() || null;
    const result = updatePromptSeasonLabel(db, id, seasonLabel);
    return result.ok
      ? { ok: true as const, message: "Saved." }
      : { ok: false as const, message: result.message };
  }

  return { ok: false as const, message: "Unknown action." };
}

export default function HostPrompts({ loaderData, actionData }: Route.ComponentProps) {
  const { prompts } = loaderData;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <h1 className="mt-4 mb-4 text-2xl font-semibold">Prompts</h1>

      {actionData ? (
        <p
          className={`banner mb-4 ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}

      <HostSection title="All prompts">
        {prompts.length === 0 ? (
          <p className="text-muted-foreground">No prompts yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium">&ldquo;{prompt.text}&rdquo;</p>
                  <span className={`status-badge ${prompt.retiredAt ? "status-closed" : "status-open"}`}>
                    {prompt.retiredAt ? "retired" : "active"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {prompt.createdAt.toLocaleDateString()}
                  {prompt.retiredAt ? ` · retired ${prompt.retiredAt.toLocaleDateString()}` : ""} ·{" "}
                  {prompt.eventCount} {prompt.eventCount === 1 ? "event" : "events"} ·{" "}
                  {prompt.takeCount} {prompt.takeCount === 1 ? "take" : "takes"}
                  {prompt.dateRangeLabel ? ` · ${prompt.dateRangeLabel}` : ""}
                </p>

                <Form method="post" className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={prompt.id} />
                  <Field htmlFor={`label-${prompt.id}`} label="Season label">
                    <Input
                      id={`label-${prompt.id}`}
                      name="seasonLabel"
                      defaultValue={prompt.seasonLabel ?? ""}
                      placeholder={prompt.resolvedLabel}
                      className="w-40"
                    />
                  </Field>
                  <Button type="submit" size="sm" variant="outline" name="intent" value="label">
                    Save label
                  </Button>
                  {!prompt.retiredAt ? (
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      name="intent"
                      value="retire"
                      formNoValidate
                    >
                      Retire
                    </Button>
                  ) : null}
                </Form>
              </li>
            ))}
          </ul>
        )}
      </HostSection>
    </main>
  );
}
