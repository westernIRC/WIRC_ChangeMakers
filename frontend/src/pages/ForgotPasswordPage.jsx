import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // The success state is deliberately identical whether or not the address is registered -
  // it mirrors the API, which won't confirm whether an account exists.
  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-gray-600">
          If an account exists for <span className="font-medium">{email}</span>, we've sent a link
          to reset your password. The link expires in an hour.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Didn't get it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-brand-600 hover:underline"
          >
            try a different email
          </button>
          .
        </p>
        <p className="mt-6 text-sm text-gray-600">
          <Link to="/login" className="text-brand-600 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Forgot your password?</h1>
      <p className="mb-6 text-sm text-gray-600">
        Enter your email and we'll send you a link to choose a new one.
      </p>
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Remembered it?{" "}
        <Link to="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
