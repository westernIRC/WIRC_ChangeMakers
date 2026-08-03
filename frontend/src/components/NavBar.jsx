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
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold text-white shadow-sm transition group-hover:scale-105">
            W
          </span>
          <span className="text-[15px] font-bold tracking-tight text-ink-900">
            Changemakers
          </span>
        </Link>

        {/* desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavItem key={l.to} to={l.to}>
              {l.label}
            </NavItem>
          ))}
          <span className="mx-2 h-5 w-px bg-ink-200" />
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-ink-100"
              >
                <Avatar name={user.name} />
                <span className="max-w-[9rem] truncate text-sm font-medium text-ink-700">
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

        {/* mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 md:hidden"
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
        <div className="animate-fade-in border-t border-ink-200/70 bg-white px-4 py-3 md:hidden">
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

function NavItem({ to, children, block = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-lg px-3 py-2 text-sm font-medium transition",
          block ? "block" : "",
          isActive ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
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
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-bold text-white">
      {initials}
    </span>
  );
}
