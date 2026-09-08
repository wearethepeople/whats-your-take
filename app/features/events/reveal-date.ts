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

// Prose announcing a reveal date needs a label and a preposition that
// agrees with it — "on" fits a specific day, but a month-only commitment
// ("in July 2027") reads wrong with "on". One function decides both so
// every screen that announces the reveal date agrees with every other.
export type RevealAnnouncement = { label: string; preposition: "on" | "in" };

export function revealAnnouncement(reveal: RevealDate | null): RevealAnnouncement | null {
  if (!reveal) return null;
  return {
    label: formatRevealDate(reveal),
    preposition: reveal.precision === "month" ? "in" : "on",
  };
}
