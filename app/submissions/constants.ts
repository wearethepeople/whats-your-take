// Shared between server modules and client components (no .server suffix on
// purpose — nothing here is secret).

export const MAX_BODY_LENGTH = 2000;
export const DRAFT_TTL_MINUTES = 15;

// Stands in for a name, in a transcribed card or a redacted digital response
// (I1/I5). For a card the scan is the record; for a digital response nothing
// is, since the original text is not kept.
export const NAME_PLACEHOLDER = "[name written]";
