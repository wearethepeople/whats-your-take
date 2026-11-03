// Pure formatting, deliberately not a .server module: route components (not
// just loaders) render event locations. One place decides how a city and
// state read together, so every listing agrees ("Dallas, TX") and a stop
// with no state recorded yet falls back to the bare city.
export function formatCityState(city: string, state: string | null | undefined): string {
  return state ? `${city}, ${state}` : city;
}
