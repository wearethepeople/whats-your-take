// Recurring visual grammar from the design handoff (docs/ design-handoff
// package), factored into small reusable pieces so marketing pages compose
// them instead of repeating the same arbitrary-value Tailwind classes.

import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

// Offset hard shadow for primary CTAs — not a soft/blurred shadow.
export const offsetShadow = "shadow-[4px_4px_0_var(--color-accent)]";

// Gold inset-underline highlight for key phrases in headlines: a low-sitting
// bar so text floats on top, not a background highlight.
export function GoldUnderline({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn("[box-shadow:inset_0_-8px_0_var(--color-accent)]", className)} {...props} />
  );
}

// Perforated/dashed rule between sections.
export function DashedDivider({ className, ...props }: ComponentProps<"hr">) {
  return (
    <hr
      className={cn("border-0 border-b border-dashed border-(--color-dashed)", className)}
      {...props}
    />
  );
}

// Stamp/tag chip: a small rotated rectangle with mono uppercase text, e.g.
// "SEALED", "STOP № 03", "SEASON ONE".
export function Stamp({
  className,
  rotate = "-3deg",
  ...props
}: ComponentProps<"span"> & { rotate?: string }) {
  return (
    <span
      className={cn(
        "inline-block border border-current px-2 py-0.5 font-mono text-xs font-medium tracking-wide uppercase",
        className,
      )}
      style={{ transform: `rotate(${rotate})` }}
      {...props}
    />
  );
}

// Shared status treatment for public ledger rows (home, /events,
// /find-the-table) — one place that decides what a stop's status reads as
// and how loud it looks, so the three pages don't drift from each other.
export type PublicLedgerStatus = "up-next" | "scheduled" | "sealed";

export function ledgerStatusMeta(status: PublicLedgerStatus): {
  // null means "no fixed label — show the real take count instead" (only
  // true once a stop is sealed and has a final count).
  countLabel: string | null;
  statusLabel: string;
  statusClassName: string;
  rowHighlight: boolean;
} {
  switch (status) {
    case "up-next":
      return {
        countLabel: "up next",
        statusLabel: "Come find us",
        statusClassName: "font-bold text-primary",
        rowHighlight: true,
      };
    case "scheduled":
      return {
        countLabel: "—",
        statusLabel: "Scheduled",
        statusClassName: "font-semibold text-muted-tan",
        rowHighlight: false,
      };
    case "sealed":
      return {
        countLabel: null,
        statusLabel: "Sealed",
        statusClassName: "text-muted-foreground",
        rowHighlight: false,
      };
  }
}

// Circled step number used in "How it works" steps: 26px circle, 1.5px ink
// border, bold number.
export function CircledStep({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-current font-mono text-sm font-bold",
        className,
      )}
    >
      {n}
    </span>
  );
}
