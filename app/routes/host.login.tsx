import { Form, redirect } from "react-router";
import type { Route } from "./+types/host.login";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { db } from "~/db/client.server";
import {
  createHostSession,
  createVolunteerSession,
  getVolunteer,
  isHost,
  verifyPassword,
  verifyVolunteerPassword,
} from "~/host/auth.server";
import { getVolunteerAccess } from "~/host/volunteer-access.server";
import { HostSection } from "~/host/section";

export function meta() {
  return [{ title: "Host login · What’s Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await isHost(request)) throw redirect("/host/events");
  if (await getVolunteer(request, db)) throw redirect("/host/volunteer");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  // Both checks always run. Every failure — wrong password, or the volunteer
  // password while access is off or no event is chosen — gets the same answer,
  // so a right-but-closed volunteer password is never confirmed.
  const isAdmin = verifyPassword(password);
  const isVolunteer = verifyVolunteerPassword(password);
  if (isAdmin) return createHostSession("/host/events");
  if (isVolunteer) {
    const access = getVolunteerAccess(db);
    if (access.eventId !== null) return createVolunteerSession(access, "/host/volunteer");
  }
  return { error: "That’s not it." };
}

export default function HostLogin({ actionData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold">Host login</h1>
      <HostSection title="Sign in">
        <Form method="post" className="flex flex-col items-start gap-3">
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {actionData?.error ? (
            <p className="banner banner-error" role="alert">
              {actionData.error}
            </p>
          ) : null}
          <Button type="submit">Sign in</Button>
        </Form>
      </HostSection>
    </main>
  );
}
