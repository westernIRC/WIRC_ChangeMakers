import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "rolling3mo", label: "Last 3 Months" },
  { value: "all", label: "Campaign to date" },
];

export default function LeaderboardPage() {
  const [view, setView] = useState("houses");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      <div className="mt-4 flex gap-2 border-b">
        <button
          onClick={() => setView("houses")}
          className={`px-3 py-2 text-sm font-medium ${
            view === "houses"
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Houses
        </button>
        <button
          onClick={() => setView("individuals")}
          className={`px-3 py-2 text-sm font-medium ${
            view === "individuals"
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Individuals
        </button>
      </div>

      {view === "houses" ? <HouseLeaderboard /> : <IndividualLeaderboard />}
    </div>
  );
}

function HouseLeaderboard() {
  const [period, setPeriod] = useState("all");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get(`/leaderboard?period=${period}`)
      .then((data) => setLeaderboard(data.leaderboard))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <p className="mt-4 text-sm text-gray-600">
        Ranked by consistency (participation rate and streak length).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              period === p.value ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading...</p>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">House</th>
              <th className="px-3 py-2">Total raised</th>
              <th className="px-3 py-2">Participation</th>
              <th className="px-3 py-2">Avg streak</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((h) => (
              <tr key={h.houseId} className="border-t">
                <td className="px-3 py-2 font-semibold">#{h.rank}</td>
                <td className="px-3 py-2">
                  <Link to={`/houses/${h.houseId}`} className="text-brand-600 hover:underline">
                    {h.name}
                  </Link>
                </td>
                <td className="px-3 py-2">${h.total.toFixed(2)}</td>
                <td className="px-3 py-2">{Math.round(h.participationRate * 100)}%</td>
                <td className="px-3 py-2">{h.avgStreak.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function IndividualLeaderboard() {
  const { user, loading: authLoading } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    setError("");
    api
      .get("/leaderboard/individuals")
      .then((data) => setLeaderboard(data.leaderboard))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  // The House view above is public; this one names people, so it needs a session. Prompt
  // rather than firing a request we know will 401.
  if (!authLoading && !user) {
    return (
      <p className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Individual rankings are visible to members only.{" "}
        <Link to="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>{" "}
        to see them.
      </p>
    );
  }

  return (
    <div>
      <p className="mt-4 text-sm text-gray-600">
        Ranked by personal streak, independent of how their House is doing overall. Dollar amounts
        stay private.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading...</p>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">House</th>
              <th className="px-3 py-2">Streak</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.userId} className="border-t">
                <td className="px-3 py-2 font-semibold">#{row.rank}</td>
                <td className="px-3 py-2">
                  <Link to={`/profile/${row.userId}`} className="text-brand-600 hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {row.houseId ? (
                    <Link to={`/houses/${row.houseId}`} className="text-brand-600 hover:underline">
                      {row.houseName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">🔥 {row.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
