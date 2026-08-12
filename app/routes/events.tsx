import { Link } from "react-router";
import type { Route } from "./+types/events";
import { db } from "~/db/client.server";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { GoldUnderline, ledgerStatusMeta, Stamp } from "~/components/visual-grammar";
import { formatRevealDate } from "~/features/events/reveal-date";
import {
  archiveView,
  currentOrClosedSeason,
  type ArchiveEvent,
} from "~/features/events/services/season.server";

export function meta() {
  return [
    { title: "Where the table has been · What's Your Take?" },
    {
      name: "description",
      content: "Every stop the table has made, and what's still sealed until the reveal.",
    },
  ];
}

export async function loader() {
  return {
    archive: archiveView(db),
    season: currentOrClosedSeason(db),
  };
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

type SeasonGroup = { promptId: number; seasonLabel: string; events: ArchiveEvent[] };

// Groups by promptId, preserving archive.events' newest-first order — since
// that order is newest-first, each group's own first occurrence is its most
// recent event, so the groups themselves come out newest-season-first too.
function groupBySeason(events: ArchiveEvent[]): SeasonGroup[] {
  const groups = new Map<number, SeasonGroup>();
  for (const event of events) {
    let group = groups.get(event.promptId);
    if (!group) {
      group = { promptId: event.promptId, seasonLabel: event.seasonLabel, events: [] };
      groups.set(event.promptId, group);
    }
    group.events.push(event);
  }
  return [...groups.values()];
}

export default function Events({ loaderData }: Route.ComponentProps) {
  const { archive, season } = loaderData;
  const reveal = season?.revealDate ?? null;
  const revealDateLabel = reveal ? formatRevealDate(reveal) : null;
  const daysToReveal = reveal ? daysUntil(reveal.date) : null;
  const eyebrow = [season?.label, archive.dateRangeLabel].filter(Boolean).join(" · ");
  const seasons = groupBySeason(archive.events);
  // A header per season only earns its place once there's more than one —
  // for a single-season site it's noise repeating what the eyebrow above
  // already says.
  const showSeasonHeaders = seasons.length > 1;

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader active="events" />

      <main className="flex-1">
        <section className="grid gap-10 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:grid-cols-[1fr_auto] sm:items-start sm:px-14">
          <div className="flex flex-col gap-4">
            {eyebrow ? <p className="text-sm text-muted-tan">{eyebrow}</p> : null}
            <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
              Where the table <GoldUnderline>has been.</GoldUnderline>
            </h1>
            <p className="max-w-prose text-muted-foreground">
              Every stop gets a page: the day, the place, and how many people sat down. What they
              wrote stays sealed with everything else, until the whole record opens
              {revealDateLabel ? ` on ${revealDateLabel}` : ", on a date to be announced"}.
            </p>
          </div>
          <dl className="flex gap-8 sm:flex-col sm:gap-2 sm:text-right">
            <div>
              <dt className="text-sm text-muted-foreground">Takes recorded</dt>
              <dd className="font-serif text-2xl">{archive.totalTakes}</dd>
            </div>
            {daysToReveal != null ? (
              <div>
                <dt className="text-sm text-muted-foreground">Days to the reveal</dt>
                <dd className="font-serif text-2xl text-primary">{daysToReveal}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {archive.events.length > 0 ? (
          <section className="flex flex-col gap-8 px-6 py-10 sm:px-14">
            {seasons.map((group) => (
              <div key={group.promptId}>
                {showSeasonHeaders ? (
                  <h2 className="mb-2 font-serif text-xl font-semibold">{group.seasonLabel}</h2>
                ) : null}
                <div className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-4 border-b border-foreground pb-2 font-mono text-xs text-muted-foreground uppercase sm:gap-8">
                  <span>Nº</span>
                  <span>Date</span>
                  <span>Stop</span>
                  <span>Takes</span>
                  <span>Status</span>
                </div>
                <div className="flex flex-col">
                  {group.events.map((event) => (
                    <ArchiveRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="px-6 py-10 sm:px-14">
            <p className="text-muted-foreground">No stops yet. Check back soon.</p>
          </section>
        )}

        <section className="px-6 py-10 sm:px-14">
          <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
            <Stamp className="border-primary text-primary">
              {revealDateLabel ?? "Date TBD"}
            </Stamp>
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
    publicSlug: string;
    name: string;
    city: string;
    dateLabel: string;
    takeCount: number;
    status: "up-next" | "scheduled" | "sealed";
    stopNumber: number;
  };
}) {
  const status = ledgerStatusMeta(event.status);
  return (
    <Link
      to={`/events/${event.publicSlug}`}
      className={`grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-4 border-b border-foreground/10 px-0 py-4 sm:gap-8 ${
        status.rowHighlight ? "bg-card" : ""
      }`}
    >
      <span className="font-mono text-sm text-muted-foreground">
        {String(event.stopNumber).padStart(2, "0")}
      </span>
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
