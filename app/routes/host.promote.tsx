import { eq } from "drizzle-orm";
import { useEffect, useRef, useState } from "react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/host.promote";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { db } from "~/db/client.server";
import { events } from "~/db/schema.server";
import { liveCount } from "~/features/events/services/counts.server";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";
import { ScanPanel } from "~/host/scan-panel";
import { HostSection } from "~/host/section";
import { promoteDraft } from "~/submissions/promote.server";

export function meta() {
  return [{ title: "Promote · What’s Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireHost(request);
  // Names and counts only — never response bodies (I6).
  const open = db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.status, "open"))
    .all();
  return {
    openEvents: open.map((event) => ({
      id: event.id,
      name: event.name,
      total: liveCount(db, event.id).total,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireHost(request);
  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  const result = promoteDraft(db, { code, now: new Date() });
  // The code prefixes both outcomes: during a fast run of scans the banner
  // text can change before it's read, so it needs to say which code it's
  // about, not just what happened.
  const prefix = code ? `${code}: ` : "";
  // submittedAt keys the form so the input clears for the next code.
  if (result.ok) {
    return { ok: true as const, message: `${prefix}it’s in the book.`, submittedAt: Date.now() };
  }
  return { ok: false as const, message: `${prefix}${result.message}`, submittedAt: Date.now() };
}

// Auto-dismissing so a fresh banner reads as an event, not a static label —
// remounted (via the Form's key below) on every submit, so the timer always
// restarts clean and a new banner mid-countdown just replaces the old one.
const BANNER_TIMEOUT_MS = 4000;

function PromoteBanner({ ok, message }: { ok: boolean; message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), BANNER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <p className={`banner ${ok ? "banner-ok" : "banner-error"}`} role="status" aria-live="polite">
      {message}
    </p>
  );
}

export default function HostPromote({ loaderData, actionData }: Route.ComponentProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // A scanned code fills the same field a typed one would and submits the
  // same form — promoteDraft() doesn't care where the code came from.
  function handleDecode(code: string) {
    if (codeInputRef.current) codeInputRef.current.value = code;
    formRef.current?.requestSubmit();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <h1 className="mt-4 mb-4 text-2xl font-semibold">Promote a take</h1>
      <p className="mb-4 text-muted-foreground">
        {loaderData.openEvents.length > 0 ? (
          <>
            Open:{" "}
            {loaderData.openEvents.map((event, index) => (
              <span key={event.id}>
                {index > 0 ? " · " : ""}
                <Link
                  to={`/host/events/${event.id}`}
                  className="text-primary underline underline-offset-4"
                >
                  {event.name}
                </Link>{" "}
                · {event.total} in the book
              </span>
            ))}
          </>
        ) : (
          "No event is open right now."
        )}
      </p>
      <HostSection title="Enter or scan a code" className="gap-4">
        <Form
          method="post"
          className="flex flex-col items-start gap-3"
          ref={formRef}
          key={actionData?.submittedAt ?? "initial"}
        >
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor="code">Participant&rsquo;s code</Label>
            <Input
              id="code"
              name="code"
              ref={codeInputRef}
              className="code-input h-auto"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
          </div>
          {actionData ? <PromoteBanner ok={actionData.ok} message={actionData.message} /> : null}
          <Button type="submit">Promote</Button>
        </Form>
        {/* Kept outside the keyed Form above so remounting it on every submit
            (to clear the typed input) doesn't also restart the camera stream. */}
        <ScanPanel onDecode={handleDecode} resetToken={actionData?.submittedAt} />
      </HostSection>
    </main>
  );
}
