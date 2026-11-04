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
  SheetFooter,
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
        {/* items-start: SheetHeader is a flex column, which would otherwise
            stretch the lockup to full width and spread its two columns. */}
        <SheetHeader className="items-start p-4 pr-12 pb-2">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {/* Same lockup as the page header, at the same size and with the
              same fixed-size tagline, so it reads as one mark. The sheet's
              left padding matches the active bar below, so the stripes and
              the bar share an edge. */}
          <WytLockup decorative className="[--mark-h:44px] [--tagline-size:12.5px]" />
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pb-4 text-base">
          {NAV_LINKS.map((link) => (
            <SheetClose
              key={link.key}
              render={<Link to={link.to} />}
              nativeButton={false}
              className={cn(
                "px-3 py-3",
                active === link.key
                  ? "font-bold [box-shadow:inset_4px_0_0_var(--color-accent)]"
                  : undefined,
              )}
            >
              {link.label}
            </SheetClose>
          ))}
        </nav>
        {/* The footer's org line, contact links and copyright, so the menu
            carries everything the footer does (minus the nav links, which
            are right above). Padded to share the nav items' text edge. */}
        <SheetFooter className="gap-0 border-t px-7 pt-4 text-sm">
          <FooterIdentity muted="text-muted-foreground" hover="hover:text-foreground" />
          <FooterCopyright className="mt-3 text-muted-foreground" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Org line plus Instagram and email links. `hover` is the link hover color,
 *  since the footer's ink and the sheet's differ. */
function FooterIdentity({ muted, hover }: { muted: string; hover: string }) {
  return (
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
          className={cn("-ml-3 p-3", muted, hover)}
        >
          <InstagramIcon className="size-[18px]" />
        </a>
        <a
          href="mailto:info@wearethepeople.us"
          className={cn("py-3 text-xs underline-offset-2 hover:underline", muted, hover)}
        >
          info@wearethepeople.us
        </a>
      </div>
    </div>
  );
}

function FooterCopyright({ className }: { className?: string }) {
  return <p className={className}>&copy; 2026 We (ARE) the People</p>;
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-4 bg-footer px-6 py-8 text-sm text-footer-foreground sm:px-14 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <FooterIdentity muted="text-footer-foreground/70" hover="hover:text-footer-foreground" />
      <nav className="flex flex-col gap-2 lg:flex-row lg:gap-6">
        {NAV_LINKS.map((link) => (
          <Link key={link.key} to={link.to} className="underline-offset-2 hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <FooterCopyright className="text-footer-foreground/70" />
    </footer>
  );
}
