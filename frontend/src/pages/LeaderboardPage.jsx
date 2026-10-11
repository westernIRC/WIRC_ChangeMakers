import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { houseTheme, houseTint } from "../utils/houseTheme";
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

const VIEWS = [
  { value: "houses", label: "Houses" },
  { value: "individuals", label: "Individuals" },
];

export default function LeaderboardPage() {
  const [view, setView] = useState("houses");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        subtitle="Ranked by consistency, meaning participation rate and streak length, not by who raised the most."
      />

      {/* Was a pill group in a grey trough; now the same underlined tabs as the header, via
          the shared control. */}
      <SegmentedControl options={VIEWS} value={view} onChange={setView} className="mb-7" />

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

  return (
    <div>
      {/* The period filter sits under the Houses/Individuals tabs, so it drops the container
          rule to stay clearly subordinate to them. */}
      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={setPeriod}
        className="!border-b-0"
      />

      {error ? (
        <Alert tone="error" className="mt-5">
          {error}
        </Alert>
      ) : loading ? (
        <SkeletonRows rows={5} className="mt-6" />
      ) : leaderboard.length === 0 ? (
        <Card className="mt-6">
          <EmptyState title="Nothing here yet">
            No Houses have logged donations for this period.
          </EmptyState>
        </Card>
      ) : (
        /* One ranked index instead of three gradient podium cards above a separate table.
           The podium split meant 1st-3rd and 4th-8th were formatted so differently you
           couldn't compare them; a single list with the leaders set larger keeps the emphasis
           without breaking the column alignment. */
        <div className="mt-6">
          <div className="hidden grid-cols-[2.75rem_1fr_6rem_7rem_5rem] items-center gap-4 border-b-2 border-ink-900 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 sm:grid">
            <span>#</span>
            <span>House</span>
            <span className="text-right">Raised</span>
            <span>Participation</span>
            <span className="text-right">Avg streak</span>
          </div>
          <ul>
            {leaderboard.map((h, i) => (
              <HouseRow key={h.houseId} house={h} index={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HouseRow({ house, index }) {
  const theme = houseTheme(house.name);
  // Top three are set larger. No medals: the rank numeral already says it, and the emoji
  // rendered differently on every platform.
  const lead = house.rank <= 3;
  const pct = Math.round((house.participationRate ?? 0) * 100);

  return (
    <li
      className="animate-fade-up border-b border-ink-200"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <Link
        to={`/houses/${house.houseId}`}
        className="group block py-4 transition hover:bg-ink-50/70"
      >
        <div className="grid grid-cols-[2.75rem_1fr] items-center gap-4 sm:grid-cols-[2.75rem_1fr_6rem_7rem_5rem]">
          <span
            className={`font-display tabular-nums leading-none ${
              lead ? "text-2xl text-ink-900" : "text-base text-ink-500"
            }`}
          >
            {String(house.rank).padStart(2, "0")}
          </span>

          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`truncate font-display font-medium text-ink-900 ${
                lead ? "text-xl sm:text-2xl" : "text-lg"
              }`}
            >
              {house.name}
            </span>
            <span
              aria-hidden="true"
              className="h-1 w-8 shrink-0 rounded-full transition-all duration-300 group-hover:w-14"
              style={{ background: theme.accent }}
            />
          </span>

          <span className="hidden text-right text-sm tabular-nums text-ink-600 sm:block">
            ${house.total.toFixed(2)}
          </span>
          <span className="hidden sm:block">
            <ParticipationBar rate={house.participationRate} accent={theme.accent} />
          </span>
          <span className="hidden text-right text-sm tabular-nums text-ink-600 sm:block">
            {house.avgStreak.toFixed(1)}
          </span>
        </div>

        {/* Narrow screens can't hold five columns, so the figures reflow onto one line. Only
            ever one of the two is rendered, so nothing is announced twice. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-[3.75rem] text-xs tabular-nums text-ink-500 sm:hidden">
          <span>${house.total.toFixed(2)}</span>
          <span aria-hidden="true">·</span>
          <span>{pct}% active</span>
          <span aria-hidden="true">·</span>
          <span>{house.avgStreak.toFixed(1)} avg streak</span>
        </div>
      </Link>
    </li>
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
      <Card className="mt-6">
        <EmptyState title="Members only">
          Individual rankings name people, so they're only visible once you{" "}
          <TextLink to="/login">log in</TextLink>.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div>
      <p className="text-base leading-relaxed text-ink-600">
        Ranked by personal streak, independent of how their House is doing. Dollar amounts stay
        private.
      </p>

      {error ? (
        <Alert tone="error" className="mt-5">
          {error}
        </Alert>
      ) : loading ? (
        <SkeletonRows rows={6} className="mt-6" />
      ) : leaderboard.length === 0 ? (
        <Card className="mt-6">
          <EmptyState title="No streaks yet">
            Once members start logging weekly donations, they'll show up here.
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-6">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-ink-900 text-left text-[11px] uppercase tracking-[0.14em] text-ink-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">#</th>
                <th className="py-2 pr-4 font-semibold">Member</th>
                <th className="py-2 pr-4 font-semibold">House</th>
                <th className="py-2 text-right font-semibold">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {leaderboard.map((row) => {
                const theme = houseTheme(row.houseName);
                const isMe = row.userId === user?.id;
                return (
                  <tr
                    key={row.userId}
                    className="transition hover:bg-ink-50/70"
                    style={isMe ? { background: houseTint(row.houseName, 0.08) } : undefined}
                  >
                    <td
                      className={`py-3 pr-4 font-display tabular-nums ${
                        row.rank <= 3 ? "text-xl text-ink-900" : "text-base text-ink-500"
                      }`}
                    >
                      {String(row.rank).padStart(2, "0")}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        to={`/profile/${row.userId}`}
                        className="font-medium text-ink-900 underline decoration-ink-300 decoration-1 underline-offset-[3px] transition hover:decoration-ink-900"
                      >
                        {row.name}
                      </Link>
                      {isMe && (
                        <span className="ml-2 rounded-sm bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-700">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {row.houseId ? (
                        <Link
                          to={`/houses/${row.houseId}`}
                          className="inline-flex items-center gap-2.5 text-ink-600 transition hover:text-ink-900"
                        >
                          <span
                            aria-hidden="true"
                            className="h-1 w-6 shrink-0 rounded-full"
                            style={{ background: theme.accent }}
                          />
                          {row.houseName}
                        </Link>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
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
