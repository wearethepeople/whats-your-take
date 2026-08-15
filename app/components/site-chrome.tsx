// Shared marketing-site chrome (nav + footer) — reused across the
// homepage, event listing, event detail, about, and find-the-table pages.
// The homepage's announcement strip is not part of this: only the
// homepage design shows one.

import { MenuIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { WrtpIcon } from "~/components/wrtp-icon";
import { cn } from "~/lib/utils";

export type NavKey = "question" | "events" | "about" | "find-the-table";

const NAV_LINKS: { key: NavKey; label: string; to: string }[] = [
  { key: "question", label: "The question", to: "/#question" },
  { key: "events", label: "Where it’s been", to: "/events" },
  { key: "about", label: "About", to: "/about" },
  { key: "find-the-table", label: "Find the table", to: "/find-the-table" },
];

// Low gold underline for the current page's nav item — not a color change
// or bold-only treatment (per the design handoff's "Nav active states").
const activeUnderline = "[box-shadow:inset_0_-6px_0_var(--color-accent)]";

export function SiteHeader({ active }: { active?: NavKey }) {
  return (
    <header className="flex items-center justify-between gap-6 border-b-2 border-foreground px-6 py-5 sm:px-14">
      <div className="flex items-baseline gap-2">
        <Link to="/" className="text-[17px] font-bold">
          What&rsquo;s Your Take?
        </Link>
        <span className="text-[12.5px] text-muted-tan">A civic mirror project</span>
      </div>
      <nav className="hidden items-center gap-6 text-sm sm:flex">
        {NAV_LINKS.filter((link) => link.key !== "find-the-table").map((link) => (
          <Link
            key={link.key}
            to={link.to}
            className={cn("pb-1", active === link.key && activeUnderline)}
          >
            {link.label}
          </Link>
        ))}
        <Button
          render={<Link to="/find-the-table" />}
          nativeButton={false}
          variant="outline"
          // Filled ink bg is the "you're here" state (per the design
          // handoff's find-the-table screen), distinct from every other
          // nav item's gold-underline active state.
          className={active === "find-the-table" ? "bg-foreground text-background" : undefined}
        >
          Find the table
        </Button>
      </nav>
      <MobileNav active={active} />
    </header>
  );
}

function MobileNav({ active }: { active?: NavKey }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon" />} className="sm:hidden">
        <MenuIcon />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-3/4">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pb-4 text-base">
          {NAV_LINKS.map((link) => (
            <SheetClose
              key={link.key}
              render={<Link to={link.to} />}
              className={cn(
                "rounded-md px-2 py-3",
                active === link.key
                  ? "font-bold [box-shadow:inset_4px_0_0_var(--color-accent)]"
                  : undefined,
              )}
            >
              {link.label}
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-4 bg-footer px-6 py-8 text-sm text-footer-foreground sm:px-14 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="flex flex-col gap-1">
        <p>
          <WrtpIcon className="size-5 text-wrtp-brand-orange inline" /> A{" "}
          <a href="https://wearethepeople.us" style={{ textDecoration: "underline" }}>
            We (ARE) the People
          </a>{" "}
          project
        </p>
        <a
          href="mailto:info@wearethepeople.us"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          info@wearethepeople.us
        </a>
      </div>
      <nav className="flex flex-col gap-2 lg:flex-row lg:gap-6">
        {NAV_LINKS.map((link) => (
          <Link key={link.key} to={link.to} className="underline-offset-2 hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="text-muted-foreground">&copy; 2026 We (ARE) the People</p>
    </footer>
  );
}
