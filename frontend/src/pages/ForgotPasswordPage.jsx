import { useState } from "react";
import { api } from "../api/client";
import { AuthLayout, Alert, Button, Field, TextLink } from "../components/ui.jsx";

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
      <AuthLayout
        title="Check your email"
        footer={<TextLink to="/login">Back to log in</TextLink>}
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-3xl">
            ✉️
          </div>
          <p className="mt-4 text-sm text-ink-600">
            If an account exists for <span className="font-semibold text-ink-900">{email}</span>,
            we've sent a link to reset your password. It expires in an hour.
          </p>
          <p className="mt-4 text-sm text-ink-500">
            Didn't get it? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-brand-600 hover:underline"
            >
              try a different email
            </button>
            .
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={
        <>
          Remembered it? <TextLink to="/login">Log in</TextLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <Button type="submit" full size="lg" loading={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
