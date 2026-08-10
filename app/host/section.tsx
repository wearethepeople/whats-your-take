// Bordered panel for grouping a host page's content into scannable blocks.
// Utilitarian only — no marketing-site grammar (stamps, dashed rules, gold
// underlines) here; the host console is a working tool, not a public page.

import { useId, type ReactNode } from "react";
import { cn } from "~/lib/utils";

export function HostSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section
      className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-4", className)}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
