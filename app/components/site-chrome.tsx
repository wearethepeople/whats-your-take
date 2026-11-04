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
import { InstagramIcon } from "~/components/instagram-icon";
import { WrtpIcon } from "~/components/wrtp-icon";
import { WytLockup } from "~/components/wordmark";
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

// Hover feedback for inactive nav items: a thin underline, lighter than the
// active-page gold bar above and lighter than the "Find the table" button's
// hover wash. Drawn as a pseudo-element (not text-decoration) so it can
// animate: scaled to 0 width at rest, expanding from the center on hover.
// A steep ease-out curve — most of the growth happens in a quick initial
// burst, then it lingers into the finish — rather than a constant rate.
const hoverUnderline =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-center after:scale-x-0 after:bg-border after:transition-transform after:duration-750 after:ease-[cubic-bezier(0.16,1,0.3,1)] after:content-[''] hover:after:scale-x-100";

export function SiteHeader({ active }: { active?: NavKey }) {
  return (
    <header className="flex items-center justify-between gap-6 border-b-2 border-foreground px-6 py-6 sm:px-14 lg:py-8">
      {/* The poster lockup as-is: full-height WrTP stripes beside the stacked
          wordmark, tagline beneath. The stack needs the roomier header; the
          tagline stays a fixed reading size rather than scaling with the
          mark. The link carries the accessible name; the marks are
          decorative inside it. The full nav needs about 820px beside the
          lockup, so tablets use the sheet. */}
      <Link to="/" aria-label="What’s Your Take? — home">
        <WytLockup
          decorative
          className="[--mark-h:44px] [--tagline-size:12.5px] lg:[--mark-h:56px]"
        />
      </Link>
      <nav className="hidden items-center gap-6 text-sm whitespace-nowrap lg:flex">
        {NAV_LINKS.filter((link) => link.key !== "find-the-table").map((link) => (
          <Link
            key={link.key}
            to={link.to}
            className={cn("pb-1", active === link.key ? activeUnderline : hoverUnderline)}
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
      <SheetTrigger render={<Button variant="outline" size="icon" />} className="lg:hidden">
        <MenuIcon />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-3/4">
        <SheetHeader className="pr-12">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {/* Room for the stacked mark here, where the header has none. */}
          <WytLockup decorative className="[--mark-h:80px]" />
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pb-4 text-base">
          {NAV_LINKS.map((link) => (
            <SheetClose
              key={link.key}
              render={<Link to={link.to} />}
              nativeButton={false}
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
        {/* Each link carries its own padding so the tap targets are ~42px and
            sit apart; the negative margins cancel that padding so the row
            still lines up with the text above it. */}
        <div className="-mb-3 flex items-center gap-3">
          <a
            href="https://www.instagram.com/wrtp.us/"
            rel="noreferrer"
            aria-label="We (ARE) the People on Instagram (@wrtp.us)"
            className="-ml-3 p-3 text-muted-foreground hover:text-footer-foreground"
          >
            <InstagramIcon className="size-[18px]" />
          </a>
          <a
            href="mailto:info@wearethepeople.us"
            className="hover:text-footer-foreground py-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            info@wearethepeople.us
          </a>
        </div>
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
