import { data } from "react-router";
import type { Route } from "./+types/events.$publicSlug";
import { db } from "~/db/client.server";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { DashedDivider, GoldUnderline, LiveStateNote, Stamp } from "~/components/visual-grammar";
import { formatRevealDate } from "~/features/events/reveal-date";
import { eventDetail } from "~/features/events/services/season.server";

function formatDateStamp(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getFullYear()}`;
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData
        ? `${formatDateStamp(loaderData.event.startsAt)} ${loaderData.event.name} · What’s Your Take?`
        : "What’s Your Take?",
    },
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
  const revealDateLabel = event.revealDate ? formatRevealDate(event.revealDate) : null;
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
            {event.seasonLabel ? ` · ${event.seasonLabel}` : ""}
          </p>
          <EventHeadline text={event.name} />

          {event.narrative ? (
            <p className="max-w-prose whitespace-pre-wrap text-muted-foreground">
              {event.narrative}
            </p>
          ) : null}

          {sealed && liveState === "transcribing" ? (
            <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
              <Stamp className="border-primary text-primary">Transcribing</Stamp>
              <p className="text-muted-foreground">
                This day&rsquo;s table has closed. Physical cards are still being transcribed, so
                the count isn&rsquo;t final yet — once it is, these takes join the record and open
                with every other stop{revealDateLabel ? ` on ${revealDateLabel}` : ""}, at the
                season premiere.
              </p>
            </div>
          ) : sealed ? (
            <div className="flex flex-wrap items-center gap-4 border border-dashed border-primary p-5">
              <Stamp className="border-primary text-primary">Sealed</Stamp>
              <p className="text-muted-foreground">
                This day&rsquo;s {event.takeCount} takes are in the record. They open with every
                other stop{revealDateLabel ? ` on ${revealDateLabel}` : ""}, at the season premiere.
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
            <p>{event.address ? `${event.address}, ${event.city}` : event.city}</p>
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
                  {event.channelBreakdown.card} handwritten cards · {event.channelBreakdown.screens}{" "}
                  from screens
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
