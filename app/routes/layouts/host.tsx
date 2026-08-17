// Shared chrome for every authenticated host route. Pathless layout route —
// no loader here on purpose: a layout loader would not guard child actions,
// so requireHost stays a first-line call in each child route (see
// ~/host/nav.tsx). This layout only renders the nav + shell, and gives the
// whole host section one real error screen instead of falling through to
// root.tsx's bare "Something went wrong."
import { isRouteErrorResponse, Outlet } from "react-router";
import type { Route } from "./+types/host";
import { HostNav } from "~/host/nav";

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
