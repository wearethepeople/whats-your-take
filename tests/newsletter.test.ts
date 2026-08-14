import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newsletterFormSchema } from "~/newsletter/schema";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimitForTests,
  sizeForTests,
  sweepForTests,
} from "~/newsletter/rate-limit.server";

describe("newsletterFormSchema", () => {
  it("trims and lowercases a valid email", () => {
    const parsed = newsletterFormSchema.safeParse({ email: "  Person@Example.COM  " });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.email).toBe("person@example.com");
  });

  it("rejects an empty or malformed email", () => {
    expect(newsletterFormSchema.safeParse({ email: "" }).success).toBe(false);
    expect(newsletterFormSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("newsletter rate limiter", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  it("allows the first call from an IP, rejects a second within the window", () => {
    const now = Date.parse("2026-09-01T12:00:00Z");
    expect(checkRateLimit("1.2.3.4", now)).toBe(true);
    expect(checkRateLimit("1.2.3.4", now + 1000)).toBe(false);
  });

  it("allows again after the window elapses", () => {
    const now = Date.parse("2026-09-01T12:00:00Z");
    expect(checkRateLimit("1.2.3.4", now)).toBe(true);
    expect(checkRateLimit("1.2.3.4", now + 10 * 60 * 1000 + 1)).toBe(true);
  });

  it("sweep removes entries older than the window, bounding memory", () => {
    const now = Date.parse("2026-09-01T12:00:00Z");
    checkRateLimit("1.2.3.4", now);
    expect(sizeForTests()).toBe(1);

    sweepForTests(now + 10 * 60 * 1000 + 1);
    expect(sizeForTests()).toBe(0);
  });
});

describe("getClientIp", () => {
  it("prefers Fly-Client-IP", () => {
    const request = new Request("https://example.com", {
      headers: { "fly-client-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });
});

describe("subscribe", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.EMMA_ACCOUNT_ID = "acct";
    process.env.EMMA_PUBLIC_KEY = "pub";
    process.env.EMMA_PRIVATE_KEY = "priv";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("throws when Emma credentials are missing", async () => {
    delete process.env.EMMA_ACCOUNT_ID;
    vi.resetModules();
    const { subscribe } = await import("~/newsletter/subscribe.server");
    await expect(subscribe("person@example.com")).rejects.toThrow(/not configured/);
  });

  it("posts to Emma's members/add endpoint with basic auth and throws on a non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { subscribe } = await import("~/newsletter/subscribe.server");

    await expect(subscribe("person@example.com")).rejects.toThrow(/Emma subscribe failed \(500\)/);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.e2ma.net/acct/members/add",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("resolves on a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { subscribe } = await import("~/newsletter/subscribe.server");

    await expect(subscribe("person@example.com")).resolves.toBeUndefined();
  });
});
