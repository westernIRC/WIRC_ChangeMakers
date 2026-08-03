import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthLayout, Alert, Button, Field, TextLink } from "../components/ui.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to submit this week and keep your streak alive."
      footer={
        <>
          Need an account? <TextLink to="/signup">Sign up</TextLink>
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

        <div>
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <TextLink to="/forgot-password" className="text-xs">
              Forgot your password?
            </TextLink>
          </div>
        </div>

        <Button type="submit" full size="lg" loading={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
