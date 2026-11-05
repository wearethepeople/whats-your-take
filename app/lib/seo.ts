import type { MetaDescriptor } from "react-router";

// The one canonical origin. Every absolute URL in metadata (canonical, og:url,
// og:image, the sitemap, JSON-LD) is built from this, so the site presents a
// single address even though the Fly hostname serves identical content.
export const SITE_ORIGIN = "https://whatsyourtake.us";
export const SITE_NAME = "What’s Your Take?";

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

// www.whatsyourtake.us serves the same site as the apex, so it is sent to the
// apex with a permanent redirect: one address in links and in search results.
// Only that one host is rewritten — the Fly hostname and localhost are left
// alone (Fly's health check and local dev must keep answering directly), and
// those rely on the canonical tag instead. Returns the destination, or null.
const WWW_HOST = `www.${new URL(SITE_ORIGIN).hostname}`;

export function canonicalHostRedirect(url: URL): string | null {
  if (url.hostname !== WWW_HOST) return null;
  return `${SITE_ORIGIN}${url.pathname}${url.search}`;
}
