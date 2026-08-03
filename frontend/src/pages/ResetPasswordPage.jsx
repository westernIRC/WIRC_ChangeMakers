import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AuthLayout, Alert, Button, Field, TextLink } from "../components/ui.jsx";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Those passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset link missing">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-3xl">
            🔗
          </div>
          <p className="mt-4 text-sm text-ink-600">
            This page needs a reset link from your email.
          </p>
          <div className="mt-5">
            <Button to="/forgot-password" full>
              Request a new link
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl">
            ✅
          </div>
          <p className="mt-4 text-sm text-ink-600">
            You can now log in with your new password.
          </p>
          <div className="mt-5">
            <Button onClick={() => navigate("/login")} full size="lg">
              Go to log in
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Must be at least 8 characters."
      footer={<TextLink to="/login">Back to log in</TextLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Field
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" full size="lg" loading={submitting}>
          {submitting ? "Saving..." : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
