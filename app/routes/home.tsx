import { useEffect } from "react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/home";
import { db } from "~/db/client.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import {
  CircledStep,
  GoldUnderline,
  ledgerStatusMeta,
  Stamp,
  offsetShadow,
} from "~/components/visual-grammar";
import { formatRevealDate } from "~/features/events/reveal-date";
import { closedSeasonView, seasonView } from "~/features/events/services/season.server";
import { checkRateLimit, getClientIp } from "~/newsletter/rate-limit.server";
import { newsletterFormSchema } from "~/newsletter/schema";
import { subscribe } from "~/newsletter/subscribe.server";

export function meta() {
  return [
    { title: "What’s Your Take?" },
    {
      name: "description",
      content:
        "A pop-up civic guestbook from We (ARE) the People. One question, answered anonymously, shared publicly.",
    },
  ];
}

export async function loader() {
  // Live season takes priority; if none is active, fall back to the most
  // recently closed one so the homepage can say "this season closed" —
  // not, falsely, "on its way" — until the next prompt starts (see
  // docs/spec.md "In-between-seasons state").
  const live = seasonView(db);
  const view = live ?? closedSeasonView(db);
  const sealed = !live && view != null;
  return { view, sealed };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();

  // Honeypot: a real visitor never fills this in (off tab order, visually
  // hidden). A non-empty value gets the same success response as a real
  // submission — indistinguishable to whatever filled it in — without
  // calling Emma.
  if (String(form.get("company") ?? "").trim() !== "") {
    return { ok: true as const };
  }

  if (!checkRateLimit(getClientIp(request))) {
    return {
      ok: false as const,
      error: "That’s a lot of signups at once. Try again in a few minutes.",
    };
  }

  const parsed = newsletterFormSchema.safeParse({
    email: String(form.get("email") ?? ""),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the email address.";
    return { ok: false as const, error: message };
  }

  try {
    await subscribe(parsed.data.email);
  } catch {
    return {
      ok: false as const,
      error: "Couldn’t sign you up right now. Try again in a bit.",
    };
  }

  return { ok: true as const };
}

// Prompts are host-authored free text — there's no reliable way to detect
// a "last clause" to underline generically, so this underlines just the
// final word as a lighter-touch echo of the design's headline treatment.
function PromptHeadline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return (
    <h1 className="font-serif text-4xl leading-tight font-semibold text-balance sm:text-5xl">
      {words.join(" ")} {last ? <GoldUnderline>{last}</GoldUnderline> : null}
    </h1>
  );
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const { view, sealed } = loaderData;
  const reveal = view?.season.revealDate ?? null;
  const revealDateLabel = reveal ? formatRevealDate(reveal) : null;
  const daysToReveal = reveal ? daysUntil(reveal.date) : null;
  const subscribed = actionData?.ok === true;
  const nextStop = view?.ledger.find((event) => event.status === "up-next");

  // The form is well below the fold — after a successful subscribe, bring
  // the confirmation into view rather than leaving the visitor to guess
  // whether anything happened.
  useEffect(() => {
    if (subscribed) {
      document.getElementById("newsletter-success")?.scrollIntoView({ block: "center" });
    }
  }, [subscribed]);

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      {nextStop ? (
        <div className="bg-primary px-4 py-2 text-center text-[13px] font-bold text-primary-foreground">
          Next stop: {nextStop.name}, {nextStop.city} · {nextStop.dateLabel}
        </div>
      ) : null}

      <SiteHeader active="question" />

      <main className="flex-1">
        <section
          id="question"
          className="grid gap-10 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:grid-cols-[1fr_300px] sm:px-14 sm:py-16"
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-tan">
              A pop-up civic guestbook · One table. One question. No sides to join.
            </p>
            {view ? (
              <PromptHeadline text={view.season.promptText} />
            ) : (
              <h1 className="font-serif text-4xl font-semibold">
                A pop-up civic guestbook is on its way.
              </h1>
            )}
            <p className="max-w-prose text-[17.5px] text-muted-foreground">
              {sealed ? (
                <>
                  That season&rsquo;s table has finished its tour of festivals and markets. Every
                  take is sealed, anonymous and unedited, until the whole record opens together.
                </>
              ) : (
                <>
                  All through America&rsquo;s 250th year, a shaded table travels to festivals and
                  markets. People stop for two minutes and answer in their own words: anonymous,
                  unpolled, unedited.
                </>
              )}
            </p>
            <p className="max-w-prose text-[15px] text-muted-foreground">
              You can&rsquo;t answer from here. The table only happens in person, one place at a
              time. Nothing is published or shared until the whole record opens at once
              {revealDateLabel ? (
                <>
                  : <span className="bg-accent px-0.5 font-semibold">{revealDateLabel}</span>
                </>
              ) : (
                ", on a date to be announced"
              )}
              .
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Button
                render={<Link to="/find-the-table" />}
                nativeButton={false}
                className={offsetShadow}
              >
                Where the table goes next
              </Button>
              <a href="#how-it-works" className="text-sm underline underline-offset-4">
                How the table works
              </a>
            </div>
          </div>

          {view ? (
            <div className="relative h-fit border-[1.5px] border-foreground bg-card p-5">
              <Stamp className="absolute -top-3 right-4 bg-primary text-primary-foreground">
                {view.season.label}
              </Stamp>
              <p className="mb-3 text-sm font-semibold text-primary">
                {sealed ? "The season, sealed" : "The record so far"}
              </p>
              <dl className="flex flex-col">
                <StatRow label="Stops so far" value={String(view.stats.stopCount)} />
                <StatRow
                  label="Takes recorded"
                  value={String(view.stats.totalTakes)}
                  note={view.stats.ingestionPending ? "In process" : undefined}
                />
                <StatRow label="Towns" value={String(view.stats.townCount)} />
                {daysToReveal != null ? (
                  <StatRow label="Days to the reveal" value={String(daysToReveal)} highlight />
                ) : null}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                No names, no accounts. One scan at the table is the whole system. The record stays
                sealed until it opens all at once.
              </p>
              {view.stats.ingestionPending ? (
                <p className="mt-3 border border-border bg-muted p-2 text-xs text-muted-tan">
                  &ldquo;In process&rdquo; means a table has closed and physical are being
                  transcribed.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section
          id="how-it-works"
          className="grid gap-10 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:grid-cols-[7fr_5fr] sm:divide-x sm:divide-dashed sm:divide-(--color-dashed) sm:px-14"
        >
          <div className="flex flex-col gap-4 sm:pr-10">
            <p className="text-sm text-muted-tan">The reveal</p>
            <h2 className="font-serif text-3xl font-semibold">
              One year of answers, opened <GoldUnderline>all at once.</GoldUnderline>
            </h2>
            <p className="max-w-prose text-muted-foreground">
              {revealDateLabel ? <>On {revealDateLabel}, the</> : "The"} sealed record opens at a
              public premiere: every take from every stop, read together for the first time. Until
              then the guestbook stays closed: what you write today carries the same weight as
              everything written before it.
            </p>
            <p className="font-mono text-sm text-primary">
              {revealDateLabel ? <>{revealDateLabel.toUpperCase()} </> : null}
              <span className="font-sans font-normal text-muted-foreground">
                premiere details as the season closes
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-5 sm:pl-10">
            <p className="text-sm text-muted-tan">How it works</p>
            <ol className="flex flex-col gap-4">
              <Step n={1}>
                Find the canopy. Nothing to sign up for, nothing to buy. Watching counts too.
              </Step>
              <Step n={2}>
                Write your take: card and marker, keyboard at the table, or your own phone. No name,
                ever.
              </Step>
              <Step n={3}>
                Your host scans it into the day&rsquo;s record: proof a real person was really here.
              </Step>
            </ol>
          </div>
        </section>

        {view && view.ledger.length > 0 ? (
          <section className="px-6 py-14 sm:px-14">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm text-muted-tan">
                {sealed ? "Where the table went" : "The season so far, and where it’s going"}
              </h2>
              <Link to="/events" className="text-sm underline underline-offset-4">
                All stops
              </Link>
            </div>
            <div className="flex flex-col">
              {view.ledger.map((event) => (
                <LedgerRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 bg-secondary px-6 py-12 sm:grid-cols-2 sm:px-14">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Hear where it&rsquo;s headed</h2>
            <p className="mt-2 max-w-prose text-muted-foreground">
              An occasional letter from We (ARE) the People: where the table goes next, and what the
              country has been writing. Easy to leave.
            </p>
          </div>
          <div>
            {subscribed ? (
              <p className="text-sm font-semibold" id="newsletter-success">
                You&rsquo;re on the list. Thanks.
              </p>
            ) : (
              <>
                <Form method="post" className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    required
                    className="bg-card"
                    suppressHydrationWarning
                  />

                  {/* Honeypot — real visitors never see or fill this in. */}
                  <div className="visually-hidden" aria-hidden="true">
                    <label htmlFor="newsletter-company">Company</label>
                    <input
                      id="newsletter-company"
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <Button type="submit">Stay engaged</Button>
                </Form>
                {actionData && !actionData.ok ? (
                  <p className="banner banner-error mt-2" role="alert">
                    {actionData.error}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Your email is for the letter and nothing else. It never connects to what anyone
                  wrote.
                </p>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight = false,
  note,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-(--color-dashed) py-2 last:border-0">
      <span className="flex flex-col justify-center leading-tight">
        <span className="text-sm text-muted-foreground">{label}</span>
        {note ? (
          <span className="flex items-center gap-1 text-[10px] leading-none text-muted-tan">
            <span className="size-1 rounded-full bg-accent" aria-hidden="true" />
            {note}
          </span>
        ) : null}
      </span>
      <span className={`font-serif text-2xl ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CircledStep n={n} />
      <p className="text-muted-foreground">{children}</p>
    </li>
  );
}

function LedgerRow({
  event,
}: {
  event: {
    id: number;
    publicSlug: string;
    name: string;
    city: string;
    dateLabel: string;
    takeCount: number;
    status: "up-next" | "scheduled" | "sealed";
  };
}) {
  const status = ledgerStatusMeta(event.status);
  return (
    <Link
      to={`/events/${event.publicSlug}`}
      className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-foreground/10 px-3 py-4 first:border-t sm:gap-8 ${
        status.rowHighlight ? "bg-card" : ""
      }`}
    >
      <span
        className={`text-sm ${status.rowHighlight ? "font-semibold text-primary" : "text-muted-foreground"}`}
      >
        {event.dateLabel}
      </span>
      <span className="font-semibold">
        {event.name} <span className="font-normal text-muted-tan">· {event.city}</span>
      </span>
      <span className="font-mono text-sm text-muted-foreground">
        {status.countLabel ?? `${event.takeCount} takes`}
      </span>
      <span className={`font-mono text-xs uppercase ${status.statusClassName}`}>
        {status.statusLabel}
      </span>
    </Link>
  );
}
