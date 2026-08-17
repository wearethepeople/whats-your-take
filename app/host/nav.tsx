import { NavLink } from "react-router";

// Shared chrome for host pages, rendered by routes/layouts/host.tsx. That
// layout route has no loader on purpose — a layout loader would not guard
// child actions — so every host route still keeps its own first-line
// requireHost call; the layout exists only for the nav/error shell.
export function HostNav() {
  return (
    <nav className="host-nav" aria-label="Host console">
      <NavLink to="/host/events">Events</NavLink>
      <NavLink to="/host/promote">Promote</NavLink>
      <NavLink to="/host/prompts">Prompts</NavLink>
      <NavLink to="/host/table-requests">Table requests</NavLink>
    </nav>
  );
}
