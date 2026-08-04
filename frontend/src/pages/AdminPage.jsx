import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { formatWeekStart } from "../utils/weeks";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  PageHeader,
  SkeletonRows,
  StreakBadge,
} from "../components/ui.jsx";

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
      <PageHeader
        eyebrow={isOverall ? "Overall admin" : "House admin"}
        title="Admin"
        subtitle={isOverall ? "Full access across all Houses." : "Scoped to your own House."}
      />

      <div className="mb-5 inline-flex flex-wrap rounded-xl bg-ink-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.key ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "members" && <MembersPanel user={user} isOverall={isOverall} />}
      {tab === "audit" && <AuditLogPanel />}
      {tab === "houses" && isOverall && <HousesPanel />}
      {tab === "settings" && isOverall && <SettingsPanel />}
    </div>
  );
}

/* -------------------------------------------------------------------- members */

function MembersPanel({ user, isOverall }) {
  const [houses, setHouses] = useState([]);
  const [houseId, setHouseId] = useState(isOverall ? "" : user.houseId);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const data = await api.get(`/admin/houses/${id}/members`);
      setMembers(data.members);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <div className="mb-4 max-w-xs">
          <label htmlFor="house-filter" className="label">
            House
          </label>
          <select
            id="house-filter"
            value={houseId}
            onChange={(e) => setHouseId(e.target.value)}
            className="input"
          >
            {houses.map((h) => (
              <option key={h.houseId} value={h.houseId}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {message && <Alert tone="info" className="mb-4">{message}</Alert>}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : members.length === 0 ? (
        <Card>
          <EmptyState icon="👥" title="No members in this House yet">
            New signups are assigned automatically as they register.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-ink-900">
                    <span className="truncate">{m.name}</span>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      {m.role}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">{m.email}</p>
                </div>
                <StreakBadge weeks={m.streak} />
              </div>

              {isOverall && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 p-3">
                  <label htmlFor={`reassign-${m.id}`} className="text-xs font-medium text-ink-600">
                    Reassign House
                  </label>
                  <select
                    id={`reassign-${m.id}`}
                    value={pendingReassign[m.id] ?? m.houseId}
                    onChange={(e) => setPendingReassign((p) => ({ ...p, [m.id]: e.target.value }))}
                    className="rounded-lg border border-ink-300 bg-white px-2.5 py-1.5 text-xs"
                  >
                    {houses.map((h) => (
                      <option key={h.houseId} value={h.houseId}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  {pendingReassign[m.id] && pendingReassign[m.id] !== m.houseId && (
                    <>
                      <Button size="sm" onClick={() => handleConfirmReassign(m.id)}>
                        Confirm move
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPendingReassign((p) => {
                            const next = { ...p };
                            delete next[m.id];
                            return next;
                          })
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )}

              {m.weeklyEntries?.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-ink-200">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Week of</th>
                        <th className="px-3 py-2 font-semibold">Amount</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-200">
                      {m.weeklyEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-3 py-2 text-ink-700">
                            {formatWeekStart(entry.weekStartDate)}
                          </td>
                          <td className="px-3 py-2">
                            {editing?.entryId === entry.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editing.amount}
                                onChange={(e) =>
                                  setEditing({ entryId: entry.id, amount: e.target.value })
                                }
                                className="w-28 rounded-lg border border-ink-300 px-2.5 py-1.5 text-sm tabular-nums"
                              />
                            ) : (
                              <span className="tabular-nums text-ink-700">
                                ${Number(entry.amount).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editing?.entryId === entry.id ? (
                              <span className="flex justify-end gap-1">
                                <Button size="sm" onClick={() => handleSaveEdit(entry.id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                  Cancel
                                </Button>
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setEditing({ entryId: entry.id, amount: entry.amount })
                                }
                              >
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ audit log */

function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/audit-log")
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (loading) return <SkeletonRows rows={5} />;

  if (logs.length === 0) {
    return (
      <Card>
        <EmptyState icon="📋" title="No edits logged yet">
          Every admin change to a submitted amount is recorded here.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Member</th>
            <th className="px-4 py-3 font-semibold">Week of</th>
            <th className="px-4 py-3 font-semibold">Previous</th>
            <th className="px-4 py-3 font-semibold">New</th>
            <th className="px-4 py-3 font-semibold">Edited by</th>
            <th className="px-4 py-3 font-semibold">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {logs.map((log) => (
            <tr key={log.id} className="transition hover:bg-ink-50/60">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-800">
                {log.weeklyEntry.user.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                {formatWeekStart(log.weeklyEntry.weekStartDate)}
              </td>
              <td className="px-4 py-3 tabular-nums text-ink-500 line-through">
                ${Number(log.previousAmount).toFixed(2)}
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums text-ink-900">
                ${Number(log.newAmount).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-600">{log.editedBy.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                {new Date(log.editedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------------- houses */

function HousesPanel() {
  const [houses, setHouses] = useState([]);
  const [form, setForm] = useState({ name: "", portfolioName: "" });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

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
    setCreating(true);
    try {
      await api.post("/houses", form);
      setForm({ name: "", portfolioName: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(houseId, name) {
    // Deleting a House is irreversible and the API rejects it outright if anyone is still
    // assigned, so confirm before spending the round trip.
    if (!window.confirm(`Delete ${name}? This can't be undone.`)) return;
    setError("");
    try {
      await api.delete(`/houses/${houseId}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <CardHeader title="Add a House" subtitle="Members can be assigned to it right away." />
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Team Outreach"
            />
            <Field
              label="Portfolio"
              required
              value={form.portfolioName}
              onChange={(v) => setForm((f) => ({ ...f, portfolioName: v }))}
              placeholder="Outreach"
            />
          </div>
          <Button type="submit" size="sm" loading={creating}>
            {creating ? "Adding..." : "Add House"}
          </Button>
        </form>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <ul className="divide-y divide-ink-200">
          {houses.map((h) => (
            <li key={h.houseId} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span className="min-w-0">
                <span className="font-medium text-ink-800">{h.name}</span>{" "}
                <span className="text-xs text-ink-500">({h.portfolioName})</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleDelete(h.houseId, h.name)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------- settings */

// Keeps derived weights free of float artefacts like 0.30000000000000004.
function round2(n) {
  return Math.round(n * 100) / 100;
}

function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        weeklyMinimum: Number(settings.weeklyMinimum),
        rankingMethod: settings.rankingMethod,
        blendedWeights: settings.blendedWeights,
      });
      setMessage("Settings saved.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <SkeletonRows rows={3} />;

  return (
    <Card className="max-w-md p-5">
      <CardHeader
        title="Campaign settings"
        subtitle="Applies to every House and takes effect immediately."
      />
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <Field
          label="Weekly minimum ($)"
          type="number"
          step="0.01"
          min="0.01"
          max="1000000"
          value={settings.weeklyMinimum}
          onChange={(v) => setSettings((s) => ({ ...s, weeklyMinimum: v }))}
          hint="Entries below this still count, but are flagged as under the minimum."
        />

        <div>
          <label htmlFor="ranking" className="label">
            Ranking method
          </label>
          <select
            id="ranking"
            value={settings.rankingMethod}
            onChange={(e) => setSettings((s) => ({ ...s, rankingMethod: e.target.value }))}
            className="input"
          >
            <option value="participation_rate">Participation rate</option>
            <option value="streak_length">Streak length</option>
            <option value="blended">Blended</option>
          </select>
        </div>

        {settings.rankingMethod === "blended" && (
          <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Participation weight"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.blendedWeights.participation}
                onChange={(v) => {
                  // The two weights have to add up to 1 or scores stop being on a 0-1 scale,
                  // so streak is derived rather than entered separately - there's no way to
                  // type a pair that the server will reject.
                  const participation = Math.min(1, Math.max(0, Number(v) || 0));
                  setSettings((s) => ({
                    ...s,
                    blendedWeights: {
                      participation: round2(participation),
                      streak: round2(1 - participation),
                    },
                  }));
                }}
              />
              <Field
                label="Streak weight"
                type="number"
                value={settings.blendedWeights.streak}
                readOnly
                disabled
                className="input bg-ink-100 text-ink-500"
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Streak weight is whatever's left over. The two always add up to 1.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
          {message && <span className="text-sm text-ink-500">{message}</span>}
        </div>
      </form>
    </Card>
  );
}
