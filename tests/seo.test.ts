import { describe, expect, it } from "vitest";
import { canonicalHostRedirect, pageMeta } from "~/lib/seo";

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

  it("leaves the Fly hostname alone so its health check keeps answering", () => {
    expect(
      canonicalHostRedirect(new URL("https://whats-your-take.fly.dev/resources/healthcheck")),
    ).toBeNull();
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
