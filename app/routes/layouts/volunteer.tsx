// Shell + auth gate for the volunteer screen: promote-only, one event, chosen
// by the host. Deliberately separate from layouts/host.tsx so no host route
// is reachable by a volunteer session — that layout's requireHost() rejects
// it. As there, the check is `middleware`, not `loader`, so it also runs ahead
// of the child's action (a direct POST). The child re-reads the session for
// its event id; the event is never taken from the request.
import { Form, isRouteErrorResponse, Outlet } from "react-router";
import type { Route } from "./+types/volunteer";
import { Button } from "~/components/ui/button";
import { db } from "~/db/client.server";
import { requireVolunteer } from "~/host/auth.server";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }) => {
    await requireVolunteer(request, db);
  },
];

function VolunteerShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Form method="post" action="/host/logout" className="flex justify-end">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </Form>
      {children}
    </main>
  );
}

export default function VolunteerLayout() {
  return (
    <VolunteerShell>
      <Outlet />
    </VolunteerShell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const title = isRouteErrorResponse(error) ? `Error ${error.status}` : "Something went wrong";
  return (
    <VolunteerShell>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">That action didn’t go through. Try again.</p>
    </VolunteerShell>
  );
}
