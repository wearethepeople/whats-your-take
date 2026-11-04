// Recurring visual grammar from the design handoff (docs/ design-handoff
// package), factored into small reusable pieces so marketing pages compose
// them instead of repeating the same arbitrary-value Tailwind classes.

import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

// Offset hard shadow for primary CTAs — not a soft/blurred shadow.
export const offsetShadow = "shadow-[4px_4px_0_var(--color-accent)]";

// One bar of the WrTP stripes (the top bar of WrtpIcon) as a button
// silhouette: the same offset-shadow idea as above, but the shadow and the
// fill both take the bar's wave. In the logo the bar climbs toward the right
// (a least-squares slope of about -0.12), which made a label set over it
// look tilted, so here it is turned 6.79° clockwise about its center until
// its centerline is level. The wave stays; the climb goes. The viewBox is
// the turned bar's bounds (5:1), and the bar stretches to the button's box
// (preserveAspectRatio="none"); stretching keeps a level line level, so the
// band stays level at any button width.
const STRIPE_BAR_PATH =
  "M0,17.61c13.92-.46,27.52-.7,41-1.4,19-.98,37.11-3.54,54.31-7.27C124.86,2.53,156.05-.33,188.8.03c1.15.01,2.31.03,3.46.08.42.02.81.16,1.65.33v34.08c-7.23,0-14.11-.09-20.98.02-27.5.41-53.39,3.6-78.16,8.89-28.55,6.1-58.81,8.6-90.38,8.07-1.34-.02-2.67-.14-4.38-.23V17.61Z";

function StripeBar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-2.32 6.2 198.54 39.72"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
    >
      <path d={STRIPE_BAR_PATH} transform="rotate(6.79 96.955 25.785)" />
    </svg>
  );
}

// Classes for the element that hosts StripeBackdrop: a link or button with
// no box of its own, so only the stripe shows. The turned bar fills about
// 86% of its box's height, so the 56px box gives a band about as thick as
// a standard 48px button, and a hero-length label keeps the box near the
// bar's own 5:1. The focus outline stays a plain rectangle, offset clear of
// the shape.
export const stripeButton =
  "group relative isolate inline-flex h-14 items-center justify-center px-10 text-base font-bold text-accent-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring";

// Brand-orange stripe over an ink stripe shadow, the poster's pairing. The
// label is ink: light text measures only 2.6:1 on the brand orange, while
// ink passes at 5.2:1. Place it as the first child of a `stripeButton`
// element; the label follows it as ordinary text.
export function StripeBackdrop() {
  return (
    <>
      <StripeBar className="-z-10 translate-x-1 translate-y-1 fill-foreground" />
      <StripeBar className="-z-10 fill-accent transition-colors group-hover:fill-accent-hover" />
    </>
  );
}

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

// Small inline note for a stop whose take count needs a caveat: "open" —
// the table is live right now, so the count is still climbing; or
// "transcribing" — it closed but hasn't been archived yet, so the host
// hasn't promoted its staged responses into the corpus (see I2).
// Deliberately quiet: a dot and ten-point text, not a badge, so it reads
// as a minor status note rather than the headline. Shared by every public
// listing that shows take counts (home, /events) so the treatment doesn't
// drift between them.
export function LiveStateNote({
  state,
  className,
}: {
  state: "open" | "transcribing";
  className?: string;
}) {
  return (
    <span
      className={cn("flex items-center gap-1 text-[10px] leading-none text-muted-tan", className)}
    >
      <span className="size-1 rounded-full bg-accent" aria-hidden="true" />
      {state === "open" ? "In process" : "Transcribing"}
    </span>
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

// Photograph in the same 1.5px ink border as the stat card. The caller sets
// the crop (aspect ratio via className, focal point via imgClassName) since
// the same portrait photo reads differently as a tall column or a wide band.
export function PhotoFrame({
  src,
  srcSet,
  sizes,
  alt,
  width,
  height,
  loading = "lazy",
  bordered = true,
  className,
  imgClassName,
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width: number;
  height: number;
  loading?: "lazy" | "eager";
  bordered?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-muted",
        bordered && "border-[1.5px] border-foreground",
        className,
      )}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className={cn("size-full object-cover", imgClassName)}
      />
    </div>
  );
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
