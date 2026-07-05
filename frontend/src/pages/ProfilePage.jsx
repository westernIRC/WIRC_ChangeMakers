import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

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

  if (error) return <div className="mx-auto max-w-lg px-4 py-10 text-red-700">{error}</div>;
  if (!user) return <div className="mx-auto max-w-lg px-4 py-10 text-gray-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        {(user.year || user.program) && (
          <p className="mt-1 text-sm text-gray-600">
            {[user.year, user.program].filter(Boolean).join(" · ")}
          </p>
        )}
        {user.cause && (
          <p className="mt-4">
            <span className="font-medium">Fundraising for:</span> {user.cause}
          </p>
        )}
        {user.fundraisingLink && (
          <a
            href={user.fundraisingLink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-brand-600 hover:underline"
          >
            View fundraising page →
          </a>
        )}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          🔥 {user.streak} week{user.streak === 1 ? "" : "s"} streak
        </div>
        {user.houseId && (
          <p className="mt-4 text-sm">
            <Link to={`/houses/${user.houseId}`} className="text-brand-600 hover:underline">
              View House →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
