import { redirect } from "react-router";
import type { Route } from "./+types/host.logout";
import { destroySession } from "~/host/auth.server";

// POST only; a stray GET just goes to the login page.
export async function loader() {
  throw redirect("/host/login");
}

export async function action({ request }: Route.ActionArgs) {
  return destroySession(request, "/host/login");
}
