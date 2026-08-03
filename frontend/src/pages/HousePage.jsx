import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { houseTheme, houseGradient } from "../utils/houseTheme";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  SkeletonRows,
  Stat,
  StreakBadge,
} from "../components/ui.jsx";

const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "rolling3mo", label: "Last 3 months" },
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
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await api.patch(`/houses/${houseId}`, renameForm);
      setRenameMessage("House updated.");
      await load();
    } catch (err) {
      setRenameMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert tone="error">{error}</Alert>
        <div className="mt-4">
          <Button to="/leaderboard" variant="secondary">
            Back to leaderboard
          </Button>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="skeleton h-36 rounded-2xl" />
        <SkeletonRows rows={3} className="mt-4" />
      </div>
    );
  }

  const theme = houseTheme(house);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ------------------------------------------------------------------ banner */}
      <div
        className="animate-fade-up overflow-hidden rounded-2xl p-6 shadow-lift sm:p-8"
        style={{ backgroundImage: houseGradient(house) }}
      >
        <div className="flex items-start gap-4">
          <span className="text-4xl drop-shadow-sm" aria-hidden="true">
            {theme.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {house.name}
            </h1>
            <p className="mt-1 text-sm text-white/70">{house.portfolioName} portfolio</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            #{house.rank}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- controls */}
      <div className="no-scrollbar -mx-1 mt-5 flex gap-1.5 overflow-x-auto px-1 py-1">
        {PERIODS.map((p) => {
          const active = p.value === period;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              aria-pressed={active}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition"
              style={
                active
                  ? { background: theme.accent, color: "#fff" }
                  : { background: "#fff", color: "#4d5567", boxShadow: "inset 0 0 0 1px #e4e7ee" }
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Total raised" value={`$${house.total.toFixed(2)}`} accent={theme.accent} />
        <Stat label="Overall rank" value={`#${house.rank}`} />
        <Stat
          label="Participation"
          value={`${Math.round((house.participationRate ?? 0) * 100)}%`}
        />
      </div>

      {/* ----------------------------------------------------------------- members */}
      <Card className="mt-4 p-5 sm:p-6">
        <CardHeader
          title="Members"
          subtitle={`${house.members.length} member${house.members.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4">
          {house.members.length === 0 ? (
            <EmptyState icon="👥" title="No members yet">
              New signups are assigned to Houses automatically.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-ink-200">
              {house.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    to={`/profile/${m.id}`}
                    className="flex min-w-0 items-center gap-3 font-medium text-ink-800 hover:text-brand-700"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundImage: houseGradient(house) }}
                    >
                      {(m.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{m.name}</span>
                  </Link>
                  <StreakBadge weeks={m.streak} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------------------- admin */}
      {canRename && (
        <Card className="mt-4 p-5 sm:p-6">
          <CardHeader title="Edit House details" subtitle="Visible to everyone immediately." />
          <form onSubmit={handleRename} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="House name"
                value={renameForm.name}
                onChange={(v) => setRenameForm((f) => ({ ...f, name: v }))}
              />
              <Field
                label="Portfolio name"
                value={renameForm.portfolioName}
                onChange={(v) => setRenameForm((f) => ({ ...f, portfolioName: v }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary" size="sm" loading={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              {renameMessage && <span className="text-sm text-ink-500">{renameMessage}</span>}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
