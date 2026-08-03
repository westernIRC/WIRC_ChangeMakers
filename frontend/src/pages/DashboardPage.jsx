import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { isCurrentWeek, formatWeekStart } from "../utils/weeks";
import { houseTheme, houseGradient } from "../utils/houseTheme";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  SkeletonRows,
  Stat,
} from "../components/ui.jsx";

export default function DashboardPage() {
  const { user, refresh } = useAuth();
  const [entries, setEntries] = useState([]);
  const [streak, setStreak] = useState(0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [house, setHouse] = useState(null);
  const [houseUnavailable, setHouseUnavailable] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(user?.isAnonymous ?? false);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await api.get("/entries/me");
      setEntries(data.entries);
      setStreak(data.streak);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (user?.houseId) {
      // Non-critical: a failure here shouldn't take down the rest of the dashboard, but it
      // shouldn't leave a permanent "Loading..." either.
      api
        .get(`/houses/${user.houseId}`)
        .then((data) => setHouse(data.house))
        .catch(() => setHouseUnavailable(true));
    }
  }, [user?.houseId]);

  useEffect(() => {
    setIsAnonymous(user?.isAnonymous ?? false);
  }, [user?.isAnonymous]);

  const thisWeekStart = entries[0] ? new Date(entries[0].weekStartDate) : null;
  const alreadySubmittedThisWeek = thisWeekStart && isCurrentWeek(thisWeekStart);

  const totalRaised = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.amount), 0),
    [entries]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await api.post("/entries", { amount: Number(amount) });
      setAmount("");
      setMessage("Entry submitted — streak extended!");
      await loadEntries();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrivacySave() {
    setPrivacyMessage("");
    setSavingPrivacy(true);
    try {
      await api.patch("/users/me", { isAnonymous });
      await refresh();
      setPrivacyMessage("Saved.");
    } catch (err) {
      setPrivacyMessage(err.message);
    } finally {
      setSavingPrivacy(false);
    }
  }

  const theme = houseTheme(house);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ------------------------------------------------------------ house banner */}
      <div
        className="animate-fade-up overflow-hidden rounded-2xl p-6 shadow-lift sm:p-7"
        style={{
          backgroundImage: house
            ? houseGradient(house)
            : "linear-gradient(135deg, #4d5567, #252b38)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/65">Welcome back,</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {user?.name}
            </h1>
            <p className="mt-1.5 text-sm text-white/75">
              {house ? (
                <Link
                  to={`/houses/${house.id}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline"
                >
                  <span aria-hidden="true">{theme.emoji}</span>
                  {house.name}
                </Link>
              ) : houseUnavailable ? (
                <span className="text-white/60">House unavailable right now</span>
              ) : (
                <span className="text-white/60">Loading your House…</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
            <span className={`text-2xl ${streak > 0 ? "" : "grayscale opacity-60"}`}>🔥</span>
            <div>
              <p className="text-2xl font-bold leading-none tabular-nums text-white">{streak}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/65">
                week{streak === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Current streak" value={`${streak} wk`} accent={theme.accent} />
        <Stat label="Weeks logged" value={entries.length} />
        <Stat
          label="You've raised"
          value={`$${totalRaised.toFixed(2)}`}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* ------------------------------------------------------------------ submit */}
      <Card className="mt-4 p-5 sm:p-6">
        <CardHeader
          title="This week's donation"
          subtitle="Once a week, every week. Entries can't be edited after submission."
        />

        <div className="mt-4">
          {alreadySubmittedThisWeek ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">You're done for this week</p>
                <p className="text-xs text-emerald-700">
                  Come back next Monday to keep the streak going.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[8rem] flex-1">
                <label htmlFor="amount" className="label">
                  Amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-400">
                    $
                  </span>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input pl-7 tabular-nums"
                  />
                </div>
              </div>
              <Button type="submit" size="lg" loading={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </form>
          )}
        </div>

        {error && (
          <Alert tone="error" className="mt-3">
            {error}
          </Alert>
        )}
        {message && (
          <Alert tone="success" className="mt-3">
            {message}
          </Alert>
        )}
      </Card>

      {/* ----------------------------------------------------------------- history */}
      <Card className="mt-4 p-5 sm:p-6">
        <CardHeader title="Your submissions" subtitle="Newest first." />

        <div className="mt-4">
          {loading ? (
            <SkeletonRows rows={3} />
          ) : entries.length === 0 ? (
            <EmptyState icon="🌱" title="No submissions yet">
              Log your first donation above and your streak starts this week.
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-200">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Week of</th>
                    <th className="px-4 py-2.5 font-semibold">Amount</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Minimum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="bg-white transition hover:bg-ink-50/60">
                      <td className="px-4 py-2.5 font-medium text-ink-800">
                        {formatWeekStart(entry.weekStartDate)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-ink-700">
                        ${Number(entry.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {entry.hitMinimum ? (
                          <span className="text-emerald-600" title="Hit the weekly minimum">
                            ✓
                          </span>
                        ) : (
                          <span className="text-ink-300" title="Below the weekly minimum">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* ----------------------------------------------------------------- privacy */}
      <Card className="mt-4 p-5 sm:p-6">
        <CardHeader
          title="Privacy"
          subtitle="Dollar amounts are always private. This only controls your name."
        />
        <div className="mt-4">
          <Checkbox
            label={'Hide my name on my public profile (show "Anonymous" instead)'}
            checked={isAnonymous}
            onChange={setIsAnonymous}
          />
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrivacySave}
              loading={savingPrivacy}
              disabled={savingPrivacy || isAnonymous === (user?.isAnonymous ?? false)}
            >
              {savingPrivacy ? "Saving..." : "Save"}
            </Button>
            {privacyMessage && <span className="text-sm text-ink-500">{privacyMessage}</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
