import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { formatWeekStart } from "../utils/weeks";

const TABS_VP = [
  { key: "members", label: "Members" },
  { key: "audit", label: "Audit Log" },
];
const TABS_OVERALL = [
  { key: "members", label: "Members" },
  { key: "audit", label: "Audit Log" },
  { key: "houses", label: "Houses" },
  { key: "settings", label: "Settings" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const isOverall = user.role === "overall_admin";
  const [tab, setTab] = useState("members");
  const tabs = isOverall ? TABS_OVERALL : TABS_VP;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-gray-600">
        {isOverall ? "Full access across all Houses." : "Scoped to your own House."}
      </p>

      <div className="mt-4 flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "members" && <MembersPanel user={user} isOverall={isOverall} />}
        {tab === "audit" && <AuditLogPanel />}
        {tab === "houses" && isOverall && <HousesPanel />}
        {tab === "settings" && isOverall && <SettingsPanel />}
      </div>
    </div>
  );
}

function MembersPanel({ user, isOverall }) {
  const [houses, setHouses] = useState([]);
  const [houseId, setHouseId] = useState(isOverall ? "" : user.houseId);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // { entryId, amount }
  const [message, setMessage] = useState("");
  const [pendingReassign, setPendingReassign] = useState({}); // { [memberId]: newHouseId }

  useEffect(() => {
    if (isOverall) {
      api
        .get("/houses")
        .then((data) => {
          setHouses(data.houses);
          if (!houseId && data.houses.length > 0) setHouseId(data.houses[0].houseId);
        })
        .catch((err) => setError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMembers(id) {
    setError("");
    try {
      const data = await api.get(`/admin/houses/${id}/members`);
      setMembers(data.members);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (houseId) loadMembers(houseId);
  }, [houseId]);

  async function handleSaveEdit(entryId) {
    setMessage("");
    try {
      await api.patch(`/admin/entries/${entryId}`, { amount: Number(editing.amount) });
      setEditing(null);
      setMessage("Entry updated.");
      await loadMembers(houseId);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleConfirmReassign(memberId) {
    const newHouseId = pendingReassign[memberId];
    setMessage("");
    try {
      await api.patch(`/admin/users/${memberId}/house`, { houseId: newHouseId });
      setPendingReassign((p) => {
        const next = { ...p };
        delete next[memberId];
        return next;
      });
      setMessage("Member reassigned.");
      await loadMembers(houseId);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      {isOverall && (
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium text-gray-700">House</span>
          <select
            value={houseId}
            onChange={(e) => setHouseId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            {houses.map((h) => (
              <option key={h.houseId} value={h.houseId}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="mb-2 text-sm text-gray-600">{message}</p>}

      <div className="space-y-4">
        {members.map((m) => (
          <div key={m.id} className="rounded border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {m.name} <span className="text-xs font-normal text-gray-500">({m.role})</span>
                </p>
                <p className="text-xs text-gray-500">{m.email}</p>
              </div>
              <span className="text-sm text-gray-500">🔥 {m.streak} week streak</span>
            </div>

            {isOverall && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <label>
                  Reassign House:{" "}
                  <select
                    value={pendingReassign[m.id] ?? m.houseId}
                    onChange={(e) =>
                      setPendingReassign((p) => ({ ...p, [m.id]: e.target.value }))
                    }
                    className="rounded border border-gray-300 px-2 py-1"
                  >
                    {houses.map((h) => (
                      <option key={h.houseId} value={h.houseId}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </label>
                {pendingReassign[m.id] && pendingReassign[m.id] !== m.houseId && (
                  <>
                    <button
                      onClick={() => handleConfirmReassign(m.id)}
                      className="rounded bg-brand-600 px-2 py-1 font-medium text-white hover:bg-brand-700"
                    >
                      Confirm move
                    </button>
                    <button
                      onClick={() =>
                        setPendingReassign((p) => {
                          const next = { ...p };
                          delete next[m.id];
                          return next;
                        })
                      }
                      className="text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

            {m.weeklyEntries?.length > 0 && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1">Week of</th>
                    <th className="py-1">Amount</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody>
                  {m.weeklyEntries.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="py-1">{formatWeekStart(entry.weekStartDate)}</td>
                      <td className="py-1">
                        {editing?.entryId === entry.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editing.amount}
                            onChange={(e) => setEditing({ entryId: entry.id, amount: e.target.value })}
                            className="w-24 rounded border border-gray-300 px-2 py-1"
                          />
                        ) : (
                          `$${Number(entry.amount).toFixed(2)}`
                        )}
                      </td>
                      <td className="py-1 text-right">
                        {editing?.entryId === entry.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(entry.id)}
                              className="mr-2 text-brand-600 hover:underline"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditing(null)} className="text-gray-500 hover:underline">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditing({ entryId: entry.id, amount: entry.amount })}
                            className="text-brand-600 hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/audit-log")
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }

  return (
    <table className="w-full overflow-hidden rounded border border-gray-200 bg-white text-sm">
      <thead className="bg-gray-50 text-left text-gray-500">
        <tr>
          <th className="px-3 py-2">Member</th>
          <th className="px-3 py-2">Week of</th>
          <th className="px-3 py-2">Previous</th>
          <th className="px-3 py-2">New</th>
          <th className="px-3 py-2">Edited by</th>
          <th className="px-3 py-2">When</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} className="border-t">
            <td className="px-3 py-2">{log.weeklyEntry.user.name}</td>
            <td className="px-3 py-2">
              {formatWeekStart(log.weeklyEntry.weekStartDate)}
            </td>
            <td className="px-3 py-2">${Number(log.previousAmount).toFixed(2)}</td>
            <td className="px-3 py-2">${Number(log.newAmount).toFixed(2)}</td>
            <td className="px-3 py-2">{log.editedBy.name}</td>
            <td className="px-3 py-2">{new Date(log.editedAt).toLocaleString()}</td>
          </tr>
        ))}
        {logs.length === 0 && (
          <tr>
            <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
              No edits logged yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function HousesPanel() {
  const [houses, setHouses] = useState([]);
  const [form, setForm] = useState({ name: "", portfolioName: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.get("/houses");
      setHouses(data.houses);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/houses", form);
      setForm({ name: "", portfolioName: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(houseId) {
    setError("");
    try {
      await api.delete(`/houses/${houseId}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Portfolio</span>
          <input
            required
            value={form.portfolioName}
            onChange={(e) => setForm((f) => ({ ...f, portfolioName: e.target.value }))}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Add House
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <ul className="divide-y rounded border border-gray-200 bg-white">
        {houses.map((h) => (
          <li key={h.houseId} className="flex items-center justify-between px-4 py-3">
            <span>
              {h.name} <span className="text-xs text-gray-500">({h.portfolioName})</span>
            </span>
            <button onClick={() => handleDelete(h.houseId)} className="text-sm text-red-600 hover:underline">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Keeps derived weights free of float artefacts like 0.30000000000000004.
function round2(n) {
  return Math.round(n * 100) / 100;
}

function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api.get("/admin/settings");
      setSettings(data.settings);
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.put("/admin/settings", {
        weeklyMinimum: Number(settings.weeklyMinimum),
        rankingMethod: settings.rankingMethod,
        blendedWeights: settings.blendedWeights,
      });
      setMessage("Settings saved.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (!settings) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <form onSubmit={handleSave} className="max-w-sm space-y-4 rounded border border-gray-200 bg-white p-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Weekly minimum ($)</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max="1000000"
          value={settings.weeklyMinimum}
          onChange={(e) => setSettings((s) => ({ ...s, weeklyMinimum: e.target.value }))}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Ranking method</span>
        <select
          value={settings.rankingMethod}
          onChange={(e) => setSettings((s) => ({ ...s, rankingMethod: e.target.value }))}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="participation_rate">Participation rate</option>
          <option value="streak_length">Streak length</option>
          <option value="blended">Blended</option>
        </select>
      </label>
      {settings.rankingMethod === "blended" && (
        <div>
          <div className="flex gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Participation weight</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.blendedWeights.participation}
                onChange={(e) => {
                  // The two weights have to add up to 1 or scores stop being on a 0-1 scale,
                  // so streak is derived rather than entered separately - there's no way to
                  // type a pair that the server will reject.
                  const participation = Math.min(1, Math.max(0, Number(e.target.value) || 0));
                  setSettings((s) => ({
                    ...s,
                    blendedWeights: {
                      participation: round2(participation),
                      streak: round2(1 - participation),
                    },
                  }));
                }}
                className="w-24 rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Streak weight</span>
              <input
                type="number"
                value={settings.blendedWeights.streak}
                readOnly
                disabled
                className="w-24 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
              />
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Streak weight is whatever's left over - the two always add up to 1.
          </p>
        </div>
      )}
      <button
        type="submit"
        className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
      >
        Save Settings
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  );
}
