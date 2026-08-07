import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("events", "routes/events.tsx"),
  route("resources/healthcheck", "routes/resources.healthcheck.ts"),
  route("e/:slug", "routes/e.$slug.tsx"),
  route("e/:slug/status/:code", "routes/e.$slug.status.$code.ts"),
  route("e/:slug/manifest.webmanifest", "routes/e.$slug.manifest.ts"),
  route("host/login", "routes/host.login.tsx"),
  route("host/promote", "routes/host.promote.tsx"),
  route("host/events", "routes/host.events.tsx"),
  route("host/events/new", "routes/host.events.new.tsx"),
  route("host/events/:id", "routes/host.events.$id.tsx"),
  route("host/events/:id/cards", "routes/host.events.$id.cards.tsx"),
  route("host/events/:id/moderation", "routes/host.events.$id.moderation.tsx"),
  route("host/events/:id/export/:format", "routes/host.events.$id.export.ts"),
] satisfies RouteConfig;
