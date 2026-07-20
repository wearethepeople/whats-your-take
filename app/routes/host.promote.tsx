import { eq } from "drizzle-orm";
import { Form } from "react-router";
import type { Route } from "./+types/host.promote";
import { db } from "~/db/client.server";
import { events } from "~/db/schema.server";
import { requireHost } from "~/host/auth.server";
import { promoteDraft } from "~/submissions/promote.server";

export function meta() {
  return [{ title: "Promote — What's Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireHost(request);
  // Names only — no responses, no live count here (count arrives in slice 3).
  const open = db.select({ name: events.name }).from(events).where(eq(events.status, "open")).all();
  return { openEventNames: open.map((event) => event.name) };
}

export async function action({ request }: Route.ActionArgs) {
  await requireHost(request);
  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  const result = promoteDraft(db, { code, now: new Date() });
  // submittedAt keys the form so the input clears for the next code.
  if (result.ok) {
    return { ok: true as const, message: "Promoted — it's in the book.", submittedAt: Date.now() };
  }
  return { ok: false as const, message: result.message, submittedAt: Date.now() };
}

export default function HostPromote({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>Promote a take</h1>
      <p>
        {loaderData.openEventNames.length > 0
          ? `Open: ${loaderData.openEventNames.join(" · ")}`
          : "No event is open right now."}
      </p>
      <Form method="post" className="stack" key={actionData?.submittedAt ?? "initial"}>
        <label htmlFor="code">Participant&rsquo;s code</label>
        <input
          id="code"
          name="code"
          className="code-input"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="off"
          autoFocus
        />
        {actionData ? (
          <p
            className={`banner ${actionData.ok ? "banner-ok" : "banner-error"}`}
            role="status"
            aria-live="polite"
          >
            {actionData.message}
          </p>
        ) : null}
        <button type="submit">Promote</button>
      </Form>
    </main>
  );
}
