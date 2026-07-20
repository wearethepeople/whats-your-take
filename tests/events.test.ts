import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { events, prompts, stagedDrafts } from "~/db/schema.server";
import {
  createEvent,
  eventFormSchema,
  transitionEvent,
  updateEvent,
  type EventStatus,
} from "~/events/manage.server";
import { stageDraft } from "~/submissions/stage.server";
import { freshDb, seedOpenEvent } from "./helpers";

const NOW = new Date("2026-09-01T19:23:45Z");

const FIELDS = {
  slug: "tulsa-table",
  name: "Tulsa Table",
  venue: "Guthrie Green",
  address: null,
  zip: "74103",
  city: "Tulsa",
  startsAt: new Date("2026-09-05T15:00:00Z"),
  endsAt: new Date("2026-09-05T23:00:00Z"),
};

const ALL: EventStatus[] = ["draft", "open", "closed", "archived"];
const ALLOWED = new Set(["draft→open", "open→closed", "closed→open", "closed→archived"]);

describe("transitionEvent", () => {
  it("enforces the full transition matrix", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        if (from === to) continue;
        const { db } = freshDb();
        const { event } = seedOpenEvent(db, { status: from });
        const result = transitionEvent(db, { id: event.id, to, now: NOW });
        const expected = ALLOWED.has(`${from}→${to}`);
        expect(result.ok, `${from}→${to}`).toBe(expected);
        const after = db.select().from(events).where(eq(events.id, event.id)).get();
        expect(after?.status, `${from}→${to} row status`).toBe(expected ? to : from);
      }
    }
  });

  it("refuses transitions for a missing event", () => {
    const { db } = freshDb();
    const result = transitionEvent(db, { id: 999, to: "open", now: NOW });
    expect(result.ok).toBe(false);
  });

  it("reopening a closed event re-enables staging", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db, { status: "closed" });
    expect(stageDraft(db, { slug: event.slug, body: "hello", now: NOW }).ok).toBe(false);
    expect(transitionEvent(db, { id: event.id, to: "open", now: NOW }).ok).toBe(true);
    expect(stageDraft(db, { slug: event.slug, body: "hello", now: NOW }).ok).toBe(true);
  });

  it("closing sweeps expired staged drafts", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db);
    expect(stageDraft(db, { slug: event.slug, body: "left in line", now: NOW }).ok).toBe(true);
    const afterExpiry = new Date(NOW.getTime() + 16 * 60 * 1000);
    expect(transitionEvent(db, { id: event.id, to: "closed", now: afterExpiry }).ok).toBe(true);
    expect(db.select().from(stagedDrafts).all()).toHaveLength(0);
  });
});

describe("createEvent", () => {
  it("creates an event against an existing prompt", () => {
    const { db } = freshDb();
    const { prompt } = seedOpenEvent(db);
    const result = createEvent(db, { fields: FIELDS, promptId: prompt.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.status).toBe("draft");
    expect(result.event.promptId).toBe(prompt.id);
  });

  it("creates a prompt inline when newPromptText is given", () => {
    const { db } = freshDb();
    const result = createEvent(db, {
      fields: FIELDS,
      newPromptText: "What do you owe a stranger?",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const prompt = db.select().from(prompts).where(eq(prompts.id, result.event.promptId)).get();
    expect(prompt?.text).toBe("What do you owe a stranger?");
  });

  it("refuses a duplicate slug without leaking a stray prompt row", () => {
    const { db } = freshDb();
    seedOpenEvent(db, { slug: "tulsa-table" });
    const before = db.select().from(prompts).all().length;
    const result = createEvent(db, { fields: FIELDS, newPromptText: "Should not persist" });
    expect(result).toMatchObject({ ok: false, error: "slug-taken" });
    expect(db.select().from(prompts).all()).toHaveLength(before);
  });

  it("requires a prompt one way or the other", () => {
    const { db } = freshDb();
    expect(createEvent(db, { fields: FIELDS })).toMatchObject({
      ok: false,
      error: "prompt-required",
    });
    expect(createEvent(db, { fields: FIELDS, promptId: 42 })).toMatchObject({
      ok: false,
      error: "prompt-not-found",
    });
  });
});

describe("updateEvent", () => {
  it("allows a slug change only while draft", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db, { status: "draft" });
    const draft = updateEvent(db, { id: event.id, fields: { ...FIELDS, slug: "renamed" } });
    expect(draft.ok).toBe(true);

    const { event: live } = seedOpenEvent(db, { slug: "live-event", status: "open" });
    const locked = updateEvent(db, { id: live.id, fields: { ...FIELDS, slug: "sneaky-rename" } });
    expect(locked).toMatchObject({ ok: false, error: "slug-locked" });
  });

  it("updates other fields while open, keeping the slug", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db);
    const result = updateEvent(db, {
      id: event.id,
      fields: { ...FIELDS, slug: event.slug, venue: "The Other Park" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.venue).toBe("The Other Park");
    expect(result.event.status).toBe("open");
  });

  it("refuses an unknown event", () => {
    const { db } = freshDb();
    expect(updateEvent(db, { id: 999, fields: FIELDS })).toMatchObject({
      ok: false,
      error: "not-found",
    });
  });
});

describe("eventFormSchema", () => {
  it("accepts datetime-local strings and blanks address to null", () => {
    const parsed = eventFormSchema.safeParse({
      slug: "fair-2026",
      name: "State Fair",
      venue: "Fairgrounds",
      address: "",
      zip: "75210",
      city: "Dallas",
      startsAt: "2026-09-25T10:00",
      endsAt: "2026-09-25T20:00",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.address).toBeNull();
    expect(parsed.data.startsAt).toBeInstanceOf(Date);
  });

  it("rejects an uppercase or spaced slug", () => {
    for (const slug of ["Tulsa", "tulsa table", "-tulsa"]) {
      expect(eventFormSchema.safeParse({ ...FIELDS, slug }).success, slug).toBe(false);
    }
  });
});
