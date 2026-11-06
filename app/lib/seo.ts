import type { MetaDescriptor } from "react-router";

// The one canonical origin. Every absolute URL in metadata (canonical, og:url,
// og:image, the sitemap, JSON-LD) is built from this, and every other host
// that reaches the app is redirected to it (see canonicalHostRedirect).
export const SITE_ORIGIN = "https://whatsyourtake.us";
export const SITE_NAME = "What’s Your Take?";

// The organization behind the project. Its @id is the one wearethepeople.us
// declares for itself, so search engines read every reference across the
// WrTP sites as the same entity rather than a look-alike per site.
const ORG_ORIGIN = "https://wearethepeople.us";
export const ORGANIZATION_ID = `${ORG_ORIGIN}/#organization`;
export const ORGANIZATION = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "We (ARE) the People",
  url: ORG_ORIGIN,
} as const;

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

// Title, description, canonical link and the Open Graph title/description/url
// for a public page. The site-wide share image and og:type live in root.tsx.
// `path` is the page's canonical path, never the request URL — query strings
// (e.g. ?kiosk) must not reach the canonical.
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): MetaDescriptor[] {
  const url = absoluteUrl(path);
  return [
    { title },
    ...(description ? [{ name: "description", content: description }] : []),
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    ...(description ? [{ property: "og:description", content: description }] : []),
    { property: "og:url", content: url },
  ];
}

// Pages that must never appear in search: the participant submission flow,
// the host console and internal resources. Kept out with a noindex header, not
// robots.txt — a robots.txt Disallow stops crawling but not indexing, and a
// crawler blocked by it never sees a noindex, so these paths stay crawlable.
const NOINDEX_PREFIXES = ["/e/", "/host/", "/resources/"];

export function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// www and the Fly hostname serve the same site as the apex, so they are sent
// to it with a permanent redirect: one address in links and in search results.
// A 301 consolidates them outright, where a canonical tag is only a hint.
// The health check path is never redirected so Fly's checks keep answering
// whatever host they arrive on; localhost is left alone for local dev.
// Returns the destination, or null. Same rule as wearethepeople.us.
const CANONICAL_HOST = new URL(SITE_ORIGIN).hostname;
const HEALTHCHECK_PATH = "/resources/healthcheck";

export function canonicalHostRedirect(url: URL): string | null {
  if (url.pathname === HEALTHCHECK_PATH) return null;
  if (url.hostname !== `www.${CANONICAL_HOST}` && !url.hostname.endsWith(".fly.dev")) return null;
  return `${SITE_ORIGIN}${url.pathname}${url.search}`;
}
