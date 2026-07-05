import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">WIRC Change Makers</h1>
      <p className="mt-3 text-gray-600">
        Fundraise for your own cause, build a weekly giving streak, and compete as a House for
        Western Islamic Relief Canada.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        {user ? (
          <Link
            to="/dashboard"
            className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Go to your dashboard
          </Link>
        ) : (
          <Link
            to="/signup"
            className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Get started
          </Link>
        )}
        <Link
          to="/leaderboard"
          className="rounded border border-brand-600 px-4 py-2 font-medium text-brand-600 hover:bg-brand-50"
        >
          View leaderboard
        </Link>
      </div>
    </div>
  );
}
