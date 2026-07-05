import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "rolling3mo", label: "Last 3 Months" },
  { value: "all", label: "Campaign to date" },
];

export default function HousePage() {
  const { houseId } = useParams();
  const { user } = useAuth();
  const [house, setHouse] = useState(null);
  const [period, setPeriod] = useState("all");
  const [error, setError] = useState("");
  const [renameForm, setRenameForm] = useState({ name: "", portfolioName: "" });
  const [renameMessage, setRenameMessage] = useState("");

  const canRename =
    user && (user.role === "overall_admin" || (user.role === "vp_admin" && user.houseId === houseId));

  async function load() {
    setError("");
    try {
      const data = await api.get(`/houses/${houseId}?period=${period}`);
      setHouse(data.house);
      setRenameForm({ name: data.house.name, portfolioName: data.house.portfolioName });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseId, period]);

  async function handleRename(e) {
    e.preventDefault();
    setRenameMessage("");
    try {
      await api.patch(`/houses/${houseId}`, renameForm);
      setRenameMessage("House updated.");
      await load();
    } catch (err) {
      setRenameMessage(err.message);
    }
  }

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">{error}</div>;
  if (!house) return <div className="mx-auto max-w-3xl px-4 py-10 text-gray-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">{house.name}</h1>
      <p className="text-gray-600">{house.portfolioName} portfolio</p>

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

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Total raised" value={`$${house.total.toFixed(2)}`} />
        <Stat label="Overall rank" value={`#${house.rank}`} />
        <Stat
          label="Participation"
          value={`${Math.round((house.participationRate ?? 0) * 100)}%`}
        />
      </div>

      {canRename && (
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Edit House details</h2>
          <form onSubmit={handleRename} className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">House name</span>
              <input
                value={renameForm.name}
                onChange={(e) => setRenameForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Portfolio name</span>
              <input
                value={renameForm.portfolioName}
                onChange={(e) => setRenameForm((f) => ({ ...f, portfolioName: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              Save
            </button>
          </form>
          {renameMessage && <p className="mt-2 text-sm text-gray-600">{renameMessage}</p>}
        </div>
      )}

      <div className="mt-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Members</h2>
        <ul className="divide-y">
          {house.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <Link to={`/profile/${m.id}`} className="text-brand-600 hover:underline">
                {m.name}
              </Link>
              <span className="text-sm text-gray-500">
                🔥 {m.streak} week{m.streak === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
