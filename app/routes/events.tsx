import { Link } from "react-router";
import type { Route } from "./+types/events";
import { db } from "~/db/client.server";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { GoldUnderline, Stamp } from "~/components/visual-grammar";

export function meta() {
  return [
    { title: "Where the table has been — What's Your Take?" },
    {
      name: "description",
      content: "Every stop the table has made, and what's still sealed until the reveal.",
    },
  ];
}

export async function loader() {
  const { REVEAL_DATE, archiveView, currentSeason } =
    await import("~/features/events/services/season.server");
  return {
    archive: archiveView(db),
    season: currentSeason(db),
    revealDateIso: REVEAL_DATE.toISOString(),
    revealDateLabel: REVEAL_DATE.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function Events({ loaderData }: Route.ComponentProps) {
  const { archive, season, revealDateIso, revealDateLabel } = loaderData;
  const daysToReveal = daysUntil(revealDateIso);
  const eyebrow = [season?.label, archive.dateRangeLabel].filter(Boolean).join(" · ");

  return (
    <div className="font-sans text-foreground">
      <SiteHeader active="events" />

      <main>
        <section className="grid gap-10 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:grid-cols-[1fr_auto] sm:items-start sm:px-14">
          <div className="flex flex-col gap-4">
            {eyebrow ? <p className="text-sm text-muted-tan">{eyebrow}</p> : null}
            <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
              Where the table <GoldUnderline>has been.</GoldUnderline>
            </h1>
            <p className="max-w-prose text-muted-foreground">
              Every stop gets a page: the day, the place, and how many people sat down. What they
              wrote stays sealed with everything else — until the whole record opens on{" "}
              {revealDateLabel}.
            </p>
          </div>
          <dl className="flex gap-8 sm:flex-col sm:gap-2 sm:text-right">
            <div>
              <dt className="text-sm text-muted-foreground">Takes recorded</dt>
              <dd className="font-serif text-2xl">{archive.totalTakes}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Days to the reveal</dt>
              <dd className="font-serif text-2xl text-primary">{daysToReveal}</dd>
            </div>
          </dl>
        </section>

        {archive.events.length > 0 ? (
          <section className="px-6 py-10 sm:px-14">
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-4 border-b border-foreground pb-2 font-mono text-xs text-muted-foreground uppercase sm:gap-8">
              <span>Nº</span>
              <span>Date</span>
              <span>Stop</span>
              <span>Takes</span>
              <span>Status</span>
            </div>
            <div className="flex flex-col">
              {archive.events.map((event) => (
                <ArchiveRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : (
          <section className="px-6 py-10 sm:px-14">
            <p className="text-muted-foreground">No stops yet — check back soon.</p>
          </section>
        )}

        <section className="px-6 py-10 sm:px-14">
          <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
            <Stamp className="border-primary text-primary">{revealDateLabel}</Stamp>
            <p className="text-muted-foreground">
              Every sealed stop opens at once, at the season premiere. Until then, the count is the
              story.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ArchiveRow({
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
    stopNumber: number;
  };
}) {
  const upNext = event.status === "up-next";
  return (
    <Link
      to={`/e/${event.slug}`}
      className={`grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-4 border-b border-foreground/10 px-0 py-4 sm:gap-8 ${
        upNext ? "bg-card px-3" : ""
      }`}
    >
      <span className="font-mono text-sm text-muted-foreground">
        {String(event.stopNumber).padStart(2, "0")}
      </span>
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
