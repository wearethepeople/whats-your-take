// Shared chrome + auth gate for every authenticated host route. The auth
// check lives in `middleware`, not `loader`: middleware runs ahead of a
// child route's action too (unlike an ancestor loader, which a POST
// navigation skips entirely — only the matched action runs, then loaders
// revalidate after; a loader-only check here would leave every host action
// reachable, unauthenticated, by a direct POST). Verified empirically:
// stripping requireHost from an action left it 302-ing to /host/login on a
// cookie-less POST, same as before — this middleware is what's blocking it.
// Child loaders/actions no longer call requireHost themselves; this is the
// only auth gate for anything nested under this layout. The one exception
// is host/events/:id/export/:format — a resource route that never renders,
// deliberately kept outside this layout (see routes.ts), so it still does
// its own requireHost.
import { isRouteErrorResponse, Outlet } from "react-router";
import type { Route } from "./+types/host";
import { requireHost } from "~/host/auth.server";
import { HostNav } from "~/host/nav";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }) => {
    await requireHost(request);
  },
];

function HostShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      {children}
    </main>
  );
}

export default function HostLayout() {
  return (
    <HostShell>
      <Outlet />
    </HostShell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "That action didn’t go through. Try again, or head back to Events.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Not found" : `Error ${error.status}`;
    details =
      error.status === 404
        ? "That event, response, or page doesn’t exist."
        : (error.data?.message ?? details);
  }

  return (
    <HostShell>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{details}</p>
      {import.meta.env.DEV && error instanceof Error ? (
        <pre className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap">
          {error.stack ?? error.message}
        </pre>
      ) : null}
    </HostShell>
  );
}
