import { expect, test } from "vitest";
import * as schema from "~/db/schema.server";
import { freshDb } from "./helpers";

test("migrations apply and WAL mode is active", () => {
  const { sqlite } = freshDb();
  expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
  const tables = sqlite
    .prepare("select name from sqlite_master where type = 'table'")
    .all()
    .map((row) => (row as { name: string }).name);
  expect(tables).toEqual(
    expect.arrayContaining(["prompts", "events", "responses", "staged_drafts", "presence_windows"]),
  );
});

test("status defaults: event draft, response pending, showcase false", () => {
  const { db } = freshDb();
  const prompt = db
    .insert(schema.prompts)
    .values({ text: "What would you remind an American in 2075?" })
    .returning()
    .get();
  const event = db
    .insert(schema.events)
    .values({
      slug: "event-one",
      promptId: prompt.id,
      name: "Event One",
      venue: "The Park",
      zip: "75201",
      city: "Dallas",
      startsAt: new Date("2026-09-01T15:00:00Z"),
      endsAt: new Date("2026-09-01T23:00:00Z"),
    })
    .returning()
    .get();
  expect(event.status).toBe("draft");

  const response = db
    .insert(schema.responses)
    .values({
      promptId: prompt.id,
      eventId: event.id,
      body: "Be kind to each other.",
      channel: "card",
      createdAt: new Date("2026-09-01T16:00:00Z"),
      createdBucket: "morning",
    })
    .returning()
    .get();
  expect(response.status).toBe("pending");
  expect(response.showcase).toBe(false);
});
