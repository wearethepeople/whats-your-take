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

export type AreaSuggestion = {
  label: string;
  city: string;
  state: string;
};

export type PostalIndexes = {
  byZip: Map<string, ResolvedArea>;
  byPlaceName: Map<string, ResolvedArea>;
  // Keyed by normalized "city, state" — disambiguates same-named cities in
  // different states, and is what the combobox's suggestion labels resolve
  // against (see suggestAreas below; its labels are always "City, ST").
  byLabel: Map<string, ResolvedArea>;
  // One entry per distinct "City, ST" (deduped across its ZIPs), used for
  // prefix search in suggestAreas below.
  suggestions: AreaSuggestion[];
};

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Exported (not just used internally) so tests can build indexes from a
// small fixture instead of the real ~41k-row bundled file.
export function buildPostalIndexes(rows: PostalRow[]): PostalIndexes {
  const byZip = new Map<string, ResolvedArea>();
  const byPlaceName = new Map<string, ResolvedArea>();
  const byLabel = new Map<string, ResolvedArea>();
  const suggestions: AreaSuggestion[] = [];
  for (const [zip, place, state, county] of rows) {
    const resolved: ResolvedArea = { city: place, state, county };
    if (!byZip.has(zip)) byZip.set(zip, resolved);
    const key = normalizePlaceName(place);
    if (!byPlaceName.has(key)) byPlaceName.set(key, resolved);

    const labelKey = `${key}, ${state.toLowerCase()}`;
    if (!byLabel.has(labelKey)) {
      byLabel.set(labelKey, resolved);
      suggestions.push({ label: `${place}, ${state}`, city: place, state });
    }
  }
  suggestions.sort((a, b) => a.label.localeCompare(b.label));
  return { byZip, byPlaceName, byLabel, suggestions };
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
  // "City, ST" (what the combobox submits when a suggestion is picked) is
  // tried before the bare-name index, since it disambiguates same-named
  // cities in different states and the bare index can't.
  const labelMatch = trimmed.match(/^(.+),\s*([A-Za-z]{2})$/);
  if (labelMatch) {
    const [, place, state] = labelMatch;
    const byLabel = indexes.byLabel.get(`${normalizePlaceName(place)}, ${state.toLowerCase()}`);
    if (byLabel) return byLabel;
  }
  return indexes.byPlaceName.get(normalizePlaceName(trimmed)) ?? null;
}

// Built once at module load from the bundled GeoNames US postal export.
const bundledIndexes = buildPostalIndexes(postalRows as PostalRow[]);

export function resolveArea(area: string): ResolvedArea | null {
  return resolveAreaWithIndexes(area, bundledIndexes);
}

// Prefix match for live autocomplete, not the exact match resolveArea does
// at submit time. A plain scan is plenty fast against ~41k in-memory rows
// for a debounced per-keystroke call — no index/library needed.
export function suggestAreasWithIndexes(
  query: string,
  indexes: PostalIndexes,
  limit = 8,
): AreaSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: AreaSuggestion[] = [];
  if (ZIP_PATTERN.test(trimmed) || /^\d+$/.test(trimmed)) {
    const seenLabels = new Set<string>();
    for (const [zip, resolved] of indexes.byZip) {
      if (results.length >= limit) break;
      if (!zip.startsWith(trimmed)) continue;
      const label = `${resolved.city}, ${resolved.state}`;
      // Many ZIPs can share a city (Dallas, TX has dozens) — one listing
      // per city/state, not one per matching ZIP.
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      results.push({ label, city: resolved.city, state: resolved.state });
    }
    return results;
  }

  const normalized = normalizePlaceName(trimmed);
  for (const suggestion of indexes.suggestions) {
    if (results.length >= limit) break;
    if (normalizePlaceName(suggestion.city).startsWith(normalized)) {
      results.push(suggestion);
    }
  }
  return results;
}

export function suggestAreas(query: string, limit = 8): AreaSuggestion[] {
  return suggestAreasWithIndexes(query, bundledIndexes, limit);
}
