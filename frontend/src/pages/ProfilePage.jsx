import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { houseGradient } from "../utils/houseTheme";
import { Alert, Button, Card, SkeletonRows, StreakBadge, TextLink } from "../components/ui.jsx";

export default function ProfilePage() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setUser(null);
    api
      .get(`/users/${userId}`)
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message));
  }, [userId]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Alert tone="error">{error}</Alert>
        <div className="mt-4">
          <Button to="/leaderboard" variant="secondary">
            Back to leaderboard
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="skeleton h-24 rounded-2xl" />
        <SkeletonRows rows={2} className="mt-4" />
      </div>
    );
  }

  // Anonymous members have year/program/cause/link nulled out server-side, so there may be
  // nothing below the header at all.
  const hasDetails = user.cause || user.fundraisingLink;
  const initial = (user.name || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card className="animate-fade-up overflow-hidden">
        <div
          className="h-24"
          style={{
            // Falls back to neutral rather than hashing the person's name - a colour that
            // doesn't match their House is worse than no colour at all.
            backgroundImage: user.houseName
              ? houseGradient(user.houseName)
              : "linear-gradient(135deg, #9aa2b5, #3a4152)",
          }}
        />

        <div className="px-6 pb-6">
          <div className="-mt-9 flex items-end justify-between gap-3">
            <span
              className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-4 border-white bg-ink-100 text-2xl font-bold text-ink-700 shadow-sm"
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="pb-1">
              <StreakBadge weeks={user.streak} />
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">{user.name}</h1>
          {(user.year || user.program) && (
            <p className="mt-1 text-sm text-ink-500">
              {[user.year, user.program].filter(Boolean).join(" · ")}
            </p>
          )}

          {hasDetails && (
            <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              {user.cause && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Fundraising for
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-800">{user.cause}</p>
                </>
              )}
              {user.fundraisingLink && (
                <a
                  href={user.fundraisingLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Visit fundraising page
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}

          {user.houseId && (
            <p className="mt-5 text-sm">
              <TextLink to={`/houses/${user.houseId}`}>View their House →</TextLink>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
