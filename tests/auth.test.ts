// Env is read lazily by auth.server, so set it before any calls.
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.SESSION_SECRET = "test-session-secret";

import { expect, test } from "vitest";
import {
  constantTimeEquals,
  createHostSession,
  isHost,
  requireHost,
  verifyPassword,
} from "~/host/auth.server";

test("constantTimeEquals compares without length leaks", () => {
  expect(constantTimeEquals("abc", "abc")).toBe(true);
  expect(constantTimeEquals("abc", "abd")).toBe(false);
  expect(constantTimeEquals("abc", "abcdef")).toBe(false);
  expect(constantTimeEquals("", "abc")).toBe(false);
});

test("verifyPassword accepts only the admin password", () => {
  expect(verifyPassword("test-admin-password")).toBe(true);
  expect(verifyPassword("wrong")).toBe(false);
  expect(verifyPassword("")).toBe(false);
});

test("a host session round-trips through its cookie", async () => {
  const response = await createHostSession("/host/promote");
  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("/host/promote");
  const cookie = response.headers.get("Set-Cookie");
  expect(cookie).toBeTruthy();

  const withCookie = new Request("http://localhost/host/promote", {
    headers: { Cookie: cookie! },
  });
  expect(await isHost(withCookie)).toBe(true);
});

test("no cookie or a tampered cookie is not a host", async () => {
  const bare = new Request("http://localhost/host/promote");
  expect(await isHost(bare)).toBe(false);

  const tampered = new Request("http://localhost/host/promote", {
    headers: { Cookie: "wyt_host=eyJob3N0Ijp0cnVlfQ.forged" },
  });
  expect(await isHost(tampered)).toBe(false);
});

test("requireHost redirects anonymous requests to the login page", async () => {
  const bare = new Request("http://localhost/host/promote");
  try {
    await requireHost(bare);
    throw new Error("expected requireHost to throw");
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown;
    expect(thrown.status).toBe(302);
    expect(thrown.headers.get("Location")).toBe("/host/login");
  }
});
