// Env is read lazily by auth.server, so set it before any calls.
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.SESSION_SECRET = "test-session-secret";

import { afterEach, expect, test } from "vitest";
import * as schema from "~/db/schema.server";
import {
  createHostSession,
  createVolunteerSession,
  getVolunteer,
  isHost,
  requireHost,
  requireVolunteer,
  verifyVolunteerPassword,
} from "~/host/auth.server";
import {
  getVolunteerAccess,
  revokeVolunteerSessions,
  setVolunteerEvent,
} from "~/host/volunteer-access.server";
import { promoteDraft } from "~/submissions/promote.server";
import { stageDraft } from "~/submissions/stage.server";
import { freshDb, seedOpenEvent } from "./helpers";

afterEach(() => {
  delete process.env.VOLUNTEER_PASSWORD;
});

function requestWith(response: Response): Request {
  return new Request("http://localhost/host/volunteer", {
    headers: { Cookie: response.headers.get("Set-Cookie")! },
  });
}

async function redirectOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown;
    expect(thrown.status).toBe(302);
    return thrown.headers.get("Location");
  }
  throw new Error("expected a redirect");
}

async function volunteerRequest(db: ReturnType<typeof freshDb>["db"]) {
  const access = getVolunteerAccess(db);
  return requestWith(await createVolunteerSession(access, "/host/volunteer"));
}

test("verifyVolunteerPassword accepts only the configured volunteer password", () => {
  process.env.VOLUNTEER_PASSWORD = "test-volunteer-password";
  expect(verifyVolunteerPassword("test-volunteer-password")).toBe(true);
  expect(verifyVolunteerPassword("test-admin-password")).toBe(false);
  expect(verifyVolunteerPassword("")).toBe(false);
});

test("with no volunteer password set, nothing verifies — not even an empty guess", () => {
  expect(verifyVolunteerPassword("")).toBe(false);
  expect(verifyVolunteerPassword("anything")).toBe(false);
  process.env.VOLUNTEER_PASSWORD = "";
  expect(verifyVolunteerPassword("")).toBe(false);
});

test("a volunteer session is not a host: every requireHost gate rejects it", async () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  setVolunteerEvent(db, event.id);
  const request = await volunteerRequest(db);

  expect(await isHost(request)).toBe(false);
  expect(await redirectOf(requireHost(request))).toBe("/host/login");
});

test("a host session is not a volunteer, and bare or forged cookies are neither", async () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  setVolunteerEvent(db, event.id);

  const host = requestWith(await createHostSession("/host/events"));
  expect(await getVolunteer(host, db)).toBeNull();
  expect(await redirectOf(requireVolunteer(host, db))).toBe("/host/login");

  const bare = new Request("http://localhost/host/volunteer");
  expect(await getVolunteer(bare, db)).toBeNull();

  const forged = new Request("http://localhost/host/volunteer", {
    headers: { Cookie: "wyt_host=eyJ2b2x1bnRlZXIiOnsiZXZlbnRJZCI6MSwiZXBvY2giOjF9fQ.forged" },
  });
  expect(await getVolunteer(forged, db)).toBeNull();
});

test("a volunteer session is valid for the selected event", async () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  setVolunteerEvent(db, event.id);

  const request = await volunteerRequest(db);
  expect(await requireVolunteer(request, db)).toEqual({ eventId: event.id });
});

test("no event selected: no volunteer session can be minted", async () => {
  const { db } = freshDb();
  await expect(createVolunteerSession(getVolunteerAccess(db), "/host/volunteer")).rejects.toThrow();
});

test("switching the event signs out sessions for the old one", async () => {
  const { db } = freshDb();
  const a = seedOpenEvent(db, { slug: "event-a" });
  const b = seedOpenEvent(db, { slug: "event-b" });
  setVolunteerEvent(db, a.event.id);
  const request = await volunteerRequest(db);
  expect(await getVolunteer(request, db)).toEqual({ eventId: a.event.id });

  setVolunteerEvent(db, b.event.id);
  expect(await getVolunteer(request, db)).toBeNull();
});

test("re-selecting the same event also signs out existing sessions", async () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  setVolunteerEvent(db, event.id);
  const request = await volunteerRequest(db);

  setVolunteerEvent(db, event.id);
  expect(await getVolunteer(request, db)).toBeNull();
});

test("clearing the event signs out volunteers and leaves access off", async () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  setVolunteerEvent(db, event.id);
  const request = await volunteerRequest(db);

  setVolunteerEvent(db, null);
  expect(getVolunteerAccess(db).eventId).toBeNull();
  expect(await getVolunteer(request, db)).toBeNull();
});

test("revoke signs out volunteers but keeps the selected event", async () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  setVolunteerEvent(db, event.id);
  const request = await volunteerRequest(db);

  revokeVolunteerSessions(db);
  expect(await getVolunteer(request, db)).toBeNull();
  expect(getVolunteerAccess(db).eventId).toBe(event.id);
  // A fresh login after the revoke works.
  expect(await getVolunteer(await volunteerRequest(db), db)).toEqual({ eventId: event.id });
});

test("revoke with no settings row yet does not select an event", () => {
  const { db } = freshDb();
  revokeVolunteerSessions(db);
  expect(getVolunteerAccess(db).eventId).toBeNull();
});

test("only scheduled or open events can be selected", () => {
  const { db } = freshDb();
  const draft = seedOpenEvent(db, { slug: "d", status: "draft" });
  const closed = seedOpenEvent(db, { slug: "c", status: "closed" });
  const scheduled = seedOpenEvent(db, { slug: "s", status: "scheduled" });

  expect(setVolunteerEvent(db, draft.event.id).ok).toBe(false);
  expect(setVolunteerEvent(db, closed.event.id).ok).toBe(false);
  expect(setVolunteerEvent(db, 9999).ok).toBe(false);
  expect(getVolunteerAccess(db).eventId).toBeNull();
  expect(setVolunteerEvent(db, scheduled.event.id).ok).toBe(true);
});

test("host_settings holds at most one row", () => {
  const { db } = freshDb();
  expect(() => db.insert(schema.hostSettings).values({ id: 2 }).run()).toThrow();
});

const NOW = new Date("2026-09-01T16:47:23Z");

function stagedCode(db: ReturnType<typeof freshDb>["db"], slug: string): string {
  const result = stageDraft(db, { slug, body: "Be kind to each other.", now: NOW });
  if (!result.ok) throw new Error(`staging failed: ${result.error}`);
  return result.claimCode;
}

test("scoped promotion: own-event code promotes", () => {
  const { db } = freshDb();
  const { event } = seedOpenEvent(db);
  const code = stagedCode(db, event.slug);

  expect(promoteDraft(db, { code, now: NOW, eventId: event.id }).ok).toBe(true);
  expect(db.select().from(schema.responses).all()).toHaveLength(1);
});

test("scoped promotion: another event's code reads as unknown and stays staged", () => {
  const { db } = freshDb();
  const mine = seedOpenEvent(db, { slug: "mine" });
  const other = seedOpenEvent(db, { slug: "other" });
  const code = stagedCode(db, other.event.slug);

  const result = promoteDraft(db, { code, now: NOW, eventId: mine.event.id });
  expect(result).toMatchObject({ ok: false, error: "unknown" });
  expect(db.select().from(schema.responses).all()).toHaveLength(0);
  const draft = db.select().from(schema.stagedDrafts).get();
  expect(draft?.body).toBe("Be kind to each other.");
  expect(draft?.promotedAt).toBeNull();

  // The host (no scope) can still promote it.
  expect(promoteDraft(db, { code, now: NOW }).ok).toBe(true);
});
