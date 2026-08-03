import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { houseTheme, houseGradient, houseTint } from "../utils/houseTheme";
import {
  Alert,
  Card,
  EmptyState,
  PageHeader,
  SegmentedControl,
  SkeletonRows,
  StreakBadge,
  TextLink,
} from "../components/ui.jsx";

const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "rolling3mo", label: "Last 3 months" },
  { value: "all", label: "Campaign to date" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [view, setView] = useState("houses");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        subtitle="Ranked by consistency — participation rate and streak length — not by who raised the most."
      />

      <div className="mb-5 inline-flex rounded-xl bg-ink-100 p-1">
        {[
          { value: "houses", label: "Houses" },
          { value: "individuals", label: "Individuals" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setView(tab.value)}
            aria-pressed={view === tab.value}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              view === tab.value
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "houses" ? <HouseLeaderboard /> : <IndividualLeaderboard />}
    </div>
  );
}

/* --------------------------------------------------------------------- houses */

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

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div>
      <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />

      {error ? (
        <Alert tone="error" className="mt-5">
          {error}
        </Alert>
      ) : loading ? (
        <SkeletonRows rows={5} className="mt-5" />
      ) : leaderboard.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="🏁" title="Nothing here yet">
            No Houses have logged donations for this period.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Visual order puts 1st in the middle on desktop; source order stays 1-2-3 so
              screen readers and keyboard tabbing still follow the ranking. */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:items-end">
            {podium.map((h, i) => (
              <PodiumCard key={h.houseId} house={h} index={i} />
            ))}
          </div>

          {rest.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">House</th>
                    <th className="px-4 py-3 font-semibold">Raised</th>
                    <th className="px-4 py-3 font-semibold">Participation</th>
                    <th className="px-4 py-3 text-right font-semibold">Avg streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {rest.map((h) => {
                    const theme = houseTheme(h.name);
                    return (
                      <tr key={h.houseId} className="transition hover:bg-ink-50/60">
                        <td className="px-4 py-3 font-bold tabular-nums text-ink-400">{h.rank}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/houses/${h.houseId}`}
                            className="inline-flex items-center gap-2 font-medium text-ink-800 hover:text-brand-700"
                          >
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: theme.accent }}
                            />
                            {h.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-600">
                          ${h.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <ParticipationBar rate={h.participationRate} accent={theme.accent} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-600">
                          {h.avgStreak.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PodiumCard({ house, index }) {
  const theme = houseTheme(house.name);
  // 1st sits highest, then 3rd, then 2nd — mirrors a real podium without reordering the DOM.
  const order = ["sm:order-2", "sm:order-1", "sm:order-3"][index];
  const lift = ["sm:pb-10", "sm:pb-4", "sm:pb-2"][index];

  return (
    <Link
      to={`/houses/${house.houseId}`}
      className={`group animate-fade-up rounded-2xl p-5 text-white shadow-lift transition hover:-translate-y-1 ${order} ${lift}`}
      style={{ backgroundImage: houseGradient(house.name), animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl" aria-hidden="true">
          {MEDALS[index]}
        </span>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
          #{house.rank}
        </span>
      </div>
      <p className="mt-3 text-lg font-bold leading-tight group-hover:underline">{house.name}</p>
      <p className="mt-0.5 text-sm text-white/70 tabular-nums">${house.total.toFixed(2)} raised</p>
      <div className="mt-3 flex items-center gap-3 text-xs font-medium text-white/80">
        <span>{Math.round(house.participationRate * 100)}% active</span>
        <span aria-hidden="true">·</span>
        <span>🔥 {house.avgStreak.toFixed(1)} avg</span>
      </div>
    </Link>
  );
}

function ParticipationBar({ rate, accent }) {
  const pct = Math.round((rate ?? 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-200">
        <div
          className="h-full origin-left animate-bar-grow rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
      <span className="tabular-nums text-xs text-ink-500">{pct}%</span>
    </div>
  );
}

/* ---------------------------------------------------------------- individuals */

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

  // The House view is public; this one names people, so it needs a session. Prompt rather
  // than firing a request we know will 401.
  if (!authLoading && !user) {
    return (
      <Card className="mt-5">
        <EmptyState icon="🔒" title="Members only">
          Individual rankings name people, so they're only visible once you{" "}
          <TextLink to="/login">log in</TextLink>.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-500">
        Ranked by personal streak, independent of how their House is doing. Dollar amounts stay
        private.
      </p>

      {error ? (
        <Alert tone="error" className="mt-5">
          {error}
        </Alert>
      ) : loading ? (
        <SkeletonRows rows={6} className="mt-5" />
      ) : leaderboard.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="🌱" title="No streaks yet">
            Once members start logging weekly donations, they'll show up here.
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">House</th>
                <th className="px-4 py-3 text-right font-semibold">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {leaderboard.map((row) => {
                const theme = houseTheme(row.houseName);
                const isMe = row.userId === user?.id;
                return (
                  <tr
                    key={row.userId}
                    className="transition hover:bg-ink-50/60"
                    style={isMe ? { background: houseTint(row.houseName, 0.08) } : undefined}
                  >
                    <td className="px-4 py-3 font-bold tabular-nums text-ink-400">
                      {row.rank <= 3 ? (
                        <span aria-label={`Rank ${row.rank}`}>{MEDALS[row.rank - 1]}</span>
                      ) : (
                        row.rank
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/profile/${row.userId}`}
                        className="font-medium text-ink-800 hover:text-brand-700"
                      >
                        {row.name}
                      </Link>
                      {isMe && (
                        <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.houseId ? (
                        <Link
                          to={`/houses/${row.houseId}`}
                          className="inline-flex items-center gap-2 text-ink-600 hover:text-brand-700"
                        >
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: theme.accent }}
                          />
                          {row.houseName}
                        </Link>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StreakBadge weeks={row.streak} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
