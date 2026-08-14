// "Bring the table to your town" requests: anonymous ZIP pointers (no
// contact info) plus an optional note — the note is also where a
// specific-venue offer ("want the table at your event?") naturally lands.
// No status/triage workflow on requests generally (view-only host surface);
// the one write action here is closing out the resolution pipeline's own
// gap — see manuallyResolve().

import { desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { tableRequests } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { resolveArea } from "./resolve-area.server";

export const requestFormSchema = z.object({
  // ZIP-only, exactly 5 digits — the public form's field is numeric-input
  // (inputMode, not type="number", to avoid the leading-zero bug) so this
  // should already be clean, but the server never trusts client input.
  area: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
});

export type RequestFields = z.output<typeof requestFormSchema>;
export type TableRequestRow = typeof tableRequests.$inferSelect;

export function createRequest(db: Db, fields: RequestFields): TableRequestRow {
  const resolved = resolveArea(fields.area);
  return db
    .insert(tableRequests)
    .values({
      area: fields.area,
      note: fields.note,
      resolvedCity: resolved?.city ?? null,
      resolvedState: resolved?.state ?? null,
      resolvedCounty: resolved?.county ?? null,
      resolvedSource: resolved ? "geonames" : null,
    })
    .returning()
    .get();
}

export function listRequests(db: Db): TableRequestRow[] {
  return db
    .select()
    .from(tableRequests)
    .orderBy(desc(tableRequests.createdAt), desc(tableRequests.id))
    .all();
}

export function needsManualResolution(db: Db): TableRequestRow[] {
  return db
    .select()
    .from(tableRequests)
    .where(isNull(tableRequests.resolvedCity))
    .orderBy(desc(tableRequests.createdAt), desc(tableRequests.id))
    .all();
}

export function manuallyResolve(
  db: Db,
  input: { id: number; city: string; state: string; county: string | null },
): void {
  db.update(tableRequests)
    .set({
      resolvedCity: input.city,
      resolvedState: input.state,
      resolvedCounty: input.county,
      resolvedSource: "manual",
    })
    .where(eq(tableRequests.id, input.id))
    .run();
}

function normalizeRaw(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export type AreaAggregate = {
  label: string;
  county: string | null;
  count: number;
  rawAreas: string[];
  lastRequestedAt: Date;
};

// Grouped/ranked by area — the point of this over a raw list is making
// demand legible. Groups by resolved "City, ST" when available (from
// either resolvedSource), else the normalized raw text.
export function areaAggregates(db: Db): AreaAggregate[] {
  const rows = listRequests(db);
  const groups = new Map<
    string,
    {
      label: string;
      county: string | null;
      rawAreas: Set<string>;
      count: number;
      lastRequestedAt: Date;
    }
  >();

  for (const row of rows) {
    const key = row.resolvedCity
      ? `${row.resolvedCity}, ${row.resolvedState}`
      : normalizeRaw(row.area);
    const label = row.resolvedCity ? `${row.resolvedCity}, ${row.resolvedState}` : row.area.trim();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.rawAreas.add(row.area);
      if (row.createdAt > existing.lastRequestedAt) existing.lastRequestedAt = row.createdAt;
    } else {
      groups.set(key, {
        label,
        county: row.resolvedCounty,
        rawAreas: new Set([row.area]),
        count: 1,
        lastRequestedAt: row.createdAt,
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      label: group.label,
      county: group.county,
      count: group.count,
      rawAreas: [...group.rawAreas],
      lastRequestedAt: group.lastRequestedAt,
    }))
    .sort((a, b) => b.count - a.count);
}
