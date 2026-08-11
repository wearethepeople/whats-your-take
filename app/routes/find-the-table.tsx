import { Link } from "react-router";
import type { Route } from "./+types/find-the-table";
import { Button } from "~/components/ui/button";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { GoldUnderline, ledgerStatusMeta, offsetShadow, Stamp } from "~/components/visual-grammar";
import { db } from "~/db/client.server";
import { nextStop, upcomingLedger } from "~/features/events/services/season.server";

export function meta() {
  return [
    { title: "Find the table — What's Your Take?" },
    {
      name: "description",
      content: "No tickets, no signup — just show up. Where the table is headed next.",
    },
  ];
}

export async function loader() {
  const featured = nextStop(db);
  const upcoming = upcomingLedger(db).filter((event) => event.id !== featured?.id);
  return { featured, upcoming };
}

// Basic UTC "YYYYMMDDTHHMMSSZ" stamp — the format .ics requires.
function icsTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");
}

// Client-derivable from public event fields alone — no server round-trip
// needed, so this builds a data: URI at render time.
function buildIcsDataUrl(event: {
  publicSlug: string;
  name: string;
  venue: string | null;
  address: string | null;
  city: string;
  startsAt: Date;
  endsAt: Date;
}): string {
  const location = [event.venue, event.address, event.city].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//What's Your Take?//EN",
    "BEGIN:VEVENT",
    `UID:${event.publicSlug}@wrtp.us`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(event.startsAt)}`,
    `DTEND:${icsTimestamp(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(`${event.name} — What's Your Take?`)}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

function directionsUrl(event: {
  venue: string | null;
  address: string | null;
  city: string;
  zip: string | null;
}): string {
  const query = [event.venue, event.address, event.city, event.zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function BringTheTableCallout() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-dashed border-primary p-5">
      <p className="text-muted-foreground">
        Have shade at your festival, market, or block party?{" "}
        <span className="font-semibold text-foreground">Bring the table to your town.</span>
      </p>
      <Link to="/bring-the-table" className="text-primary underline underline-offset-4">
        Point us there
      </Link>
    </div>
  );
}

export default function FindTheTable({ loaderData }: Route.ComponentProps) {
  const { featured, upcoming } = loaderData;

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader active="find-the-table" />

      <main className="flex-1">
        <section className="flex flex-col gap-6 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:px-14 sm:py-16">
          <p className="text-sm text-muted-tan">No tickets, no signup — just show up</p>
          <h1 className="max-w-2xl font-serif text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            Come find <GoldUnderline>the table.</GoldUnderline>
          </h1>
          <p className="max-w-prose text-[17.5px] text-muted-foreground">
            Look for the canopy and the long table. Sitting down takes two minutes; watching is
            welcome too. Answering happens only here — it&rsquo;s the whole point.
          </p>
        </section>

        <section className="flex flex-col gap-8 px-6 py-14 sm:px-14">
          {featured ? (
            <>
              <div className="relative flex flex-col gap-4 border-[1.5px] border-foreground bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
                <Stamp className="absolute -top-3 left-4 bg-primary text-primary-foreground">
                  Next stop
                </Stamp>
                <div className="flex flex-col gap-2 pt-2">
                  <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{featured.name}</h2>
                  <p className="text-muted-foreground">
                    {featured.dayLabel} · {featured.timeLabel}
                  </p>
                  <p className="text-muted-foreground">
                    {featured.venue ?? "Venue to be announced"}
                    {featured.address ? `, ${featured.address}` : ""}, {featured.city}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:w-56">
                  <a
                    href={buildIcsDataUrl(featured)}
                    download={`${featured.publicSlug}.ics`}
                    className={`inline-flex h-11 items-center justify-center border-2 border-foreground bg-foreground px-4 text-sm font-bold text-background ${offsetShadow}`}
                  >
                    Add to calendar
                  </a>
                  <Button
                    render={<a href={directionsUrl(featured)} target="_blank" rel="noreferrer" />}
                    nativeButton={false}
                    variant="outline"
                  >
                    Directions
                  </Button>
                </div>
              </div>

              {upcoming.length > 0 ? (
                <div className="flex flex-col">
                  <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 border-b border-foreground pb-2 font-mono text-xs text-muted-foreground uppercase sm:gap-8">
                    <span>Nº</span>
                    <span>Date</span>
                    <span>Stop</span>
                    <span>Status</span>
                  </div>
                  {upcoming.map((event) => (
                    <UpcomingRow key={event.id} event={event} />
                  ))}
                </div>
              ) : null}

              <BringTheTableCallout />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="max-w-prose text-muted-foreground">
                No stop is confirmed right now — check back soon.
              </p>
              <BringTheTableCallout />
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function UpcomingRow({
  event,
}: {
  event: {
    id: number;
    publicSlug: string;
    name: string;
    city: string;
    dateLabel: string;
    status: "up-next" | "scheduled" | "sealed";
    stopNumber: number;
  };
}) {
  const status = ledgerStatusMeta(event.status);
  return (
    <Link
      to={`/events/${event.publicSlug}`}
      className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 border-b border-foreground/10 px-0 py-4 sm:gap-8"
    >
      <span className="font-mono text-sm text-muted-foreground">
        {String(event.stopNumber).padStart(2, "0")}
      </span>
      <span className="text-sm text-muted-foreground">{event.dateLabel}</span>
      <span className="font-semibold">
        {event.name} <span className="font-normal text-muted-tan">· {event.city}</span>
      </span>
      <span className={`font-mono text-xs uppercase ${status.statusClassName}`}>
        {status.statusLabel}
      </span>
    </Link>
  );
}
