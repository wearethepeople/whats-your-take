import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { exportRows, toCsv, toJson } from "~/submissions/export.server";
import { approveResponse, hideResponse } from "~/submissions/moderate.server";
import { insertResponse } from "~/submissions/write.server";
import { freshDb, seedOpenEvent } from "./helpers";

const NOW = new Date("2026-09-01T19:23:45Z");

function seedApproved(db: Db, promptId: number, eventId: number, body: string, now = NOW) {
  const row = insertResponse(db, { promptId, eventId, body, channel: "site", now });
  expect(approveResponse(db, row.id).ok).toBe(true);
  return row;
}

describe("exportRows", () => {
  it("exports only approved rows, with exactly the four public fields", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    seedApproved(db, prompt.id, event.id, "approved take");
    insertResponse(db, {
      promptId: prompt.id,
      eventId: event.id,
      body: "still pending",
      channel: "site",
      now: NOW,
    });
    const toHide = insertResponse(db, {
      promptId: prompt.id,
      eventId: event.id,
      body: "hidden take",
      channel: "card",
      now: NOW,
    });
    expect(hideResponse(db, toHide.id).ok).toBe(true);
    // A card, approved: created_bucket must be null, never a fabricated bucket.
    const cardRow = insertResponse(db, {
      promptId: prompt.id,
      eventId: event.id,
      body: "from a card",
      channel: "card",
      now: NOW,
    });
    expect(approveResponse(db, cardRow.id).ok).toBe(true);

    const rows = exportRows(db, event.id);
    expect(rows).toHaveLength(2);
    // Structural I4/I2 check: no id, no created_at — these keys and no others.
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      "body",
      "channel",
      "created_bucket",
      "showcase",
    ]);
    expect(rows.find((row) => row.channel === "site")).toEqual({
      body: "approved take",
      channel: "site",
      created_bucket: "afternoon",
      showcase: false,
    });
    // Card rows carry no bucket — the insert moment is transcription time,
    // not when the card was written at the table.
    expect(rows.find((row) => row.channel === "card")).toEqual({
      body: "from a card",
      channel: "card",
      created_bucket: null,
      showcase: false,
    });
  });

  it("orders by (created_at, body), never by insertion sequence", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    // Same hour, inserted out of alphabetical order.
    seedApproved(db, prompt.id, event.id, "zebra");
    seedApproved(db, prompt.id, event.id, "apple");
    // An earlier hour, inserted last.
    seedApproved(
      db,
      prompt.id,
      event.id,
      "later-hour-first-alpha",
      new Date("2026-09-01T17:10:00Z"),
    );

    expect(exportRows(db, event.id).map((row) => row.body)).toEqual([
      "later-hour-first-alpha",
      "apple",
      "zebra",
    ]);
  });

  it("ignores other events", () => {
    const { db } = freshDb();
    const { event } = seedOpenEvent(db);
    const other = seedOpenEvent(db, { slug: "event-two" });
    seedApproved(db, other.prompt.id, other.event.id, "elsewhere");
    expect(exportRows(db, event.id)).toHaveLength(0);
  });
});

describe("toCsv", () => {
  it("writes the exact header and quotes bodies unconditionally", () => {
    const csv = toCsv([
      { body: "plain", channel: "site", created_bucket: "evening", showcase: true },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("body,channel,created_bucket,showcase");
    expect(lines[1]).toBe('"plain",site,evening,true');
  });

  it("writes an empty created_bucket field for a card row (no bucket to show)", () => {
    const csv = toCsv([
      { body: "card take", channel: "card", created_bucket: null, showcase: false },
    ]);
    expect(csv).toBe('body,channel,created_bucket,showcase\r\n"card take",card,,false\r\n');
  });

  it("escapes commas, quotes, and newlines per RFC 4180 without altering bytes", () => {
    const body = 'a, "quoted" line\nsecond line';
    const csv = toCsv([{ body, channel: "card", created_bucket: "midday", showcase: false }]);
    expect(csv).toBe(
      'body,channel,created_bucket,showcase\r\n"a, ""quoted"" line\nsecond line",card,midday,false\r\n',
    );
    // A leading = stays byte-faithful — quoted, never apostrophe-prefixed.
    const formula = toCsv([
      { body: "=1+1", channel: "site", created_bucket: "morning", showcase: false },
    ]);
    expect(formula).toContain('"=1+1"');
    expect(formula).not.toContain("'=");
  });
});

describe("toJson", () => {
  it("round-trips rows with snake_case keys", () => {
    const rows = [{ body: "take", channel: "site", created_bucket: "evening", showcase: false }];
    expect(JSON.parse(toJson(rows))).toEqual(rows);
  });
});

describe("moderation + export integration", () => {
  it("a hidden row never reaches the export even after being approved once", () => {
    const { db } = freshDb();
    const { prompt, event } = seedOpenEvent(db);
    const row = seedApproved(db, prompt.id, event.id, "was public once");
    expect(exportRows(db, event.id)).toHaveLength(1);
    expect(hideResponse(db, row.id).ok).toBe(true);
    expect(exportRows(db, event.id)).toHaveLength(0);
    // …but the archive still holds it (I5).
    expect(db.select().from(responses).where(eq(responses.id, row.id)).get()?.status).toBe(
      "hidden",
    );
  });
});
