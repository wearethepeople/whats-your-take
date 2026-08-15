import { useEffect, useRef, useState } from "react";
import { Form, useFetcher } from "react-router";
import type { Route } from "./+types/bring-the-table";
import type { loader as areaSuggestionsLoader } from "./resources.area-suggestions";
import { Button } from "~/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { GoldUnderline, offsetShadow } from "~/components/visual-grammar";
import { checkRateLimit, getClientIp } from "~/features/table-requests/services/rate-limit.server";
import {
  resolveArea,
  type AreaSuggestion,
} from "~/features/table-requests/services/resolve-area.server";
import {
  createRequest,
  requestFormSchema,
} from "~/features/table-requests/services/table-requests.server";

const AREA_SUGGEST_DEBOUNCE_MS = 300;

export function meta() {
  return [
    { title: "Bring the table to your town · What’s Your Take?" },
    {
      name: "description",
      content: "Point us toward a ZIP code where the table should go next.",
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();

  // Honeypot: a real visitor never fills this in (off tab order, visually
  // hidden). A non-empty value gets the same success response as a real
  // submission — indistinguishable to whatever filled it in — without
  // writing a row.
  if (String(form.get("company") ?? "").trim() !== "") {
    return { ok: true as const };
  }

  if (!checkRateLimit(getClientIp(request))) {
    return {
      ok: false as const,
      error: "That’s a lot of pointers at once. Try again in a few minutes.",
    };
  }

  const parsed = requestFormSchema.safeParse({
    area: String(form.get("area") ?? ""),
    note: String(form.get("note") ?? ""),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the form.";
    return { ok: false as const, error: message };
  }

  // The client only ever submits a combobox selection (see the hidden
  // "area" field in the component below), so a value that doesn't resolve
  // means the client was bypassed — reject rather than store an area no
  // host can act on.
  if (!resolveArea(parsed.data.area)) {
    return { ok: false as const, error: "Pick a match from the list." };
  }

  createRequest(db, parsed.data);
  return { ok: true as const };
}

export default function BringTheTable({ actionData }: Route.ComponentProps) {
  const submitted = actionData?.ok === true;
  const [areaInput, setAreaInput] = useState("");
  // The submittable value — only ever set by picking a suggestion, never by
  // typing, so an ambiguous or unresolvable area can't reach the form (see
  // the server-side resolveArea() check in the action above, which backs
  // this up in case the client is bypassed).
  const [selectedArea, setSelectedArea] = useState<AreaSuggestion | null>(null);
  const suggestionsFetcher = useFetcher<typeof areaSuggestionsLoader>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Ignore stale fetcher.data once the field is cleared, rather than
  // showing the last query's results against an empty input.
  const suggestions = areaInput.trim() ? (suggestionsFetcher.data?.suggestions ?? []) : [];

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function handleAreaInputChange(value: string, { reason }: { reason?: string }) {
    // Base UI reverts the visible text to the current selection (blank,
    // since nothing's selected) when the popup closes without a pick —
    // e.g. on blur, reason "input-clear" or "none". Ignoring those keeps
    // whatever the user actually typed on screen instead of silently
    // wiping it out from under them.
    if (reason === "input-clear" || reason === "none") return;

    setAreaInput(value);
    clearTimeout(debounceRef.current);

    // A selection already tells us the match; no need to re-query.
    if (reason === "item-press") return;

    // Any further typing after a selection — even appending — invalidates
    // it; only a fresh pick from the list re-enables submission.
    setSelectedArea(null);

    const trimmed = value.trim();
    if (!trimmed) return;

    debounceRef.current = setTimeout(() => {
      suggestionsFetcher.load(`/resources/area-suggestions?q=${encodeURIComponent(trimmed)}`);
    }, AREA_SUGGEST_DEBOUNCE_MS);
  }

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader />

      <main className="flex-1">
        <section className="flex flex-col gap-6 border-b border-dashed border-(--color-dashed) px-6 py-14 sm:px-14 sm:py-16">
          <p className="text-sm text-muted-tan">Anonymous, no commitment</p>
          <h1 className="max-w-2xl font-serif text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            Bring the table <GoldUnderline>to your town.</GoldUnderline>
          </h1>
          <p className="max-w-prose text-[17.5px] text-muted-foreground">
            Point us toward a ZIP code or city.
          </p>
        </section>

        <section className="px-6 py-14 sm:px-14">
          {submitted ? (
            <div className="max-w-lg border-[1.5px] border-foreground bg-card p-6">
              <p className="text-lg font-semibold">Noted. Thanks for the pointer.</p>
              <p className="mt-2 text-muted-foreground">
                We watch where interest is concentrated when we&rsquo;re planning where to go next.
              </p>
            </div>
          ) : (
            <Form method="post" className="flex max-w-lg flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="area" className="text-sm font-medium">
                  ZIP code or city
                </label>
                <Combobox<AreaSuggestion>
                  items={suggestions}
                  filter={null}
                  itemToStringLabel={(item) => item.label}
                  inputValue={areaInput}
                  onInputValueChange={handleAreaInputChange}
                  value={selectedArea}
                  onValueChange={setSelectedArea}
                >
                  <ComboboxInput
                    id="area"
                    placeholder="12345 or Springfield, IL"
                    required
                    showTrigger={false}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No matches yet.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: AreaSuggestion) => (
                        <ComboboxItem key={item.label} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {!selectedArea && areaInput.trim() ? (
                  <p className="text-sm text-muted-tan">Pick a match from the list.</p>
                ) : null}
                <input type="hidden" name="area" value={selectedArea?.label ?? ""} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="note" className="text-sm font-medium">
                  Anything else? (optional)
                </label>
                <Textarea
                  id="note"
                  name="note"
                  rows={4}
                  maxLength={500}
                  placeholder="A specific festival or market, timing, whatever’s relevant"
                />
              </div>

              {/* Honeypot — real visitors never see or fill this in. */}
              <div className="visually-hidden" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input id="company" name="company" tabIndex={-1} autoComplete="off" />
              </div>

              {actionData && !actionData.ok ? (
                <p className="banner banner-error" role="alert">
                  {actionData.error}
                </p>
              ) : null}

              <Button type="submit" className={`w-fit ${offsetShadow}`} disabled={!selectedArea}>
                Send the pointer
              </Button>
            </Form>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
