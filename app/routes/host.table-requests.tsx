import { Form } from "react-router";
import type { Route } from "./+types/host.table-requests";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { db } from "~/db/client.server";
import { requireHost } from "~/host/auth.server";
import { Field } from "~/host/field";
import { HostNav } from "~/host/nav";
import { HostSection } from "~/host/section";
import {
  areaAggregates,
  listRequests,
  manuallyResolve,
  needsManualResolution,
} from "~/features/table-requests/services/table-requests.server";

export function meta() {
  return [{ title: "Table requests · What’s Your Take?" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireHost(request);
  return {
    aggregates: areaAggregates(db),
    pending: needsManualResolution(db),
    requests: listRequests(db),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireHost(request);
  const form = await request.formData();
  const id = Number(form.get("id"));
  const city = String(form.get("city") ?? "").trim();
  const state = String(form.get("state") ?? "").trim();
  const county = String(form.get("county") ?? "").trim();
  if (!id || !city || !state) {
    return { ok: false as const, message: "City and state are required." };
  }
  manuallyResolve(db, { id, city, state, county: county || null });
  return { ok: true as const, message: "Saved." };
}

function resolutionLabel(source: string | null): string {
  if (source === "geonames") return "via GeoNames";
  if (source === "manual") return "manual entry";
  return "unresolved";
}

export default function HostTableRequests({ loaderData, actionData }: Route.ComponentProps) {
  const { aggregates, pending, requests } = loaderData;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <HostNav />
      <h1 className="mt-4 mb-4 text-2xl font-semibold">Table requests</h1>

      {actionData ? (
        <p
          className={`banner mb-4 ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <HostSection title="By area">
          {aggregates.length === 0 ? (
            <p className="text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {aggregates.map((group) => (
                <li
                  key={group.label}
                  className="border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">
                      {group.label}
                      {group.county ? (
                        <span className="text-sm text-muted-foreground"> · {group.county}</span>
                      ) : null}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {group.count} {group.count === 1 ? "request" : "requests"}
                    </span>
                  </div>
                  {group.rawAreas.length > 1 ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      As typed: {group.rawAreas.join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last requested {group.lastRequestedAt.toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </HostSection>

        <HostSection title="Needs manual review">
          {pending.length === 0 ? (
            <p className="text-muted-foreground">Nothing stuck. Everything resolved.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {pending.map((row) => (
                <li key={row.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="font-medium">&ldquo;{row.area}&rdquo;</p>
                  {row.note ? <p className="text-sm text-muted-foreground">{row.note}</p> : null}
                  <Form method="post" className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <Field htmlFor={`city-${row.id}`} label="City">
                      <Input id={`city-${row.id}`} name="city" required className="w-32" />
                    </Field>
                    <Field htmlFor={`state-${row.id}`} label="State">
                      <Input id={`state-${row.id}`} name="state" required className="w-16" />
                    </Field>
                    <Field htmlFor={`county-${row.id}`} label="County (optional)">
                      <Input id={`county-${row.id}`} name="county" className="w-32" />
                    </Field>
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                  </Form>
                </li>
              ))}
            </ul>
          )}
        </HostSection>

        <HostSection title="All requests">
          {requests.length === 0 ? (
            <p className="text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {requests.map((row) => (
                <li key={row.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{row.area}</span>
                    <span className="font-mono text-xs text-muted-foreground uppercase">
                      {resolutionLabel(row.resolvedSource)}
                    </span>
                  </div>
                  {row.note ? (
                    <p className="mt-1 text-sm text-muted-foreground">{row.note}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.createdAt.toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </HostSection>
      </div>
    </main>
  );
}
