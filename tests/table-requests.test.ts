import { beforeEach, describe, expect, it } from "vitest";
import {
  areaAggregates,
  createRequest,
  listRequests,
  manuallyResolve,
  needsManualResolution,
  requestFormSchema,
} from "~/features/table-requests/services/table-requests.server";
import {
  buildPostalIndexes,
  resolveAreaWithIndexes,
  type PostalRow,
} from "~/features/table-requests/services/resolve-area.server";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimitForTests,
  sizeForTests,
  sweepForTests,
} from "~/features/table-requests/services/rate-limit.server";
import { freshDb } from "./helpers";

describe("requestFormSchema", () => {
  it("trims area, blanks note to null", () => {
    const parsed = requestFormSchema.safeParse({ area: "  76102  ", note: "" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.area).toBe("76102");
    expect(parsed.data.note).toBeNull();
  });

  it("rejects empty, whitespace-only, non-numeric, or wrong-length area", () => {
    expect(requestFormSchema.safeParse({ area: "", note: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ area: "   ", note: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ area: "Dallas", note: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ area: "1234", note: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ area: "123456", note: "" }).success).toBe(false);
  });

  it("accepts a valid 5-digit ZIP", () => {
    expect(requestFormSchema.safeParse({ area: "76102", note: "" }).success).toBe(true);
  });

  // The public field is a text input (inputMode="numeric" + pattern), not
  // type="number", specifically so a leading zero survives — type="number"
  // is well known to strip it (e.g. Boston's 02134 becomes 2134).
  it("preserves a leading zero in the ZIP", () => {
    const parsed = requestFormSchema.safeParse({ area: "02134", note: "" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.area).toBe("02134");
  });
});

describe("createRequest", () => {
  // These use the real bundled GeoNames data (createRequest doesn't inject
  // a resolver) — 76102 (Fort Worth, TX, Tarrant county) is a stable,
  // known-good fixture ZIP verified against the bundled file.
  it("resolves and stores city/state/county for a known ZIP", () => {
    const { db } = freshDb();
    const row = createRequest(db, { area: "76102", note: null });
    expect(row.resolvedCity).toBe("Fort Worth");
    expect(row.resolvedState).toBe("TX");
    expect(row.resolvedCounty).toBe("Tarrant");
    expect(row.resolvedSource).toBe("geonames");
  });

  it("resolves a ZIP with a leading zero without dropping it", () => {
    const { db } = freshDb();
    const row = createRequest(db, { area: "02134", note: null });
    expect(row.area).toBe("02134");
    expect(row.resolvedCity).toBe("Allston");
    expect(row.resolvedState).toBe("MA");
  });

  // The public form only accepts a 5-digit ZIP now (requestFormSchema
  // enforces it), but createRequest()/resolveArea() still support a
  // non-ZIP place-name lookup at this layer — exercised directly here.
  it("resolves a known city name via the place-name index", () => {
    const { db } = freshDb();
    const row = createRequest(db, { area: "Fort Worth", note: null });
    expect(row.resolvedCity).toBe("Fort Worth");
    expect(row.resolvedState).toBe("TX");
    expect(row.resolvedSource).toBe("geonames");
  });

  it("leaves resolution fields null for an unresolvable area", () => {
    const { db } = freshDb();
    const row = createRequest(db, { area: "Definitely Not A Real Place Xyz", note: null });
    expect(row.resolvedCity).toBeNull();
    expect(row.resolvedState).toBeNull();
    expect(row.resolvedCounty).toBeNull();
    expect(row.resolvedSource).toBeNull();
  });
});

describe("listRequests", () => {
  it("returns newest first", () => {
    const { db } = freshDb();
    createRequest(db, { area: "First", note: null });
    createRequest(db, { area: "Second", note: null });
    const rows = listRequests(db);
    expect(rows.map((row) => row.area)).toEqual(["Second", "First"]);
  });
});

describe("needsManualResolution", () => {
  it("returns exactly the unresolved rows", () => {
    const { db } = freshDb();
    createRequest(db, { area: "76102", note: null }); // resolves
    createRequest(db, { area: "Nowhere At All Xyz", note: null }); // doesn't
    const pending = needsManualResolution(db);
    expect(pending).toHaveLength(1);
    expect(pending[0].area).toBe("Nowhere At All Xyz");
  });
});

describe("manuallyResolve", () => {
  it("sets resolved fields and resolvedSource: manual, clearing it from needsManualResolution", () => {
    const { db } = freshDb();
    const row = createRequest(db, { area: "Nowhere At All Xyz", note: null });
    expect(needsManualResolution(db)).toHaveLength(1);

    manuallyResolve(db, { id: row.id, city: "Somewhere", state: "TX", county: "Made Up" });

    const [updated] = listRequests(db);
    expect(updated.resolvedCity).toBe("Somewhere");
    expect(updated.resolvedState).toBe("TX");
    expect(updated.resolvedCounty).toBe("Made Up");
    expect(updated.resolvedSource).toBe("manual");
    expect(needsManualResolution(db)).toHaveLength(0);
  });
});

describe("areaAggregates", () => {
  it("groups by resolved City, ST, counts, orders by count descending, surfaces rawAreas", () => {
    const { db } = freshDb();
    createRequest(db, { area: "76102", note: null }); // Fort Worth, TX
    createRequest(db, { area: "Fort Worth", note: null }); // same group
    createRequest(db, { area: "76101", note: null }); // also Fort Worth, TX
    createRequest(db, { area: "Nowhere At All Xyz", note: null }); // unresolved, own group

    const aggregates = areaAggregates(db);
    expect(aggregates[0]).toMatchObject({ label: "Fort Worth, TX", count: 3 });
    expect(aggregates[0].rawAreas.sort()).toEqual(["76101", "76102", "Fort Worth"]);
    expect(aggregates[1]).toMatchObject({ label: "Nowhere At All Xyz", count: 1 });
  });

  it("groups unresolved entries by normalized raw text, case/whitespace-insensitively", () => {
    const { db } = freshDb();
    createRequest(db, { area: "  Nowhere Xyz  ", note: null });
    createRequest(db, { area: "nowhere   xyz", note: null });

    const aggregates = areaAggregates(db);
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].count).toBe(2);
  });
});

describe("resolveAreaWithIndexes", () => {
  const fixture: PostalRow[] = [
    ["12345", "Testville", "TS", "Test County"],
    ["54321", "No County Town", "NC", null],
  ];
  const indexes = buildPostalIndexes(fixture);

  it("resolves a ZIP-shaped input via the ZIP index", () => {
    expect(resolveAreaWithIndexes("12345", indexes)).toEqual({
      city: "Testville",
      state: "TS",
      county: "Test County",
    });
  });

  it("resolves a non-ZIP input via the normalized place-name index", () => {
    expect(resolveAreaWithIndexes("  testville  ", indexes)).toEqual({
      city: "Testville",
      state: "TS",
      county: "Test County",
    });
  });

  it("returns null when neither index has a match", () => {
    expect(resolveAreaWithIndexes("99999", indexes)).toBeNull();
    expect(resolveAreaWithIndexes("Nowhere", indexes)).toBeNull();
  });

  it("handles a null county", () => {
    expect(resolveAreaWithIndexes("54321", indexes)).toEqual({
      city: "No County Town",
      state: "NC",
      county: null,
    });
  });
});

describe("rate limiter", () => {
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

  it("tracks different IPs independently", () => {
    const now = Date.parse("2026-09-01T12:00:00Z");
    expect(checkRateLimit("1.2.3.4", now)).toBe(true);
    expect(checkRateLimit("5.6.7.8", now)).toBe(true);
  });

  it("sweep removes entries older than the window, bounding memory", () => {
    const now = Date.parse("2026-09-01T12:00:00Z");
    checkRateLimit("1.2.3.4", now);
    checkRateLimit("5.6.7.8", now);
    expect(sizeForTests()).toBe(2);

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

  it("falls back to the first hop of X-Forwarded-For", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "5.6.7.8, 9.9.9.9" },
    });
    expect(getClientIp(request)).toBe("5.6.7.8");
  });

  it("falls back to unknown when neither header is present", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});
