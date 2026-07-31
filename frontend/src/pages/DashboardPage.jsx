import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { isCurrentWeek, formatWeekStart } from "../utils/weeks";

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await api.post("/entries", { amount: Number(amount) });
      setAmount("");
      setMessage("Entry submitted!");
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
      <p className="mt-1 text-gray-600">Current streak: {streak} week{streak === 1 ? "" : "s"}</p>
      <p className="mt-1 text-gray-600">
        House:{" "}
        {house ? (
          <Link to={`/houses/${house.id}`} className="font-medium text-brand-600 hover:underline">
            {house.name}
          </Link>
        ) : houseUnavailable ? (
          "Unavailable right now"
        ) : (
          "Loading..."
        )}
      </p>

      <div className="mt-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Submit this week's amount</h2>
        {alreadySubmittedThisWeek ? (
          <p className="text-sm text-gray-600">
            You've already submitted for this week. Come back next week!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Amount ($)</span>
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32 rounded border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-2 text-sm text-brand-700">{message}</p>}
        <p className="mt-2 text-xs text-gray-500">
          Entries can't be edited after submission. Once a week, every week.
        </p>
      </div>

      <div className="mt-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Privacy</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          Hide my name on my public profile (show "Anonymous" instead)
        </label>
        <button
          onClick={handlePrivacySave}
          disabled={savingPrivacy || isAnonymous === (user?.isAnonymous ?? false)}
          className="mt-3 rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {savingPrivacy ? "Saving..." : "Save"}
        </button>
        {privacyMessage && <p className="mt-2 text-sm text-gray-600">{privacyMessage}</p>}
      </div>

      <div className="mt-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Your past submissions</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-1">Week of</th>
                <th className="py-1">Amount</th>
                <th className="py-1">Hit minimum?</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-1">{formatWeekStart(entry.weekStartDate)}</td>
                  <td className="py-1">${Number(entry.amount).toFixed(2)}</td>
                  <td className="py-1">{entry.hitMinimum ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
