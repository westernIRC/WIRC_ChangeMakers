import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="bg-brand-700 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold">
          WIRC Change Makers
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/leaderboard" className="hover:underline">
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              {(user.role === "vp_admin" || user.role === "overall_admin") && (
                <Link to="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="hover:underline">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded bg-white px-3 py-1 font-medium text-brand-700 hover:bg-brand-100"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
