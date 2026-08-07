import { Link } from "react-router";
import type { Route } from "./+types/home";
import { db } from "~/db/client.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { CircledStep, GoldUnderline, Stamp, offsetShadow } from "~/components/visual-grammar";

export function meta() {
  return [
    { title: "What's Your Take?" },
    {
      name: "description",
      content:
        "A pop-up civic guestbook from We (ARE) the People. One question, answered anonymously, shared publicly.",
    },
  ];
}

export async function loader() {
  // Import kept inside the loader — REVEAL_DATE lives in a .server module,
  // and a module-scope import here would pull that server module into the
  // client bundle for any other named export this route uses in render.
  const { REVEAL_DATE, seasonView } = await import("~/features/events/services/season.server");
  const view = seasonView(db);
  return {
    view,
    revealDateIso: REVEAL_DATE.toISOString(),
    revealDateLabel: REVEAL_DATE.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
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

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { view, revealDateIso, revealDateLabel } = loaderData;
  const daysToReveal = daysUntil(revealDateIso);
  const nextStop = view?.ledger.find((event) => event.status === "up-next");

  return (
    <div className="font-sans text-foreground">
      {nextStop ? (
        <div className="bg-primary px-4 py-2 text-center text-[13px] font-bold text-primary-foreground">
          Next stop — {nextStop.name}, {nextStop.city} · {nextStop.dateLabel}
        </div>
      ) : null}

      <SiteHeader active="question" />

      <main>
        <section
          id="question"
          className="grid gap-10 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:grid-cols-[1fr_300px] sm:px-14 sm:py-16"
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-tan">
              A pop-up civic guestbook · one table · one question · no sides to join.
            </p>
            {view ? (
              <PromptHeadline text={view.season.promptText} />
            ) : (
              <h1 className="font-serif text-4xl font-semibold">
                A pop-up civic guestbook is on its way.
              </h1>
            )}
            <p className="max-w-prose text-[17.5px] text-muted-foreground">
              All through America&rsquo;s 250th year, a shaded table travels to festivals and
              markets. People stop for two minutes and answer in their own words — anonymous,
              unpolled, unedited.
            </p>
            <p className="max-w-prose text-[15px] text-muted-foreground">
              You can&rsquo;t answer from here — the table only happens in person, one place at a
              time. And no one reads the answers yet, not even us. Every take goes in sealed, until
              the whole record opens at once:{" "}
              <span className="bg-accent px-0.5 font-semibold">{revealDateLabel}</span>.
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
              <p className="mb-3 text-sm font-semibold text-primary">The record so far</p>
              <dl className="flex flex-col">
                <StatRow label="Stops so far" value={String(view.stats.stopCount)} />
                <StatRow label="Takes recorded" value={String(view.stats.totalTakes)} />
                <StatRow label="Towns" value={String(view.stats.townCount)} />
                <StatRow label="Days to the reveal" value={String(daysToReveal)} highlight />
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                No names, no accounts — one scan at the table is the whole system. The record stays
                sealed until it opens all at once.
              </p>
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
              On {revealDateLabel}, the sealed record opens at a public premiere — every take from
              every stop, read together for the first time. Until then the guestbook stays closed:
              what you write today carries the same weight as everything written before it.
            </p>
            <p className="font-mono text-sm text-primary">
              {revealDateLabel.toUpperCase()}{" "}
              <span className="font-sans font-normal text-muted-foreground">
                premiere details as the season closes
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-5 sm:pl-10">
            <p className="text-sm text-muted-tan">How it works</p>
            <ol className="flex flex-col gap-4">
              <Step n={1}>
                Find the canopy. Nothing to sign up for, nothing to buy — watching counts too.
              </Step>
              <Step n={2}>
                Write your take — card and marker, keyboard at the table, or your own phone. No
                name, ever.
              </Step>
              <Step n={3}>
                Your host scans it into the day&rsquo;s record — proof a real person was really
                here.
              </Step>
            </ol>
          </div>
        </section>

        {view && view.ledger.length > 0 ? (
          <section className="px-6 py-14 sm:px-14">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm text-muted-tan">
                The season so far — and where it&rsquo;s going
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
              An occasional letter from We (ARE) The People — where the table goes next, and what
              the country has been writing. Easy to leave.
            </p>
          </div>
          <div>
            {/* Newsletter is visual-only this phase — Emma isn't wired up yet.
                Wire the real signup here once an Emma account/list exists. */}
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => event.preventDefault()}
            >
              <Input type="email" placeholder="you@example.com" disabled className="bg-card" />
              <Button type="submit" disabled>
                Stay engaged
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Your email is for the letter and nothing else. It never connects to what anyone wrote.
            </p>
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-(--color-dashed) py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
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
    slug: string;
    name: string;
    city: string;
    dateLabel: string;
    takeCount: number;
    status: "up-next" | "sealed";
  };
}) {
  const upNext = event.status === "up-next";
  return (
    <Link
      to={`/e/${event.slug}`}
      className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-foreground/10 px-3 py-4 first:border-t sm:gap-8 ${
        upNext ? "bg-card" : ""
      }`}
    >
      <span
        className={`text-sm ${upNext ? "font-semibold text-primary" : "text-muted-foreground"}`}
      >
        {event.dateLabel}
      </span>
      <span className="font-semibold">
        {event.name} <span className="font-normal text-muted-tan">· {event.city}</span>
      </span>
      <span className="font-mono text-sm text-muted-foreground">
        {upNext ? "up next" : `${event.takeCount} takes`}
      </span>
      <span
        className={`font-mono text-xs uppercase ${upNext ? "font-bold text-primary" : "text-muted-foreground"}`}
      >
        {upNext ? "Come find us" : "Sealed"}
      </span>
    </Link>
  );
}
