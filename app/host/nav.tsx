import { NavLink } from "react-router";

// Shared chrome for host pages. Not a layout route on purpose: a layout
// loader would not guard child actions, so every host route keeps its own
// first-line requireHost and just renders this.
export function HostNav() {
  return (
    <nav className="host-nav" aria-label="Host console">
      <NavLink to="/host/events">Events</NavLink>
      <NavLink to="/host/promote">Promote</NavLink>
    </nav>
  );
}
