// Shared marketing-site chrome (nav + footer) — reused across the
// homepage, event listing, event detail, about, and find-the-table pages.
// The homepage's announcement strip is not part of this: only the
// homepage design shows one.

import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type NavKey = "question" | "events" | "about" | "find-the-table";

const NAV_LINKS: { key: NavKey; label: string; to: string }[] = [
  { key: "question", label: "The question", to: "/#question" },
  { key: "events", label: "Where it’s been", to: "/events" },
  { key: "about", label: "About", to: "/about" },
];

// Low gold underline for the current page's nav item — not a color change
// or bold-only treatment (per the design handoff's "Nav active states").
const activeUnderline = "[box-shadow:inset_0_-6px_0_var(--color-accent)]";

export function SiteHeader({ active }: { active?: NavKey }) {
  return (
    <header className="flex items-center justify-between gap-6 border-b-2 border-foreground px-6 py-5 sm:px-14">
      <div className="flex items-baseline gap-2">
        <Link to="/" className="text-[17px] font-bold">
          What&rsquo;s your take?
        </Link>
        <span className="text-[12.5px] text-muted-tan">A civic mirror project</span>
      </div>
      <nav className="flex items-center gap-6 text-sm">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.key}
            to={link.to}
            className={cn("hidden pb-1 sm:inline", active === link.key && activeUnderline)}
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
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-1 bg-footer px-6 py-6 text-sm text-footer-foreground sm:flex-row sm:items-center sm:justify-between sm:px-14">
      <p>What&rsquo;s Your Take? · a We (ARE) The People project · Dallas, Texas</p>
      <p className="text-muted-foreground">wearethepeople.us · wrtp.us</p>
    </footer>
  );
}
