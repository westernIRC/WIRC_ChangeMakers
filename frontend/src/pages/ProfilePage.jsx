import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { houseTheme } from "../utils/houseTheme";
import { Alert, Button, SkeletonRows, StreakBadge, TextLink } from "../components/ui.jsx";

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
        <div className="skeleton h-20" />
        <SkeletonRows rows={2} className="mt-6" />
      </div>
    );
  }

  // Anonymous members have year/program/cause/link nulled out server-side, so there may be
  // nothing below the header at all.
  const hasDetails = user.cause || user.fundraisingLink;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="animate-fade-up">
        {/* The gradient cover photo and the floating avatar tile are gone. The House colour
            is a rule above the name, which is the same move the House and Dashboard
            mastheads make. Falls back to neutral rather than hashing the person's name -
            a colour that doesn't match their House is worse than no colour at all. */}
        <span
          aria-hidden="true"
          className="block h-1.5 w-24 rounded-full"
          style={{ background: user.houseName ? houseTheme(user.houseName).accent : "#4d5567" }}
        />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-ink-200 pb-6">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-ink-900">
              {user.name}
            </h1>
            {(user.year || user.program) && (
              <p className="mt-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {[user.year, user.program].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <StreakBadge weeks={user.streak} />
        </div>

        {hasDetails && (
          <div className="mt-7">
            {user.cause && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                  Fundraising for
                </p>
                <p className="mt-2 font-display text-2xl font-medium leading-snug text-ink-900">
                  {user.cause}
                </p>
              </>
            )}
            {user.fundraisingLink && (
              <a
                href={user.fundraisingLink}
                target="_blank"
                rel="noreferrer noopener"
                className="group mt-4 inline-flex items-center gap-2 border-b border-ink-300 pb-0.5 text-base font-medium text-ink-800 transition hover:border-brand-600 hover:text-brand-700"
              >
                Visit fundraising page
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  ↗
                </span>
              </a>
            )}
          </div>
        )}

        {user.houseId && (
          <p className="mt-8 border-t border-ink-200 pt-5 text-sm">
            <TextLink to={`/houses/${user.houseId}`}>View their House →</TextLink>
          </p>
        )}
      </div>
    </div>
  );
}
