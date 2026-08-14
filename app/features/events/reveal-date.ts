// Pure formatting, deliberately not a .server module: route components (not
// just loaders) call formatRevealDate() to render a season's reveal date,
// and React Router refuses to let non-loader/action code import anything
// from a *.server.ts file, since that code also ships to the client bundle.

// A season's reveal date, host-set on its prompt (see host.prompts.tsx) —
// not a site-wide constant, since cadence between seasons is undecided
// (docs/spec.md). "month" precision means only the month has been
// committed to; formatRevealDate() never renders a day in that case.
export type RevealDate = { date: Date; precision: "day" | "month" };

export function formatRevealDate(reveal: RevealDate): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: reveal.precision === "day" ? "numeric" : undefined,
    year: "numeric",
  }).format(reveal.date);
}
