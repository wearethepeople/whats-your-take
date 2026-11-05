import { Link } from "react-router";
import type { Route } from "./+types/events";
import { db } from "~/db/client.server";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import {
  GoldUnderline,
  InProcessSpinner,
  LiveStateNote,
  ledgerRowSurface,
  ledgerStatusMeta,
  Stamp,
} from "~/components/visual-grammar";
import { formatCityState } from "~/features/events/location";
import { formatRevealDate, revealAnnouncement } from "~/features/events/reveal-date";
import {
  archiveView,
  currentOrClosedSeason,
  type ArchiveEvent,
  type LiveState,
} from "~/features/events/services/season.server";
import { pageMeta, SITE_NAME } from "~/lib/seo";

export function meta() {
  return pageMeta({
    title: `Where the table has been · ${SITE_NAME}`,
    description: "Every stop the table has made: the day, the place, and how many people sat down.",
    path: "/events",
  });
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

type PromptGroup = { promptId: number; promptText: string; events: ArchiveEvent[] };

// Groups by promptId, preserving archive.events' newest-first order — since
// that order is newest-first, each group's own first occurrence is its most
// recent event, so the groups themselves come out newest-season-first too.
function groupByPrompt(events: ArchiveEvent[]): PromptGroup[] {
  const groups = new Map<number, PromptGroup>();
  for (const event of events) {
    let group = groups.get(event.promptId);
    if (!group) {
      group = { promptId: event.promptId, promptText: event.promptText, events: [] };
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
  const announcement = revealAnnouncement(reveal);
  const daysToReveal = reveal ? daysUntil(reveal.date) : null;
  const eyebrow = archive.dateRangeLabel;
  const groups = groupByPrompt(archive.events);
  // A header per season only earns its place once there's more than one —
  // for a single-season site it's noise repeating what the eyebrow above
  // already says.
  const showPromptHeaders = groups.length > 1;

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
              {announcement
                ? ` ${announcement.preposition} ${announcement.label}`
                : ", on a date to be announced"}
              .
            </p>
          </div>
          <dl className="flex gap-8 sm:flex-col sm:gap-2 sm:text-right">
            <div>
              <dt className="text-sm text-muted-foreground">Takes recorded</dt>
              <dd className="font-serif text-2xl">{archive.totalTakes}</dd>
              {archive.liveState ? (
                <div className="sm:flex sm:justify-end">
                  <LiveStateNote state={archive.liveState} />
                </div>
              ) : null}
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
            {groups.map((group) => (
              <div key={group.promptId}>
                {showPromptHeaders ? (
                  <h2 className="mb-2 font-serif text-xl font-semibold">{group.promptText}</h2>
                ) : null}
                <div className="overflow-x-auto">
                  <div className="flex flex-col sm:grid sm:grid-cols-[auto_auto_1fr_6rem_7rem] sm:gap-x-8">
                    <div className="col-span-full hidden grid-cols-subgrid items-baseline border-b border-foreground px-3 pb-2 font-mono text-xs text-muted-foreground uppercase sm:grid">
                      <span>No.</span>
                      <span>Date</span>
                      <span>Stop</span>
                      <span className="text-right">Takes</span>
                      <span className="text-right">Status</span>
                    </div>
                    {group.events.map((event, i) => (
                      <ArchiveRow key={event.id} event={event} striped={i % 2 === 1} />
                    ))}
                  </div>
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
            <Stamp className="border-primary text-primary">{revealDateLabel ?? "Date TBD"}</Stamp>
            <p className="text-muted-foreground">
              Every sealed stop opens at once, at the reveal. Until then, the count is the story.
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
  striped,
}: {
  striped: boolean;
  event: {
    id: number;
    publicSlug: string;
    name: string;
    city: string;
    state: string | null;
    dateLabel: string;
    takeCount: number;
    status: "up-next" | "scheduled" | "sealed";
    stopNumber: number;
    liveState: LiveState;
  };
}) {
  const status = ledgerStatusMeta(event.status);
  return (
    <Link
      to={`/events/${event.publicSlug}`}
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-foreground/10 px-3 py-4 sm:col-span-full sm:grid sm:grid-cols-subgrid sm:gap-x-8 sm:items-baseline ${ledgerRowSurface(
        status.rowHighlight,
        striped,
      )}`}
    >
      <span className="order-1 font-mono text-sm text-muted-foreground sm:order-none">
        {String(event.stopNumber).padStart(2, "0")}
      </span>
      <span
        className={`order-2 text-sm sm:order-none ${status.rowHighlight ? "font-semibold text-primary" : "text-muted-foreground"}`}
      >
        {event.dateLabel}
      </span>
      <span className="order-4 basis-full font-semibold sm:order-none sm:basis-auto">
        {event.name}
        <span className="block font-normal text-muted-tan">
          {formatCityState(event.city, event.state)}
        </span>
      </span>
      <span
        className={`order-5 basis-full flex-col items-start leading-tight sm:order-none sm:flex sm:basis-auto sm:items-end sm:justify-center sm:text-right ${
          event.status === "scheduled" ? "hidden" : "flex"
        }`}
      >
        {event.status === "up-next" ? (
          <InProcessSpinner />
        ) : (
          <span className="font-mono text-sm text-muted-foreground">
            {status.countLabel ?? `${event.takeCount} takes`}
          </span>
        )}
        {/* "Transcribing" still needs its note; an open stop is covered above. */}
        {event.liveState && event.liveState !== "open" ? (
          <LiveStateNote state={event.liveState} />
        ) : null}
      </span>
      <span
        className={`order-3 ml-auto font-mono text-xs uppercase sm:order-none sm:ml-0 sm:text-right ${status.statusClassName}`}
      >
        {status.statusLabel}
      </span>
    </Link>
  );
}
