import { Form, redirect } from "react-router";
import type { Route } from "./+types/host.login";
import { createHostSession, isHost, verifyPassword } from "~/host/auth.server";

export function meta() {
  return [{ title: "Host login — What's Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await isHost(request)) throw redirect("/host/events");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!verifyPassword(password)) {
    return { error: "That's not it." };
  }
  return createHostSession("/host/events");
}

export default function HostLogin({ actionData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>Host login</h1>
      <Form method="post" className="stack">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
        />
        {actionData?.error ? (
          <p className="banner banner-error" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button type="submit">Sign in</button>
      </Form>
    </main>
  );
}
