import type { Route } from "./+types/resources.area-suggestions";
import { suggestAreas } from "~/features/table-requests/services/resolve-area.server";

// Backs the "bring the table" ZIP/city combobox. Read-only, offline lookup
// against the bundled GeoNames export — see resolve-area.server.ts.
export function loader({ request }: Route.LoaderArgs) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return { suggestions: suggestAreas(query) };
}
