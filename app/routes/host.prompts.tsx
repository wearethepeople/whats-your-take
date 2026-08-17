import { Form } from "react-router";
import type { Route } from "./+types/host.prompts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import {
  listPromptsAdmin,
  retirePrompt,
  updatePromptRevealDate,
  updatePromptSeasonLabel,
  updatePromptText,
} from "~/features/events/services/lifecycle.server";
import { formatRevealDate, type RevealDate } from "~/features/events/reveal-date";
import { requireHost } from "~/host/auth.server";
import { Field } from "~/host/field";
import { HostSection } from "~/host/section";

// revealDate is a calendar date, not an instant — read/write its components
// in UTC throughout (see the parse below and formatRevealDate) so the date
// the host typed is the date that renders, regardless of server/viewer TZ.
function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function meta() {
  return [{ title: "Prompts · What’s Your Take?" }];
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

  if (intent === "text") {
    const text = String(form.get("text") ?? "");
    const result = updatePromptText(db, id, text);
    return result.ok
      ? { ok: true as const, message: "Saved." }
      : { ok: false as const, message: result.message };
  }

  if (intent === "label") {
    const seasonLabel = String(form.get("seasonLabel") ?? "").trim() || null;
    const result = updatePromptSeasonLabel(db, id, seasonLabel);
    return result.ok
      ? { ok: true as const, message: "Saved." }
      : { ok: false as const, message: result.message };
  }

  if (intent === "reveal") {
    const dateStr = String(form.get("revealDate") ?? "").trim();
    const monthOnly = form.get("revealMonthOnly") === "on";
    // Blank clears back to "not yet announced" (see
    // updatePromptRevealDate's null-clears contract). Month precision
    // normalizes to the 1st — the day is never rendered anyway (see
    // formatRevealDate).
    let revealDate: RevealDate | null = null;
    if (dateStr) {
      const parsed = new Date(`${dateStr}T00:00:00Z`);
      revealDate = monthOnly
        ? {
            date: new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1)),
            precision: "month",
          }
        : { date: parsed, precision: "day" };
    }
    const result = updatePromptRevealDate(db, id, revealDate);
    return result.ok
      ? { ok: true as const, message: "Saved." }
      : { ok: false as const, message: result.message };
  }

  return { ok: false as const, message: "Unknown action." };
}

export default function HostPrompts({ loaderData, actionData }: Route.ComponentProps) {
  const { prompts } = loaderData;

  return (
    <>
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
                  <span className="text-xs font-medium text-muted-foreground">Prompt text</span>
                  <span
                    className={`status-badge ${prompt.retiredAt ? "status-closed" : "status-open"}`}
                  >
                    {prompt.retiredAt ? "retired" : "active"}
                  </span>
                </div>
                <Form method="post" className="mt-1 flex flex-col items-end gap-2">
                  <input type="hidden" name="id" value={prompt.id} />
                  <Textarea
                    name="text"
                    defaultValue={prompt.text}
                    rows={2}
                    className="font-medium"
                    aria-label="Prompt text"
                  />
                  <Button type="submit" size="sm" variant="outline" name="intent" value="text">
                    Save prompt text
                  </Button>
                </Form>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {prompt.createdAt.toLocaleDateString()}
                  {prompt.retiredAt
                    ? ` · retired ${prompt.retiredAt.toLocaleDateString()}`
                    : ""} ·{" "}
                  {prompt.eventCount} {prompt.eventCount === 1 ? "event" : "events"} ·{" "}
                  {prompt.takeCount} {prompt.takeCount === 1 ? "take" : "takes"}
                  {prompt.dateRangeLabel ? ` · ${prompt.dateRangeLabel}` : ""} · Reveals{" "}
                  {prompt.revealDate ? formatRevealDate(prompt.revealDate) : "date TBD"}
                </p>

                <div className="mt-3 flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
                  <Form
                    method="post"
                    className="flex flex-wrap items-end gap-2 pb-3 sm:flex-1 sm:pb-0 sm:pr-6"
                  >
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

                  <Form
                    method="post"
                    className="flex flex-wrap items-end gap-2 pt-3 sm:flex-1 sm:pt-0 sm:pl-6"
                  >
                    <input type="hidden" name="id" value={prompt.id} />
                    <Field htmlFor={`reveal-${prompt.id}`} label="Reveal date">
                      <Input
                        id={`reveal-${prompt.id}`}
                        name="revealDate"
                        type="date"
                        defaultValue={prompt.revealDate ? toDateInput(prompt.revealDate.date) : ""}
                        className="w-40"
                      />
                    </Field>
                    <label
                      htmlFor={`reveal-month-only-${prompt.id}`}
                      className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      <input
                        id={`reveal-month-only-${prompt.id}`}
                        name="revealMonthOnly"
                        type="checkbox"
                        defaultChecked={prompt.revealDate?.precision === "month"}
                        className="size-4"
                      />
                      Month only
                    </label>
                    <Button type="submit" size="sm" variant="outline" name="intent" value="reveal">
                      Save reveal date
                    </Button>
                  </Form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </HostSection>
    </>
  );
}
