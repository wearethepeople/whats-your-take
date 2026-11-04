import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { DashedDivider, GoldUnderline, PhotoFrame } from "~/components/visual-grammar";
import tablePhoto from "~/assets/photos/the-table.webp";

export function meta() {
  return [
    { title: "About · What’s Your Take?" },
    {
      name: "description",
      content: "A guestbook for the country’s 250th birthday: in person, anonymous, and sealed.",
    },
  ];
}

export default function About() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader active="about" />

      <main className="flex-1">
        <section className="grid gap-10 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:grid-cols-[1fr_360px] sm:px-14 sm:py-16">
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-tan">About the project</p>
            <h1 className="max-w-2xl font-serif text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              A guestbook for the country&rsquo;s <GoldUnderline>250th birthday.</GoldUnderline>
            </h1>
            <p className="max-w-prose text-[17.5px] text-muted-foreground">
              What&rsquo;s Your Take? is a table we set up where people already are: festivals,
              markets, park days. It asks one question. You sit down, write your answer on a card or
              on your own phone, and drop it in the box. There&rsquo;s no stage, no debate, and
              nothing to sign up for, and it takes about two minutes.
            </p>
            <p className="max-w-prose text-[17.5px] text-muted-foreground">
              We&rsquo;re taking that question around the country, and everything people write stays
              sealed until the reveal. Then every answer is released at once, alongside a short film
              that tries to answer two questions: Who are we? What do we believe?
            </p>
            <p className="max-w-prose text-[17.5px] text-muted-foreground">
              With no pressure to wear a label, the answers add up to a kind of civic mirror: the
              country, reflected back to itself. It's "know thyself" at scale.
            </p>
          </div>
          <PhotoFrame
            src={tablePhoto}
            alt="The table under its canopy: a What’s Your Take? sign on an easel, a stand with a QR code and the question, and rows of rubber stamps, ink pads, crayons and stickers on a linen tablecloth."
            width={900}
            height={1351}
            loading="eager"
            className="photo-grade aspect-[3/4] sm:relative sm:aspect-auto"
            imgClassName="sm:absolute sm:inset-0"
          />
        </section>

        <section className="grid gap-10 px-6 py-14 sm:grid-cols-3 sm:gap-x-0 sm:divide-x sm:divide-dashed sm:divide-(--color-dashed) sm:px-14">
          <WhyColumn heading="Why in person?" className="sm:pr-8">
            Agency is felt, not explained. Showing up in a real place, next to real people, gives
            your whole body the experience. Every take is proof a real person was actually there.
            Bots need not apply.
          </WhyColumn>
          <WhyColumn heading="Why anonymous?" className="sm:px-8">
            Privacy is worth protecting. We never ask for your name, email or phone when you answer,
            and nothing ties a take to a person.
          </WhyColumn>
          <WhyColumn heading="Why sealed?" className="sm:pl-8">
            So everyone responds to the question, instead of replying to someone else&rsquo;s
            answer. Each take carries the same weight.
          </WhyColumn>
        </section>

        <DashedDivider />

        <section className="grid gap-8 px-6 py-14 sm:grid-cols-2 sm:px-14">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Who&rsquo;s behind it</h2>
            <p className="max-w-prose text-muted-foreground">
              We (ARE) the People is a nonpartisan civic identity project from Dallas, Texas. We
              build ways for people to be heard and to hear each other.
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
              We travel with a canopy, a table, and a couple boxes. If your festival, market, or
              block party has shade for us, or you just want to point us toward a town,{" "}
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
