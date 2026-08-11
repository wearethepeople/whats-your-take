import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { DashedDivider, GoldUnderline } from "~/components/visual-grammar";

export function meta() {
  return [
    { title: "About — What's Your Take?" },
    {
      name: "description",
      content:
        "A guestbook for the country's 250th year — why it's in person, anonymous, and sealed.",
    },
  ];
}

export default function About() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader active="about" />

      <main className="flex-1">
        <section className="flex flex-col gap-6 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:px-14 sm:py-16">
          <p className="text-sm text-muted-tan">About the project</p>
          <h1 className="max-w-2xl font-serif text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            A guestbook for the country&rsquo;s <GoldUnderline>250th year.</GoldUnderline>
          </h1>
          <p className="max-w-prose text-[17.5px] text-muted-foreground">
            What&rsquo;s Your Take? is one shaded table with one question, set up where people
            already are — festivals, markets, park days. No stage, no debate, no sides to join. You
            sit, you write, you drop it in the box. Two minutes, and you were part of it.
          </p>
          <p className="max-w-prose text-[17.5px] text-muted-foreground">
            Every answer is anonymous by design: there is nowhere to put your name. And every answer
            stays sealed — no feed, no reactions, no running tally of what &ldquo;people like
            you&rdquo; think. The record opens once, all together, at the season premiere.
          </p>
        </section>

        <section className="grid gap-10 px-6 py-14 sm:grid-cols-3 sm:divide-x sm:divide-dashed sm:divide-(--color-dashed) sm:px-14">
          <WhyColumn heading="Why in person?">
            Because a stranger&rsquo;s handwriting is harder to dismiss than a username. Every take
            is scanned in by a host at the table — proof a real person was really here, on a real
            day.
          </WhyColumn>
          <WhyColumn heading="Why anonymous?" className="sm:pl-10">
            Names turn answers into positions. Without one, you&rsquo;re not performing for anyone —
            you&rsquo;re just telling the truth to somebody fifty years away.
          </WhyColumn>
          <WhyColumn heading="Why sealed?" className="sm:pl-10">
            So no take can trend, and no take can lose. A year of answers read together says more
            about us than any single day&rsquo;s argument could.
          </WhyColumn>
        </section>

        <DashedDivider />

        <section className="grid gap-8 px-6 py-14 sm:grid-cols-2 sm:px-14">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Who&rsquo;s behind it</h2>
            <p className="max-w-prose text-muted-foreground">
              We (ARE) The People is a nonpartisan civic project from Dallas, Texas. We&rsquo;re not
              red, we&rsquo;re not blue, and we&rsquo;re not selling anything — we build small ways
              for people to be heard and to hear each other.
            </p>
            <a
              href="https://wearethepeople.us"
              className="text-primary underline underline-offset-4"
            >
              wearethepeople.us
            </a>
          </div>
          <div className="flex flex-col gap-2 border-[1.5px] border-foreground bg-card p-5">
            <h2 className="font-semibold">Want the table at your event?</h2>
            <p className="text-muted-foreground">
              We travel with a canopy, a table, and a box. If your festival, market, or block party
              has shade for us — or you just want to point us toward a town —{" "}
              <Link to="/bring-the-table" className="text-primary underline underline-offset-4">
                let us know
              </Link>
              .
            </p>
          </div>
        </section>

        <p className="px-6 pb-10 text-xs text-muted-foreground sm:px-14">
          ZIP lookups for the &ldquo;bring the table to your town&rdquo; form use postal data from{" "}
          <a
            href="https://www.geonames.org"
            className="underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            GeoNames.org
          </a>
          , licensed{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function WhyColumn({
  heading,
  children,
  className,
}: {
  heading: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <h2 className="font-semibold text-primary">{heading}</h2>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
