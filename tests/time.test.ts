import { expect, test } from "vitest";
import { bucketFor, truncateToHour } from "~/db/time.server";

test("truncateToHour zeroes minutes, seconds, and milliseconds", () => {
  const truncated = truncateToHour(new Date("2026-09-01T16:47:23.456Z"));
  expect(truncated.toISOString()).toBe("2026-09-01T16:00:00.000Z");
});

test("truncateToHour leaves an on-the-hour date unchanged", () => {
  const truncated = truncateToHour(new Date("2026-09-01T09:00:00.000Z"));
  expect(truncated.toISOString()).toBe("2026-09-01T09:00:00.000Z");
});

test("bucketFor maps local (America/Chicago) hours to coarse buckets", () => {
  // 15:00Z = 10:00 CDT → morning
  expect(bucketFor(new Date("2026-09-01T15:00:00Z"))).toBe("morning");
  // 17:00Z = 12:00 CDT → midday
  expect(bucketFor(new Date("2026-09-01T17:00:00Z"))).toBe("midday");
  // 20:00Z = 15:00 CDT → afternoon
  expect(bucketFor(new Date("2026-09-01T20:00:00Z"))).toBe("afternoon");
  // 01:00Z = 20:00 CDT previous evening → evening
  expect(bucketFor(new Date("2026-09-02T01:00:00Z"))).toBe("evening");
});
