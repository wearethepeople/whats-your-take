import { NavLink } from "react-router";

// Shared chrome for host pages, rendered by routes/layouts/host.tsx. That
// layout route also carries the auth gate, as `middleware` rather than
// `loader` (a loader wouldn't guard child actions) — see the comment there.
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
