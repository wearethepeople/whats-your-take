// Lightweight anti-spam for the public, unauthenticated "bring the table to
// your town" form — no equivalent to the participant flow's claim-code/
// host-promotion gate exists here. In-memory, per-IP, never persisted: the
// IP is read only to make an allow/reject decision for a few minutes, never
// logged, never written to the database, gone on every restart. Real
// throttling without adding IP logging to the app layer.

const WINDOW_MS = 10 * 60 * 1000;
// Defense-in-depth backstop against a flood of unique IPs between sweeps —
// bounds worst-case memory regardless of traffic pattern.
const MAX_TRACKED_IPS = 5000;

const lastAllowedAt = new Map<string, number>();

function sweep(now: number): void {
  const cutoff = now - WINDOW_MS;
  for (const [ip, at] of lastAllowedAt) {
    if (at < cutoff) lastAllowedAt.delete(ip);
  }
}

// Steady-state size tracks "distinct IPs active in the last WINDOW_MS" —
// trivial for this site's traffic. Runs independently of any request;
// unref'd so it never blocks process exit (relevant for tests/shutdown).
const sweepTimer = setInterval(() => sweep(Date.now()), WINDOW_MS);
sweepTimer.unref();

// Test-only: exercise the sweep logic directly with an explicit clock,
// rather than waiting on the real setInterval.
export function sweepForTests(now: number): void {
  sweep(now);
}

export function checkRateLimit(ip: string, now: number = Date.now()): boolean {
  if (lastAllowedAt.size >= MAX_TRACKED_IPS) lastAllowedAt.clear();
  const last = lastAllowedAt.get(ip);
  if (last !== undefined && now - last < WINDOW_MS) return false;
  lastAllowedAt.set(ip, now);
  return true;
}

// Test-only escape hatches — production code never needs these.
export function resetRateLimitForTests(): void {
  lastAllowedAt.clear();
}

export function sizeForTests(): number {
  return lastAllowedAt.size;
}

export function getClientIp(request: Request): string {
  const flyClientIp = request.headers.get("fly-client-ip");
  if (flyClientIp) return flyClientIp;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return "unknown";
}
