import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("resources/healthcheck", "routes/resources.healthcheck.ts"),
  route("e/:slug", "routes/e.$slug.tsx"),
  route("e/:slug/status/:code", "routes/e.$slug.status.$code.ts"),
  route("host/login", "routes/host.login.tsx"),
  route("host/promote", "routes/host.promote.tsx"),
] satisfies RouteConfig;
