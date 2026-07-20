// Single host account (I1 — no user management). A signed session cookie
// marks "is the host"; nothing else is ever stored in it.

import { createHash, timingSafeEqual } from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";
import { adminPassword, sessionSecret } from "./env.server";

type HostSessionData = { host: boolean };

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
