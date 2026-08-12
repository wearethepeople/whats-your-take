// Event lifecycle: CRUD + the status machine. Status is manual, by design —
// nothing here reads starts_at/ends_at ("the host clears the line, then
// closes"). Responses never appear in this module; counts live in
// counts.server.ts and the responses lifecycle stays in app/submissions/.

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { isUniqueViolation } from "~/db/errors.server";
import { events, prompts, responses } from "~/db/schema.server";
import type { Db, Tx } from "~/db/types.server";
import { seasonLabels, type RevealDate } from "./season.server";
import { sweepExpired } from "~/submissions/stage.server";

export type EventStatus = "draft" | "scheduled" | "open" | "closed" | "archived";
export type EventRow = typeof events.$inferSelect;

// Allowed transitions, keyed by target: which source states may reach it.
// draft→open direct path stays (impromptu events skip announcing ahead of
// time); closed→open reopen is allowed (a table that closes early can
// resume); archived is the one-way terminal gate; nothing returns to draft.
export const TRANSITION_SOURCES: Record<EventStatus, EventStatus[]> = {
  draft: [],
  scheduled: ["draft"],
  open: ["draft", "scheduled", "closed"],
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
  // Nullable: a scheduled event may be public before venue/zip are locked
  // down. Required before the event can transition to "open" — see
  // transitionEvent's readiness gate below.
  venue: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  address: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  zip: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  city: z.string().trim().min(1, "City is required."),
  startsAt: z.coerce.date({ message: "Start time is required." }),
  endsAt: z.coerce.date({ message: "End time is required." }),
  narrative: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
});

export type EventFields = z.output<typeof eventFormSchema>;

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateKebab(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// date+city composite for the public URL, generated once at creation and
// never touched again (see the schema comment on events.publicSlug) — a
// suffix is appended only on the rare collision (two stops, same city,
// same day).
function generatePublicSlug(tx: Tx, city: string, startsAt: Date): string {
  const base = `${dateKebab(startsAt)}-${slugifyCity(city)}`;
  let candidate = base;
  for (let suffix = 2; ; suffix++) {
    const taken = tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.publicSlug, candidate))
      .get();
    if (!taken) return candidate;
    candidate = `${base}-${suffix}`;
  }
}

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
          message: "A season is already active. Retire its prompt before starting a new one.",
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

    const publicSlug = generatePublicSlug(tx, input.fields.city, input.fields.startsAt);
    const event = tx
      .insert(events)
      .values({ ...input.fields, promptId, publicSlug })
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
      message: "The slug can only change while the event is a draft. It's on the printed QR.",
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

export type TransitionError = "invalid-transition" | "incomplete";
export type TransitionResult =
  | { ok: true }
  | { ok: false; error: TransitionError; message: string };

export function transitionEvent(
  db: Db,
  input: { id: number; to: EventStatus; now: Date },
): TransitionResult {
  if (input.to === "open") {
    // Pre-check, not part of the guarded UPDATE below: this can't be raced
    // by two hosts against a single-writer SQLite instance the way the
    // legal-source transition race is guarded against.
    const current = db
      .select({ venue: events.venue, zip: events.zip })
      .from(events)
      .where(eq(events.id, input.id))
      .get();
    if (current && (!current.venue || !current.zip)) {
      return {
        ok: false,
        error: "incomplete",
        message: "Add a venue and ZIP before opening.",
      };
    }
  }
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

export type PromptAdminRow = {
  id: number;
  text: string;
  seasonLabel: string | null;
  // The label public copy actually renders — seasonLabel, or the ordinal
  // fallback (see seasonLabels() in season.server.ts) when unset. Shown as
  // the field's placeholder so an empty label doesn't read as blank.
  resolvedLabel: string;
  createdAt: Date;
  retiredAt: Date | null;
  eventCount: number;
  // Every response on every one of the prompt's events, all statuses — a
  // host participation total, same "all statuses" posture as liveCount()
  // (counts.server.ts), not the public/approved-only corpus count.
  takeCount: number;
  // "May 2026 — July 2026" (or a single month if all events land in one),
  // derived from event startsAt the same way archiveView()'s
  // dateRangeLabel is — null when the prompt has no events yet.
  dateRangeLabel: string | null;
  revealDate: RevealDate | null;
};

function monthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

// Every prompt (active + retired), newest-first, each with the season-level
// stats a host admin needs: how many events, how many takes across all of
// them, and the date range they span. The list view the "no prompt
// management interface" open item calls for (docs/spec.md, "Open items").
export function listPromptsAdmin(db: Db): PromptAdminRow[] {
  const rows = db.select().from(prompts).orderBy(desc(prompts.createdAt), desc(prompts.id)).all();

  const eventRows = db
    .select({ id: events.id, promptId: events.promptId, startsAt: events.startsAt })
    .from(events)
    .all();
  const eventsByPrompt = new Map<number, { id: number; startsAt: Date }[]>();
  for (const row of eventRows) {
    const list = eventsByPrompt.get(row.promptId) ?? [];
    list.push({ id: row.id, startsAt: row.startsAt });
    eventsByPrompt.set(row.promptId, list);
  }

  const takeRows = db
    .select({ eventId: responses.eventId, n: count() })
    .from(responses)
    .groupBy(responses.eventId)
    .all();
  const takesByEvent = new Map(takeRows.map((row) => [row.eventId, row.n]));

  const labels = seasonLabels(db);

  return rows.map((prompt) => {
    const promptEvents = eventsByPrompt.get(prompt.id) ?? [];
    const takeCount = promptEvents.reduce(
      (sum, event) => sum + (takesByEvent.get(event.id) ?? 0),
      0,
    );
    let dateRangeLabel: string | null = null;
    if (promptEvents.length > 0) {
      const sorted = [...promptEvents].sort(
        (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
      );
      const earliest = monthYear(sorted[0].startsAt);
      const latest = monthYear(sorted[sorted.length - 1].startsAt);
      dateRangeLabel = earliest === latest ? earliest : `${earliest} — ${latest}`;
    }
    return {
      id: prompt.id,
      text: prompt.text,
      seasonLabel: prompt.seasonLabel,
      resolvedLabel: labels.get(prompt.id) ?? "",
      createdAt: prompt.createdAt,
      retiredAt: prompt.retiredAt,
      eventCount: promptEvents.length,
      takeCount,
      dateRangeLabel,
      revealDate: prompt.revealDate
        ? { date: prompt.revealDate, precision: prompt.revealPrecision ?? "day" }
        : null,
    };
  });
}

export type RetirePromptError = "not-found" | "already-retired" | "events-active";
export type RetirePromptResult =
  | { ok: true }
  | { ok: false; error: RetirePromptError; message: string };

// Retiring closes a season. Blocked while any of the prompt's events is
// still open/scheduled — submissions are gated on event.status, not
// retiredAt (see app/submissions/), so retiring underneath a live table
// wouldn't stop it from taking responses; it would just make the season
// state lie.
export function retirePrompt(db: Db, id: number): RetirePromptResult {
  const prompt = db.select().from(prompts).where(eq(prompts.id, id)).get();
  if (!prompt) return { ok: false, error: "not-found", message: "No such prompt." };
  if (prompt.retiredAt) {
    return { ok: false, error: "already-retired", message: "That prompt is already retired." };
  }
  const liveEvent = db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.promptId, id), inArray(events.status, ["open", "scheduled"])))
    .get();
  if (liveEvent) {
    return {
      ok: false,
      error: "events-active",
      message: "Close or archive this season's open/scheduled events before retiring its prompt.",
    };
  }
  db.update(prompts).set({ retiredAt: new Date() }).where(eq(prompts.id, id)).run();
  return { ok: true };
}

export type UpdatePromptSeasonLabelResult = { ok: true } | { ok: false; message: string };

export function updatePromptSeasonLabel(
  db: Db,
  id: number,
  seasonLabel: string | null,
): UpdatePromptSeasonLabelResult {
  const prompt = db.select({ id: prompts.id }).from(prompts).where(eq(prompts.id, id)).get();
  if (!prompt) return { ok: false, message: "No such prompt." };
  db.update(prompts).set({ seasonLabel }).where(eq(prompts.id, id)).run();
  return { ok: true };
}

export type UpdatePromptRevealDateResult = { ok: true } | { ok: false; message: string };

// input null clears the reveal date entirely (both columns) — a season can
// go back to "not yet announced" if a host needs to walk a date back.
export function updatePromptRevealDate(
  db: Db,
  id: number,
  input: RevealDate | null,
): UpdatePromptRevealDateResult {
  const prompt = db.select({ id: prompts.id }).from(prompts).where(eq(prompts.id, id)).get();
  if (!prompt) return { ok: false, message: "No such prompt." };
  db.update(prompts)
    .set({ revealDate: input?.date ?? null, revealPrecision: input?.precision ?? null })
    .where(eq(prompts.id, id))
    .run();
  return { ok: true };
}
