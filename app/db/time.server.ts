// I4: the only place response timestamps are produced. Sub-hour submission
// timing must never be stored — every insert path goes through these.

export function truncateToHour(date: Date): Date {
  const truncated = new Date(date);
  truncated.setUTCMinutes(0, 0, 0);
  return truncated;
}

export type CreatedBucket = "morning" | "midday" | "afternoon" | "evening";

export const DEFAULT_TIME_ZONE = "America/Chicago";

export function bucketFor(date: Date, timeZone: string = DEFAULT_TIME_ZONE): CreatedBucket {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  return "evening";
}
