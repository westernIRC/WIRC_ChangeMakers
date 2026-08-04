import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { houseTheme } from "../utils/houseTheme";
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
        <div className="skeleton h-32" />
        <SkeletonRows rows={3} className="mt-6" />
      </div>
    );
  }

  const theme = houseTheme(house);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* ---------------------------------------------------------------- masthead */}
      {/* The House's colour is a full-width rule over the name rather than a gradient slab
          behind it. Same identity, and the name stays black on white where it's readable. */}
      <div className="animate-fade-up border-b border-ink-200 pb-6">
        <span
          aria-hidden="true"
          className="block h-1.5 w-24 rounded-full"
          style={{ background: theme.accent }}
        />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-ink-900 sm:text-5xl">
              {house.name}
            </h1>
            <p className="mt-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              {house.portfolioName} portfolio
            </p>
          </div>
          <p className="shrink-0 font-display text-3xl font-medium tabular-nums text-ink-900">
            #{house.rank}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- controls */}
      {/* Kept bespoke rather than switched to SegmentedControl so the active tab can carry
          this House's own colour. */}
      <div className="no-scrollbar mt-7 flex gap-7 overflow-x-auto">
        {PERIODS.map((p) => {
          const active = p.value === period;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              aria-pressed={active}
              className={`shrink-0 border-b-2 pb-2.5 text-sm font-medium transition ${
                active
                  ? "text-ink-900"
                  : "border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900"
              }`}
              style={active ? { borderBottomColor: theme.accent } : undefined}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-x-6">
        <Stat label="Total raised" value={`$${house.total.toFixed(2)}`} accent={theme.accent} />
        <Stat label="Overall rank" value={`#${house.rank}`} />
        <Stat
          label="Participation"
          value={`${Math.round((house.participationRate ?? 0) * 100)}%`}
        />
      </div>

      {/* ----------------------------------------------------------------- members */}
      <Card className="mt-9 p-5 sm:p-6">
        <CardHeader
          title="Members"
          subtitle={`${house.members.length} member${house.members.length === 1 ? "" : "s"}`}
        />
        <div className="mt-5">
          {house.members.length === 0 ? (
            <EmptyState title="No members yet">
              New signups are assigned to Houses automatically.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-ink-200 border-t border-ink-200">
              {house.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  {/* The initials disc is gone. Every member here is in the same House, so
                      tinting it by House said nothing, and white initials on the lighter
                      accents (amber, teal, emerald) sat under 3:1. */}
                  <Link
                    to={`/profile/${m.id}`}
                    className="min-w-0 truncate font-medium text-ink-900 underline decoration-ink-300 decoration-1 underline-offset-[3px] transition hover:decoration-ink-900"
                  >
                    {m.name}
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
        <Card className="mt-6 p-5 sm:p-6">
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
