import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("events", "routes/events.tsx"),
  route("events/:publicSlug", "routes/events.$publicSlug.tsx"),
  route("about", "routes/about.tsx"),
  route("find-the-table", "routes/find-the-table.tsx"),
  route("bring-the-table", "routes/bring-the-table.tsx"),
  route("resources/healthcheck", "routes/resources.healthcheck.ts"),
  route("resources/area-suggestions", "routes/resources.area-suggestions.ts"),
  route("photos/*", "routes/photos.$.tsx"),
  route("e/:slug", "routes/e.$slug.tsx"),
  route("e/:slug/status/:code", "routes/e.$slug.status.$code.ts"),
  route("e/:slug/manifest.webmanifest", "routes/e.$slug.manifest.ts"),
  route("host/login", "routes/host.login.tsx"),
  // Shared nav + error shell for every authenticated host page (see
  // routes/layouts/host.tsx). Login stays outside: it has no nav to show
  // and isn't authenticated yet. The export resource route also stays
  // outside — it never renders HTML, only ever returns a file download.
  layout("routes/layouts/host.tsx", [
    route("host/promote", "routes/host.promote.tsx"),
    route("host/table-requests", "routes/host.table-requests.tsx"),
    route("host/prompts", "routes/host.prompts.tsx"),
    route("host/events", "routes/host.events.tsx"),
    route("host/events/new", "routes/host.events.new.tsx"),
    route("host/events/:id", "routes/host.events.$id.tsx"),
    route("host/events/:id/cards", "routes/host.events.$id.cards.tsx"),
    route("host/events/:id/moderation", "routes/host.events.$id.moderation.tsx"),
    route("host/events/:id/photos", "routes/host.events.$id.photos.tsx"),
  ]),
  route("host/events/:id/export/:format", "routes/host.events.$id.export.ts"),
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
