import { data } from "react-router";
import type { Route } from "./+types/events.$publicSlug";
import { db } from "~/db/client.server";
import { NarrativeMarkdown } from "~/components/narrative-markdown";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { DashedDivider, GoldUnderline, LiveStateNote, Stamp } from "~/components/visual-grammar";
import { formatCityState } from "~/features/events/location";
import { revealAnnouncement, type RevealAnnouncement } from "~/features/events/reveal-date";
import { eventDetail } from "~/features/events/services/season.server";
import { absoluteUrl, pageMeta, SITE_NAME } from "~/lib/seo";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: SITE_NAME }];
  const { event } = loaderData;
  const stop = String(event.stopNumber).padStart(2, "0");
  const description = `Stop No. ${stop} of the ${SITE_NAME} tour: ${event.dayLabel}, ${formatCityState(event.city, event.state)}. Every take is anonymous and sealed until the reveal.`;
  const path = `/events/${event.publicSlug}`;
  return [
    ...pageMeta({
      title: `${event.name} · Stop No. ${stop} · ${SITE_NAME}`,
      description,
      path,
    }),
    // Event markup needs a place; a stop with no venue yet gets none rather
    // than a half-filled one.
    ...(event.venue
      ? [
          {
            "script:ld+json": {
              "@context": "https://schema.org",
              "@type": "Event",
              name: event.name,
              description,
              url: absoluteUrl(path),
              startDate: event.startsAt.toISOString(),
              endDate: event.endsAt.toISOString(),
              eventStatus: "https://schema.org/EventScheduled",
              eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
              location: {
                "@type": "Place",
                name: event.venue,
                address: {
                  "@type": "PostalAddress",
                  ...(event.address ? { streetAddress: event.address } : {}),
                  addressLocality: event.city,
                  ...(event.state ? { addressRegion: event.state } : {}),
                  ...(event.zip ? { postalCode: event.zip } : {}),
                  addressCountry: "US",
                },
              },
              organizer: {
                "@type": "Organization",
                name: "We (ARE) the People",
                url: "https://wearethepeople.us",
              },
              isAccessibleForFree: true,
            },
          },
        ]
      : []),
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const event = eventDetail(db, params.publicSlug);
  if (!event) throw data(null, { status: 404 });
  return { event };
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

// Same highlighted-date treatment as the homepage's reveal copy, so a known
// date reads the same way everywhere it's mentioned, not just on home.tsx.
// The label and preposition themselves come from revealAnnouncement() (see
// reveal-date.ts) — the one place that decides "on {day}" vs "in {month}" —
// so this only has to decide how to lay them out.
function RevealClause({ announcement }: { announcement: RevealAnnouncement | null }) {
  return announcement ? (
    <>
      , {announcement.preposition}{" "}
      <span className="bg-accent px-0.5 font-semibold text-accent-foreground">
        {announcement.label}
      </span>
    </>
  ) : (
    ", on a date to be announced"
  );
}

// Same "underline the last word" simplification as the homepage's
// PromptHeadline — event names are host-authored, no reliable clause
// boundary to detect.
function EventHeadline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return (
    <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
      {words.join(" ")} {last ? <GoldUnderline>{last}</GoldUnderline> : null}
    </h1>
  );
}

export default function EventDetail({ loaderData }: Route.ComponentProps) {
  const { event } = loaderData;
  const announcement = revealAnnouncement(event.revealDate);
  const daysToReveal = event.revealDate ? daysUntil(event.revealDate.date) : null;
  const sealed = event.status === "sealed";
  const scheduled = event.status === "scheduled";
  const liveState = event.liveState;

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader />

      <main className="flex-1 grid gap-10 px-6 py-14 sm:grid-cols-[1fr_320px] sm:items-start sm:px-14">
        <div className="flex flex-col gap-5">
          <p className="font-mono text-xs text-primary uppercase">
            Stop No. {String(event.stopNumber).padStart(2, "0")}
          </p>
          <EventHeadline text={event.name} />

          {event.narrative ? <NarrativeMarkdown source={event.narrative} /> : null}

          {sealed && liveState === "transcribing" ? (
            <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
              <Stamp className="border-primary text-primary">Transcribing</Stamp>
              <p className="text-muted-foreground">
                This day&rsquo;s table has closed. Physical cards are still being transcribed, so
                the count isn&rsquo;t final yet — once it is, these takes join the record and open
                with every other stop
                <RevealClause announcement={announcement} />, at the reveal.
              </p>
            </div>
          ) : sealed ? (
            <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
              <Stamp className="border-primary text-primary">Sealed</Stamp>
              <p className="text-muted-foreground">
                This day&rsquo;s {event.takeCount} takes are in the record. They open with every
                other stop
                <RevealClause announcement={announcement} />, at the reveal.
              </p>
            </div>
          ) : scheduled ? (
            <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
              <Stamp className="border-primary text-primary">Scheduled</Stamp>
              <p className="text-muted-foreground">
                This stop is confirmed but not open yet. Details firm up as the date gets closer.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
              <Stamp className="border-primary text-primary">In process</Stamp>
              {/* Deliberately no link to the submission flow here: that
                  URL is printed on the table's QR and never published on
                  the marketing site (see events.slug's schema comment). */}
              <p className="text-muted-foreground">This table is open right now.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative border-[1.5px] border-foreground bg-card p-5">
            <Stamp className="absolute -top-3 right-4 bg-primary text-primary-foreground">
              Stop No. {String(event.stopNumber).padStart(2, "0")}
            </Stamp>

            <FactRow label="Day">
              <p>{event.dayLabel}</p>
              <p>{event.timeLabel}</p>
            </FactRow>
            <DashedDivider />

            <FactRow label="Place">
              <p>{event.venue ?? "Venue to be announced"}</p>
              <p>
                {event.address
                  ? `${event.address}, ${formatCityState(event.city, event.state)}`
                  : formatCityState(event.city, event.state)}
              </p>
            </FactRow>
            <DashedDivider />

            <FactRow
              label="Entries recorded"
              labelSuffix={liveState ? <LiveStateNote state={liveState} /> : null}
            >
              {sealed ? (
                <>
                  <p className="font-serif text-2xl">{event.takeCount}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.channelBreakdown.card} handwritten cards ·{" "}
                    {event.channelBreakdown.screens} from screens
                    {liveState === "transcribing" ? " so far" : ""}
                  </p>
                </>
              ) : scheduled ? (
                <p className="text-sm text-muted-foreground">Not open yet.</p>
              ) : (
                // Mid-event, the tent whiteboard is the only live mirror
                // (I6) — the public page doesn't extend that count online
                // while the table is still open.
                <p className="text-sm text-muted-foreground">Recording now. Count follows close.</p>
              )}
            </FactRow>
            <DashedDivider />

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {daysToReveal != null ? "Opens in" : "Opens"}
              </span>
              <span className="font-serif text-xl text-primary">
                {daysToReveal != null ? `${daysToReveal} days` : "Date TBD"}
              </span>
            </div>
          </div>

          {sealed && event.photos.length > 0 ? (
            <div className="border-[1.5px] border-foreground bg-card p-5">
              <p className="mb-3 text-xs text-muted-foreground uppercase">Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {event.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    className="block overflow-hidden border border-border"
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.caption ?? ""}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FactRow({
  label,
  labelSuffix,
  children,
}: {
  label: string;
  labelSuffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 first:pt-0">
      <p className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
        {label}
        {labelSuffix}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
