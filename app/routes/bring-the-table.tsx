import { Form } from "react-router";
import type { Route } from "./+types/bring-the-table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/client.server";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { GoldUnderline, offsetShadow } from "~/components/visual-grammar";
import { checkRateLimit, getClientIp } from "~/features/table-requests/services/rate-limit.server";
import {
  createRequest,
  requestFormSchema,
} from "~/features/table-requests/services/table-requests.server";

export function meta() {
  return [
    { title: "Bring the table to your town — What's Your Take?" },
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
      error: "That's a lot of pointers at once — try again in a few minutes.",
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

  createRequest(db, parsed.data);
  return { ok: true as const };
}

export default function BringTheTable({ actionData }: Route.ComponentProps) {
  const submitted = actionData?.ok === true;

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
            Point us toward a ZIP code.
          </p>
        </section>

        <section className="px-6 py-14 sm:px-14">
          {submitted ? (
            <div className="max-w-lg border-[1.5px] border-foreground bg-card p-6">
              <p className="text-lg font-semibold">Noted — thanks for the pointer.</p>
              <p className="mt-2 text-muted-foreground">
                We watch where interest is concentrated when we&rsquo;re planning where to go next.
              </p>
            </div>
          ) : (
            <Form method="post" className="flex max-w-lg flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="area" className="text-sm font-medium">
                  ZIP code
                </label>
                <Input
                  id="area"
                  name="area"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="12345"
                  required
                  maxLength={5}
                />
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
                  placeholder="A specific festival or market, timing, whatever's relevant"
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

              <Button type="submit" className={`w-fit ${offsetShadow}`}>
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
