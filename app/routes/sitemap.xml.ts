// The sitemap: the marketing pages plus one entry per public event stop.
// No <lastmod>: nothing here tracks a real modification time, and a made-up
// one teaches crawlers to ignore the field. Submission (/e/*) and host
// (/host/*) paths never appear here and are disallowed in public/robots.txt.

import { db } from "~/db/client.server";
import { publicEventSlugs } from "~/features/events/services/season.server";
import { absoluteUrl } from "~/lib/seo";

const STATIC_PATHS = ["/", "/about", "/find-the-table", "/events", "/bring-the-table"];

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function loader() {
  const paths = [...STATIC_PATHS, ...publicEventSlugs(db).map((slug) => `/events/${slug}`)];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path))}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
