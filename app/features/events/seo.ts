// Pure formatting (not a .server module): the meta description for a public
// event page, built only from fields the page already shows. Google builds
// search snippets from the page body itself and uses a description only when
// it summarizes the page better, so this states the stable facts — which stop,
// where, when, what state it is in — rather than excerpting the narrative.

import { SITE_NAME } from "~/lib/seo";
import { formatCityState } from "./location";
import { formatRevealDate, type RevealDate } from "./reveal-date";

type EventDescriptionInput = {
  name: string;
  city: string;
  state: string | null;
  dayLabel: string;
  stopNumber: number;
  status: "scheduled" | "up-next" | "sealed";
  liveState: "open" | "transcribing" | null;
  takeCount: number;
  revealDate: RevealDate | null;
};

// What follows "sealed until" in a description: the season's configured reveal
// date ("July 2027" or "July 4, 2027"), or "the reveal" while none is set.
export function revealPhrase(reveal: RevealDate | null): string {
  return reveal ? formatRevealDate(reveal) : "the reveal";
}

export function eventDescription(event: EventDescriptionInput): string {
  const place = formatCityState(event.city, event.state);
  const when = revealPhrase(event.revealDate);
  const sealed = `Takes are anonymous and sealed until ${when}.`;
  const lead = `${event.name} in ${place} on ${event.dayLabel}. Stop ${event.stopNumber} of the ${SITE_NAME} tour.`;

  // Not yet, or at the table now: the visitor's question is whether and how
  // to take part.
  if (event.status !== "sealed") {
    return `${lead} You can only participate in person. ${sealed}`;
  }
  // Transcribing: cards are still being entered, so the count would be stale.
  if (event.liveState != null || event.takeCount === 0) return `${lead} ${sealed}`;

  const noun = event.takeCount === 1 ? "take" : "takes";
  return `${lead} ${event.takeCount} anonymous ${noun}, sealed until ${when}.`;
}
