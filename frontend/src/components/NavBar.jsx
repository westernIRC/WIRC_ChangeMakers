import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "./ui.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on navigation, otherwise it stays open over the new page.
  useEffect(() => setOpen(false), [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const isAdmin = user?.role === "vp_admin" || user?.role === "overall_admin";

  const links = [
    { to: "/leaderboard", label: "Leaderboard" },
    ...(user ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Wordmark, not a logo tile. The gradient rounded square was the most generic thing
            on the page; a serif wordmark with the org's initials set beside it reads as a
            masthead and matches the homepage. */}
        <Link to="/" className="group flex items-baseline gap-2.5">
          <span className="font-display text-xl font-medium tracking-[-0.01em] text-ink-900 transition group-hover:text-brand-700">
            Changemakers
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 sm:inline">
            WIRC
          </span>
        </Link>

        {/* desktop */}
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <NavItem key={l.to} to={l.to}>
              {l.label}
            </NavItem>
          ))}
          <span className="h-5 w-px bg-ink-200" />
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="group flex items-center gap-2.5 py-1 transition"
              >
                <Avatar name={user.name} />
                <span className="max-w-[9rem] truncate text-sm font-medium text-ink-700 transition group-hover:text-ink-900">
                  {user.name}
                </span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" to="/login">
                Log in
              </Button>
              <Button size="sm" to="/signup">
                Sign up
              </Button>
            </div>
          )}
        </div>

        {/* mobile toggle. p-3 around a 20px icon gives a 44x44 target; -mr-2 keeps it
            optically flush with the container edge. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 rounded-lg p-3 text-ink-600 transition hover:bg-ink-100 md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {open ? (
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="animate-fade-in border-t border-ink-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavItem key={l.to} to={l.to} block>
                {l.label}
              </NavItem>
            ))}
          </div>
          <div className="mt-3 border-t border-ink-200 pt-3">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={user.name} />
                  <span className="truncate text-sm font-medium text-ink-700">{user.name}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" to="/login">
                  Log in
                </Button>
                <Button size="sm" to="/signup">
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// Desktop items are full-height so the active rule lands flush on the header's bottom border,
// the way a masthead's section nav does. Mobile can't do that in a stacked list, so it marks
// the active item with a rule down the left instead. Both use a transparent border when
// inactive so nothing shifts on selection.
function NavItem({ to, children, block = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        block
          ? [
              "block border-l-2 py-2 pl-3 text-sm font-medium transition",
              isActive
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900",
            ].join(" ")
          : [
              "flex h-16 items-center border-b-2 text-sm font-medium transition",
              isActive
                ? "border-brand-600 text-ink-900"
                : "border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900",
            ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

function Avatar({ name }) {
  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    // Flat, not a gradient. brand-700 rather than the old brand-400 top stop, which put white
    // text on a light blue.
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-semibold tracking-wide text-white">
      {initials}
    </span>
  );
}
