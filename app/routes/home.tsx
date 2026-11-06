import { useEffect } from "react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/home";
import { db } from "~/db/client.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import publicSans700 from "@fontsource/public-sans/files/public-sans-latin-700-normal.woff2?url";
import heroPhoto800 from "~/assets/photos/hero-800.webp";
import heroPhoto1400 from "~/assets/photos/hero-1400.webp";
import heroPhoto2000 from "~/assets/photos/hero-2000.webp";
import writingPhoto from "~/assets/photos/writing.webp";
import {
  CircledStep,
  GoldUnderline,
  InProcessSpinner,
  LiveStateNote,
  PhotoFrame,
  ledgerRowSurface,
  ledgerStatusMeta,
  StripeBackdrop,
  stripeButton,
} from "~/components/visual-grammar";
import { bannerStop } from "~/features/events/banner-stop";
import { countdownLabel } from "~/features/events/countdown";
import { formatCityState } from "~/features/events/location";
import {
  formatRevealDate,
  revealAnnouncement,
  type RevealDate,
} from "~/features/events/reveal-date";
import { revealPhrase } from "~/features/events/seo";
import {
  closedSeasonView,
  seasonView,
  type LiveState,
  type SeasonStats,
} from "~/features/events/services/season.server";
import { checkRateLimit, getClientIp } from "~/newsletter/rate-limit.server";
import { newsletterFormSchema } from "~/newsletter/schema";
import { buildTour, type TourEvent } from "~/features/events/tour";
import { subscribe } from "~/newsletter/subscribe.server";
import { ORGANIZATION, ORGANIZATION_ID, pageMeta, SITE_NAME, SITE_ORIGIN } from "~/lib/seo";

function homeDescription(reveal: RevealDate | null): string {
  return `One table, one question, answered anonymously in person. Sealed until ${revealPhrase(reveal)}, then opened with a short film: a civic mirror for the country.`;
}

// The "Next stop" strip is bold Public Sans above the fold on this page only;
// root.tsx preloads the weights every page needs.
export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    as: "font",
    type: "font/woff2",
    href: publicSans700,
    crossOrigin: "anonymous",
  },
];

export function meta({ loaderData }: Route.MetaArgs) {
  const description = homeDescription(loaderData?.view?.season.revealDate ?? null);
  return [
    ...pageMeta({
      title: `${SITE_NAME} · A civic mirror project`,
      description,
      path: "/",
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${SITE_ORIGIN}/#website`,
            url: `${SITE_ORIGIN}/`,
            name: SITE_NAME,
            description,
            publisher: { "@id": ORGANIZATION_ID },
          },
          { ...ORGANIZATION, sameAs: ["https://www.instagram.com/wrtp.us/"] },
        ],
      },
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
  // Computed server-side so "within a week" is judged against one clock.
  const now = new Date();
  const nextStop = view ? (bannerStop(view.ledger, now) ?? null) : null;
  const tour = view ? buildTour(view.ledger, now) : null;
  return { view, sealed, nextStop, tour };
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
    <h1 className={headlineClass}>
      {words.join(" ")}{" "}
      {last ? <GoldUnderline className={headlineUnderline}>{last}</GoldUnderline> : null}
    </h1>
  );
}

// The hero headline is the page: set as large as the width allows, with the
// gold underline scaled to the type (em, not the fixed 8px of body headlines).
const headlineClass =
  "mx-auto max-w-5xl font-serif text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl lg:text-8xl";
// One scale below the hero and the reveal: for the sections that carry
// content (steps, the tour table) rather than a statement of their own.
const sectionHeadlineClass =
  "max-w-3xl font-serif text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl";
const sectionHeadlineUnderline = "[box-shadow:inset_0_-0.14em_0_var(--color-accent)]";
const headlineUnderline = "[box-shadow:inset_0_-0.16em_0_var(--color-accent)]";

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const { view, sealed, nextStop, tour } = loaderData;
  const reveal = view?.season.revealDate ?? null;
  const revealDateLabel = reveal ? formatRevealDate(reveal) : null;
  // "on" a day, "in" a month — see revealAnnouncement().
  const announcement = revealAnnouncement(reveal);
  const daysToReveal = reveal ? daysUntil(reveal.date) : null;
  const subscribed = actionData?.ok === true;

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
        <div className="bg-accent px-4 py-2 text-center text-[13px] font-bold text-accent-foreground">
          Next stop: {nextStop.name}, {formatCityState(nextStop.city, nextStop.state)} ·{" "}
          {nextStop.dateLabel}
        </div>
      ) : null}

      <SiteHeader active="question" />

      <main className="flex-1">
        <section
          id="question"
          className="flex flex-col items-center px-6 pt-16 text-center sm:px-14 sm:pt-24"
        >
          <p className="text-sm text-muted-tan">
            A pop-up civic guestbook · One table. One question. Before labels.
          </p>
          <div className="mt-6">
            {view ? (
              <PromptHeadline text={view.season.promptText} />
            ) : (
              <h1 className={headlineClass}>A pop-up civic guestbook is on its way.</h1>
            )}
          </div>
          <div className="mt-10 flex max-w-2xl flex-col gap-5 text-xl text-muted-foreground sm:text-2xl">
            <p>
              {sealed
                ? "The table has finished its tour of festivals and markets."
                : "We’re taking one question around the country, to festivals and markets, and asking everyone who stops by."}
            </p>
            {sealed ? (
              <p>
                Every take is sealed, anonymous and unedited, until the whole record opens together.
                Alongside it comes a short film that synthesizes the responses into a civic mirror,
                reflecting us back to ourselves outside of feeds and algorithms.
              </p>
            ) : (
              <p>
                Every answer is anonymous, and sealed until{" "}
                {revealDateLabel ? (
                  <span className="bg-accent px-0.5 font-semibold text-accent-foreground">
                    {revealDateLabel}
                  </span>
                ) : (
                  "the reveal"
                )}
                . Then every answer opens at once, alongside a short film that synthesizes the
                responses into a civic mirror, reflecting us back to ourselves outside of feeds and
                algorithms.
              </p>
            )}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <Link to="/find-the-table" className={stripeButton}>
              <StripeBackdrop />
              Where the table goes next
            </Link>
            <a href="#how-it-works" className="text-base underline underline-offset-4">
              How the table works
            </a>
          </div>
        </section>

        <PhotoFrame
          src={heroPhoto1400}
          srcSet={`${heroPhoto800} 800w, ${heroPhoto1400} 1400w, ${heroPhoto2000} 2000w`}
          sizes="100vw"
          alt="Two hosts in cream pocket tees stand behind the table: a What’s Your Take? sign on an easel, a stand asking “What would you remind an American in 2076?”, and rows of rubber stamps, crayons, markers and stickers on a linen tablecloth."
          width={2000}
          height={961}
          loading="eager"
          bordered={false}
          className="hero-photo mt-14 aspect-[4/3] w-full sm:mt-20 sm:aspect-[2000/961]"
          imgClassName="object-[100%_50%] sm:object-center"
        />

        {view ? (
          <section className="bg-(--footer) px-6 py-20 text-(--footer-foreground) sm:px-14 sm:py-28">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
              <h2 className="text-sm font-semibold text-accent">
                {sealed ? "The record, sealed" : "The record so far"}
              </h2>
            </div>
            <dl className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-x-16 gap-y-12 text-center">
              <BigStat label="Stops so far" value={String(view.stats.stopCount)} />
              <BigStat
                label="Takes recorded"
                value={String(view.stats.totalTakes)}
                liveState={view.stats.liveState}
              />
              <BigStat label="Towns" value={String(view.stats.townCount)} />
              {view.stats.upcomingCount > 0 ? (
                <BigStat label="Upcoming events" value={String(view.stats.upcomingCount)} />
              ) : null}
              {daysToReveal != null ? (
                <BigStat label="Days to the reveal" value={String(daysToReveal)} highlight />
              ) : null}
            </dl>
            <div className="mx-auto mt-14 flex max-w-xl flex-col gap-3 text-center text-sm text-(--footer-foreground)/70">
              <p>No names, no accounts. The record stays sealed until it opens all at once.</p>
              {view.stats.liveState ? (
                <p>
                  {view.stats.liveState === "open" ? (
                    <>&ldquo;In process&rdquo; means a table is currently open.</>
                  ) : (
                    <>
                      &ldquo;Transcribing&rdquo; means a table has closed and physical cards are
                      being transcribed.
                    </>
                  )}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section id="the-reveal" className="px-6 py-24 text-center sm:px-14 sm:py-40">
          <p className="text-sm text-muted-tan">The reveal</p>
          <h2 className="mx-auto mt-6 max-w-4xl font-serif text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Every answer, opened{" "}
            <GoldUnderline className={headlineUnderline}>all at once.</GoldUnderline>
          </h2>
          <p className="mx-auto mt-10 max-w-2xl text-xl text-muted-foreground sm:mt-12">
            {announcement ? (
              <>
                {announcement.preposition === "in" ? "In" : "On"} {announcement.label}, the
              </>
            ) : (
              "The"
            )}{" "}
            whole record is released, alongside a short film that tries to answer two questions:
          </p>
          <div className="mx-auto mt-10 flex flex-col gap-2 font-serif text-3xl leading-tight font-semibold sm:text-5xl">
            <p>Who are we?</p>
            <p>What do we believe?</p>
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-xl text-muted-foreground">
            With no pressure to wear a label, the answers become a mirror: the country, reflected
            back to itself.
          </p>
          <div className="mx-auto mt-14 w-fit text-left">
            <SeasonTimeline
              stats={view?.stats ?? null}
              sealed={sealed}
              revealDateLabel={revealDateLabel}
            />
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-dashed border-(--color-dashed) px-6 py-24 sm:px-14 sm:py-32"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-tan">How it works</p>
            <h2 className={sectionHeadlineClass}>
              Your voice{" "}
              <GoldUnderline className={sectionHeadlineUnderline}>outside of feeds.</GoldUnderline>
            </h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-6xl items-center gap-12 sm:grid-cols-2 sm:gap-16">
            <ol className="flex flex-col gap-10">
              <Step n={1}>
                Find the table. Nothing to sign up for. You&rsquo;re welcome to just watch.
              </Step>
              <Step n={2}>Write your take on a card, or on your phone. Anonymous by design.</Step>
              <Step n={3}>
                Your take is added into the day&rsquo;s record: proof a real person was really here.
              </Step>
            </ol>
            <PhotoFrame
              src={writingPhoto}
              alt="Two people sit side by side at the table, bent over their cards with pencils, with rubber stamps, markers and a cup of pencils laid out beside them."
              width={1200}
              height={1169}
              className="photo-grade aspect-square"
            />
          </div>
        </section>

        {view && tour && (!sealed || tour.past.length > 0) ? (
          <section className="border-t border-dashed border-(--color-dashed) px-6 py-20 sm:px-14 sm:py-28">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-tan">{sealed ? "The tour" : "The tour so far"}</p>
                <h2 className={sectionHeadlineClass}>
                  {sealed ? (
                    "Where we’ve been."
                  ) : (
                    <>
                      Where we&rsquo;ve been,{" "}
                      <GoldUnderline className={sectionHeadlineUnderline}>
                        where we&rsquo;re headed.
                      </GoldUnderline>
                    </>
                  )}
                </h2>
              </div>
              {/* With nothing upcoming, the empty state below carries this link. */}
              {!sealed && tour.upcoming.length > 0 ? (
                <Link to="/bring-the-table" className="text-sm underline underline-offset-4">
                  Bring the table to your town
                </Link>
              ) : null}
            </div>
            {/* One grid for both lists so their columns line up. */}
            <div className="overflow-x-auto">
              <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_6rem_7rem] sm:gap-x-8">
                {sealed ? null : (
                  <>
                    <TourLabel>Upcoming</TourLabel>
                    {tour.upcoming.length > 0 ? (
                      tour.upcoming.map((event, i) => (
                        <LedgerRow key={event.id} event={event} striped={i % 2 === 1} />
                      ))
                    ) : (
                      <TourFooter>
                        <span className="text-muted-foreground">Nothing on the calendar yet. </span>
                        <Link
                          to="/bring-the-table"
                          className="text-primary underline underline-offset-4"
                        >
                          Bring the table to your town
                        </Link>
                      </TourFooter>
                    )}
                    {tour.upcomingMore > 0 ? (
                      <TourFooter>
                        <Link to="/find-the-table" className="underline underline-offset-4">
                          {tour.upcomingMore} more upcoming{" "}
                          {tour.upcomingMore === 1 ? "stop" : "stops"}
                        </Link>
                      </TourFooter>
                    ) : null}
                  </>
                )}
                {tour.past.length > 0 ? (
                  <>
                    <TourLabel
                      aside={
                        <>
                          {pluralize(tour.pastTotal, "stop")} · {pluralize(tour.pastTakes, "take")}
                          {tour.pastLiveState ? (
                            <LiveStateNote state={tour.pastLiveState} className="ml-3" />
                          ) : null}
                        </>
                      }
                    >
                      Past
                    </TourLabel>
                    {tour.past.map((event, i) => (
                      <LedgerRow key={event.id} event={event} striped={i % 2 === 1} />
                    ))}
                    <TourFooter>
                      <Link to="/events" className="underline underline-offset-4">
                        See where the table&rsquo;s been
                      </Link>
                    </TourFooter>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 bg-secondary px-6 py-16 sm:grid-cols-2 sm:items-center sm:gap-14 sm:px-14 sm:py-20">
          <div>
            <h2 className="font-serif text-3xl font-semibold">Hear from We (ARE) the People</h2>
            <p className="mt-3 max-w-prose text-muted-foreground">
              An occasional letter on where the table goes next, what else we&rsquo;re building, and
              an announcement when the record opens. Easy to leave.
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
                    aria-label="Email address"
                    required
                    className="h-10 bg-card"
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

                  <Button type="submit" className="h-10 px-4">
                    Keep me posted
                  </Button>
                </Form>
                {actionData && !actionData.ok ? (
                  <p className="banner banner-error mt-2" role="alert">
                    {actionData.error}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function BigStat({
  label,
  value,
  highlight = false,
  liveState = null,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  liveState?: LiveState;
}) {
  return (
    <div className="flex min-w-32 flex-col-reverse items-center gap-2">
      {/* The live-state note hangs below the label, out of flow, so it can't
          change this stat's height and lift its numeral off the shared baseline. */}
      <dt className="relative text-sm text-(--footer-foreground)/70">
        {label}
        {liveState ? (
          <LiveStateNote
            state={liveState}
            className="absolute inset-x-0 top-full mt-1.5 justify-center text-accent"
          />
        ) : null}
      </dt>
      <dd
        className={`font-serif text-6xl leading-none font-semibold tracking-tight sm:text-8xl ${
          highlight ? "text-accent" : "text-(--footer-foreground)"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

// The season in three beats — first table, everything since, the premiere —
// with a slowly pulsing dot where we are now: on the running tally while the
// table is touring, on the premiere once the season has closed. Counts only
// (I6): nothing here is a response or a goal to grow toward (I7).
function SeasonTimeline({
  stats,
  sealed,
  revealDateLabel,
}: {
  stats: SeasonStats | null;
  sealed: boolean;
  revealDateLabel: string | null;
}) {
  const firstStopLabel = stats?.firstStopLabel ?? null;
  const hasLaterStops = stats != null && stats.laterStopCount > 0;
  const current = sealed ? "premiere" : hasLaterStops ? "so-far" : firstStopLabel ? "first" : null;

  return (
    <ol className="mt-2 flex flex-col" aria-label="From the first table to the reveal">
      {firstStopLabel ? (
        <TimelineItem reached current={current === "first"}>
          <p className="font-mono text-sm text-primary">{firstStopLabel.toUpperCase()}</p>
          <p className="text-muted-foreground">The first table</p>
        </TimelineItem>
      ) : null}
      {stats && hasLaterStops ? (
        <TimelineItem reached current={current === "so-far"}>
          <p className="font-semibold">
            {pluralize(stats.laterStopCount, "table")}, {pluralize(stats.laterTownCount, "town")}
          </p>
        </TimelineItem>
      ) : null}
      <TimelineItem reached={false} current={current === "premiere"} last>
        <p className="font-mono text-sm text-primary">
          {revealDateLabel ? revealDateLabel.toUpperCase() : "DATE TBA"}
        </p>
        <p className="text-muted-foreground">All responses are published</p>
      </TimelineItem>
    </ol>
  );
}

function TimelineItem({
  reached,
  current,
  last = false,
  children,
}: {
  reached: boolean;
  current: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={`relative pl-8 ${last ? "" : "pb-6"}`}>
      {last ? null : (
        <span
          className="absolute top-[1.125rem] -bottom-1 left-[5.5px] border-l border-dashed border-foreground/40"
          aria-hidden="true"
        />
      )}
      <span
        className={`absolute top-1.5 left-0 size-3 rounded-full border-[1.5px] ${
          reached ? "border-primary bg-primary" : "border-foreground bg-background"
        } ${current ? "timeline-dot-current" : ""}`}
        aria-hidden="true"
      />
      {current ? <span className="sr-only">We are here. </span> : null}
      {children}
    </li>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-5">
      <CircledStep n={n} className="size-12 text-2xl" />
      <p className="pt-1 text-xl leading-snug text-foreground sm:text-2xl">{children}</p>
    </li>
  );
}

// Column-spanning heading for one side of the tour, styled like the archive
// table's header rule.
function TourLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="col-span-full flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground px-3 pt-10 pb-2font-mono text-xs text-muted-foreground uppercase first:pt-0">
      <p>{children}</p>
      {aside ? <p className="flex items-center">{aside}</p> : null}
    </div>
  );
}

// Column-spanning closing line for a list: the empty state or its "more" link.
function TourFooter({ children }: { children: React.ReactNode }) {
  return <p className="col-span-full px-3 py-4 text-sm">{children}</p>;
}

function LedgerRow({ event, striped }: { event: TourEvent; striped: boolean }) {
  const status = ledgerStatusMeta(event.status);
  // Within a week the "Scheduled" tag becomes a countdown; "Today" holds
  // until the host opens the table, when the status flips to "Come find us".
  const statusLabel = event.countdown ? countdownLabel(event.countdown) : status.statusLabel;
  const statusClassName = event.countdown ? "font-semibold text-primary" : status.statusClassName;
  return (
    <Link
      to={`/events/${event.publicSlug}`}
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-foreground/10 px-3 py-4 sm:col-span-full sm:grid sm:grid-cols-subgrid sm:gap-x-8 sm:items-baseline ${ledgerRowSurface(
        status.rowHighlight,
        striped,
      )}`}
    >
      <span
        className={`order-1 text-sm sm:order-none ${status.rowHighlight ? "font-semibold text-primary" : "text-muted-foreground"}`}
      >
        {event.dateLabel}
      </span>
      <span className="order-3 basis-full font-semibold sm:order-none sm:basis-auto">
        {event.name}
        <span className="block font-normal text-muted-tan">
          {formatCityState(event.city, event.state)}
        </span>
      </span>
      <span
        className={`order-4 basis-full flex-col items-start leading-tight sm:order-none sm:flex sm:basis-auto sm:items-end sm:justify-center sm:text-right ${
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
        className={`order-2 ml-auto font-mono text-xs uppercase sm:order-none sm:ml-0 sm:text-right ${statusClassName}`}
      >
        {statusLabel}
      </span>
    </Link>
  );
}
