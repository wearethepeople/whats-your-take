// Single host account (I1 — no user management). A signed session cookie
// marks "is the host"; nothing else is ever stored in it for the host.
//
// The one other shape is a volunteer session: promote-only, for the single
// event the host selected (volunteer-access.server.ts). It is a capability, not
// an account — no volunteer identity exists. It never sets `host`, so every
// requireHost() gate (the host layout middleware, the export route) rejects it
// without those routes knowing volunteers exist.

import { createHash, timingSafeEqual } from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";
import type { Db } from "~/db/types.server";
import { adminPassword, sessionSecret, volunteerPassword } from "./env.server";
import { getVolunteerAccess, type VolunteerAccess } from "./volunteer-access.server";

type HostSessionData = { host: boolean; volunteer: { eventId: number; epoch: number } };

let storage: ReturnType<typeof createCookieSessionStorage<HostSessionData>> | null = null;

// Built lazily so importing this module never throws before env is needed.
function sessionStorage() {
  storage ??= createCookieSessionStorage<HostSessionData>({
    cookie: {
      name: "wyt_host",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      secrets: [sessionSecret()],
      maxAge: 60 * 60 * 12, // a table day
    },
  });
  return storage;
}

export function constantTimeEquals(a: string, b: string): boolean {
  // Hash both sides so length never leaks and timingSafeEqual gets equal-size
  // buffers.
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

export function verifyPassword(candidate: string): boolean {
  return constantTimeEquals(candidate, adminPassword());
}

// Always runs the comparison, even with no volunteer password configured, so
// timing doesn't reveal whether volunteer access is set up.
export function verifyVolunteerPassword(candidate: string): boolean {
  const configured = volunteerPassword();
  const matches = constantTimeEquals(candidate, configured ?? "");
  return configured !== null && matches;
}

export async function createHostSession(redirectTo: string): Promise<Response> {
  const session = await sessionStorage().getSession();
  session.set("host", true);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage().commitSession(session) },
  });
}

export async function isHost(request: Request): Promise<boolean> {
  const session = await sessionStorage().getSession(request.headers.get("Cookie"));
  return session.get("host") === true;
}

export async function requireHost(request: Request): Promise<void> {
  if (!(await isHost(request))) throw redirect("/host/login");
}

// Bound to the host's current selection: the session is valid only while the
// event and epoch it was minted with still match (isVolunteerCurrent).
export async function createVolunteerSession(
  access: VolunteerAccess,
  redirectTo: string,
): Promise<Response> {
  if (access.eventId === null) throw new Error("No event is selected for volunteers.");
  const session = await sessionStorage().getSession();
  session.set("volunteer", { eventId: access.eventId, epoch: access.epoch });
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage().commitSession(session) },
  });
}

// Checked against the database on every request, so changing or clearing the
// event (or "sign out volunteers") takes effect on the very next one.
export async function getVolunteer(request: Request, db: Db): Promise<{ eventId: number } | null> {
  const session = await sessionStorage().getSession(request.headers.get("Cookie"));
  const claim = session.get("volunteer");
  if (!claim) return null;
  const access = getVolunteerAccess(db);
  if (access.eventId === null || access.eventId !== claim.eventId || access.epoch !== claim.epoch) {
    return null;
  }
  return { eventId: access.eventId };
}

export async function requireVolunteer(request: Request, db: Db): Promise<{ eventId: number }> {
  const volunteer = await getVolunteer(request, db);
  if (!volunteer) throw redirect("/host/login");
  return volunteer;
}

export async function destroySession(request: Request, redirectTo: string): Promise<Response> {
  const session = await sessionStorage().getSession(request.headers.get("Cookie"));
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage().destroySession(session) },
  });
}
