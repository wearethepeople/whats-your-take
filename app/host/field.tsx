// Label + control wrapper shared by every host form — keeps the
// label-to-input spacing/structure consistent without repeating it per
// route.

import type { ReactNode } from "react";
import { Label } from "~/components/ui/label";

export function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// Native <select> isn't part of the shadcn primitive set here (no Select
// component installed) — this matches Input's border/focus treatment so it
// doesn't stand out as unstyled.
export const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
