// Event lifecycle: CRUD + the status machine. Status is manual, by design —
// nothing here reads starts_at/ends_at ("the host clears the line, then
// closes"). Responses never appear in this module; counts live in
// counts.server.ts and the responses lifecycle stays in app/submissions/.

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { isUniqueViolation } from "~/db/errors.server";
import { events, prompts } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { sweepExpired } from "~/submissions/stage.server";

export type EventStatus = "draft" | "open" | "closed" | "archived";
export type EventRow = typeof events.$inferSelect;

// Allowed transitions, keyed by target: which source states may reach it.
// closed→open reopen is allowed (a table that closes early can resume);
// archived is the one-way terminal gate; nothing returns to draft.
export const TRANSITION_SOURCES: Record<EventStatus, EventStatus[]> = {
  draft: [],
  open: ["draft", "closed"],
  closed: ["open"],
  archived: ["closed"],
};

// Form fields shared by create and edit. starts/ends are informational —
// datetime-local strings parsed as server-local time, gated on by nothing.
export const eventFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug is lowercase letters, digits, and dashes."),
  name: z.string().trim().min(1, "Name the event."),
  venue: z.string().trim().min(1, "Name the venue."),
  address: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  zip: z.string().trim().min(1, "ZIP is required."),
  city: z.string().trim().min(1, "City is required."),
  startsAt: z.coerce.date({ message: "Start time is required." }),
  endsAt: z.coerce.date({ message: "End time is required." }),
});

export type EventFields = z.output<typeof eventFormSchema>;

export type CreateEventError =
  | "slug-taken"
  | "prompt-required"
  | "prompt-not-found"
  | "season-active";
export type CreateEventResult =
  | { ok: true; event: EventRow }
  | { ok: false; error: CreateEventError; message: string };

export function createEvent(
  db: Db,
  input: {
    fields: EventFields;
    promptId?: number;
    newPromptText?: string;
    newPromptSeasonLabel?: string;
  },
): CreateEventResult {
  return db.transaction((tx): CreateEventResult => {
    // Slug check by select, not by catching the unique violation: the inline
    // prompt insert below must not survive a failed event insert, and the
    // single synchronous SQLite connection makes select-then-insert safe.
    const taken = tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, input.fields.slug))
      .get();
    if (taken) {
      return { ok: false, error: "slug-taken", message: "That slug is already in use." };
    }

    let promptId: number;
    const newPromptText = input.newPromptText?.trim();
    if (newPromptText) {
      // At most one prompt may be active (retired_at IS NULL) at a time —
      // enforced by the prompts_single_active_season index, checked here
      // by select first for the same reason as the slug check above.
      const active = tx
        .select({ id: prompts.id })
        .from(prompts)
        .where(isNull(prompts.retiredAt))
        .get();
      if (active) {
        return {
          ok: false,
          error: "season-active",
          message: "A season is already active — retire its prompt before starting a new one.",
        };
      }
      // seasonLabel is optional — public copy falls back to an ordinal
      // label derived from creation order when unset (see
      // currentSeason() in season.server.ts).
      const seasonLabel = input.newPromptSeasonLabel?.trim() || null;
      promptId = tx
        .insert(prompts)
        .values({ text: newPromptText, seasonLabel })
        .returning()
        .get().id;
    } else if (input.promptId != null) {
      const prompt = tx
        .select({ id: prompts.id })
        .from(prompts)
        .where(eq(prompts.id, input.promptId))
        .get();
      if (!prompt) {
        return { ok: false, error: "prompt-not-found", message: "That prompt no longer exists." };
      }
      promptId = prompt.id;
    } else {
      return { ok: false, error: "prompt-required", message: "Pick a prompt or write a new one." };
    }

    const event = tx
      .insert(events)
      .values({ ...input.fields, promptId })
      .returning()
      .get();
    return { ok: true, event };
  });
}

export type UpdateEventError = "not-found" | "slug-locked" | "slug-taken";
export type UpdateEventResult =
  | { ok: true; event: EventRow }
  | { ok: false; error: UpdateEventError; message: string };

export function updateEvent(db: Db, input: { id: number; fields: EventFields }): UpdateEventResult {
  const existing = db.select().from(events).where(eq(events.id, input.id)).get();
  if (!existing) {
    return { ok: false, error: "not-found", message: "No such event." };
  }
  if (input.fields.slug !== existing.slug && existing.status !== "draft") {
    // The slug is on printed QR codes once the event leaves draft.
    return {
      ok: false,
      error: "slug-locked",
      message: "The slug can only change while the event is a draft — it's on the printed QR.",
    };
  }
  try {
    const event = db
      .update(events)
      .set(input.fields)
      .where(eq(events.id, input.id))
      .returning()
      .get();
    return { ok: true, event };
  } catch (cause) {
    if (isUniqueViolation(cause)) {
      return { ok: false, error: "slug-taken", message: "That slug is already in use." };
    }
    throw cause;
  }
}

export type TransitionError = "invalid-transition";
export type TransitionResult =
  | { ok: true }
  | { ok: false; error: TransitionError; message: string };

export function transitionEvent(
  db: Db,
  input: { id: number; to: EventStatus; now: Date },
): TransitionResult {
  const sources = TRANSITION_SOURCES[input.to];
  // Guarded UPDATE: the legal-source check lives in the WHERE clause, so
  // terminality (archived, and hidden-style dead ends) is atomic — no
  // read-then-write race.
  const changes =
    sources.length === 0
      ? 0
      : db
          .update(events)
          .set({ status: input.to })
          .where(and(eq(events.id, input.id), inArray(events.status, sources)))
          .run().changes;
  if (changes === 0) {
    return {
      ok: false,
      error: "invalid-transition",
      message: `The event can't move to “${input.to}” from its current status.`,
    };
  }
  if (input.to === "closed") {
    // "The host clears the line, then closes" — close is exactly when
    // leftover claim codes should die.
    sweepExpired(db, input.now);
  }
  return { ok: true };
}

export function listEvents(db: Db): EventRow[] {
  return db.select().from(events).orderBy(desc(events.createdAt), desc(events.id)).all();
}

export function getEvent(db: Db, id: number): EventRow | undefined {
  return db.select().from(events).where(eq(events.id, id)).get();
}

export function listActivePrompts(db: Db): { id: number; text: string }[] {
  return db
    .select({ id: prompts.id, text: prompts.text })
    .from(prompts)
    .where(isNull(prompts.retiredAt))
    .orderBy(desc(prompts.createdAt), desc(prompts.id))
    .all();
}
