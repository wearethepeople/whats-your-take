// Area resolution for "bring the table to your town" requests. Synchronous
// and offline on purpose — no live geocoding call. USPS's Address API
// (the original pick) began requiring a paid license agreement + tier-based
// fees 2026-08-01, ruled out on cost; GeoNames' bundled postal-code export
// (CC BY 4.0 — see the attribution line on the About page) is the sole
// resolver. A static-file lookup can't fail transiently the way a live API
// call can, so there's no retry/async machinery here — a row either
// resolves at insert time or it doesn't, permanently, until the bundled
// data file itself changes in a future deploy.

import postalRows from "../data/geonames-us-postal.json";

export type ResolvedArea = {
  city: string;
  state: string;
  county: string | null;
};

export type PostalRow = [zip: string, place: string, state: string, county: string | null];

export type PostalIndexes = {
  byZip: Map<string, ResolvedArea>;
  byPlaceName: Map<string, ResolvedArea>;
};

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Exported (not just used internally) so tests can build indexes from a
// small fixture instead of the real ~41k-row bundled file.
export function buildPostalIndexes(rows: PostalRow[]): PostalIndexes {
  const byZip = new Map<string, ResolvedArea>();
  const byPlaceName = new Map<string, ResolvedArea>();
  for (const [zip, place, state, county] of rows) {
    const resolved: ResolvedArea = { city: place, state, county };
    if (!byZip.has(zip)) byZip.set(zip, resolved);
    const key = normalizePlaceName(place);
    if (!byPlaceName.has(key)) byPlaceName.set(key, resolved);
  }
  return { byZip, byPlaceName };
}

const ZIP_PATTERN = /^\d{5}$/;

// Pure and synchronous. Returns null when the dataset has no match; the
// caller stores nulls and the row becomes eligible for manual resolution
// in the host console.
export function resolveAreaWithIndexes(area: string, indexes: PostalIndexes): ResolvedArea | null {
  const trimmed = area.trim();
  if (ZIP_PATTERN.test(trimmed)) {
    return indexes.byZip.get(trimmed) ?? null;
  }
  return indexes.byPlaceName.get(normalizePlaceName(trimmed)) ?? null;
}

// Built once at module load from the bundled GeoNames US postal export.
const bundledIndexes = buildPostalIndexes(postalRows as PostalRow[]);

export function resolveArea(area: string): ResolvedArea | null {
  return resolveAreaWithIndexes(area, bundledIndexes);
}
