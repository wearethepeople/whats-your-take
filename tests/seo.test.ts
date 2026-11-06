import { describe, expect, it } from "vitest";
import { canonicalHostRedirect, isNoindexPath, pageMeta } from "~/lib/seo";

describe("canonicalHostRedirect", () => {
  it("sends www to the apex, keeping path and query", () => {
    expect(canonicalHostRedirect(new URL("https://www.whatsyourtake.us/events/x?a=1"))).toBe(
      "https://whatsyourtake.us/events/x?a=1",
    );
  });

  it("builds the destination from the canonical origin, whatever scheme arrived", () => {
    expect(canonicalHostRedirect(new URL("http://www.whatsyourtake.us/"))).toBe(
      "https://whatsyourtake.us/",
    );
  });

  it("leaves the apex alone", () => {
    expect(canonicalHostRedirect(new URL("https://whatsyourtake.us/about"))).toBeNull();
  });

  it("sends the Fly hostname to the apex, keeping path and query", () => {
    expect(canonicalHostRedirect(new URL("https://whats-your-take.fly.dev/about?a=1"))).toBe(
      "https://whatsyourtake.us/about?a=1",
    );
  });

  it("never redirects the health check, on any host", () => {
    for (const host of ["whats-your-take.fly.dev", "www.whatsyourtake.us", "172.19.0.2:8080"]) {
      expect(
        canonicalHostRedirect(new URL(`http://${host}/resources/healthcheck`)),
        host,
      ).toBeNull();
    }
  });

  it("does not match a host that merely contains fly.dev", () => {
    expect(canonicalHostRedirect(new URL("https://fly.dev.evil.test/"))).toBeNull();
  });

  it("leaves localhost alone", () => {
    expect(canonicalHostRedirect(new URL("https://localhost:5173/"))).toBeNull();
  });

  it("does not match lookalike hosts", () => {
    expect(canonicalHostRedirect(new URL("https://www.whatsyourtake.us.evil.test/"))).toBeNull();
  });
});

describe("pageMeta", () => {
  it("builds the canonical and og:url from the path, not the request", () => {
    const tags = pageMeta({ title: "T", description: "D", path: "/about" });
    expect(tags).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://whatsyourtake.us/about",
    });
    expect(tags).toContainEqual({ property: "og:url", content: "https://whatsyourtake.us/about" });
  });

  it("omits description tags when there is no description", () => {
    const tags = pageMeta({ title: "T", path: "/" });
    expect(JSON.stringify(tags)).not.toContain("description");
  });
});

describe("isNoindexPath", () => {
  it("covers the submission flow, host console and internal resources", () => {
    for (const path of [
      "/e/abc",
      "/e/abc/status/XYZ",
      "/host/login",
      "/host/events/3",
      "/resources/healthcheck",
    ]) {
      expect(isNoindexPath(path), path).toBe(true);
    }
  });

  it("leaves public pages indexable, including lookalike prefixes", () => {
    for (const path of [
      "/",
      "/about",
      "/events",
      "/events/2026-08-15-dallas",
      "/events/e/x",
      "/hosting",
    ]) {
      expect(isNoindexPath(path), path).toBe(false);
    }
  });
});
