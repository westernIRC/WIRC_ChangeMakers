import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const initialForm = {
  name: "",
  email: "",
  password: "",
  year: "",
  program: "",
  cause: "",
  fundraisingLink: "",
  isAnonymous: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Please fill this out";
  if (!form.email.trim()) errors.email = "Please fill this out";
  else if (!EMAIL_PATTERN.test(form.email)) errors.email = "Please enter a valid email";
  if (!form.password) errors.password = "Please fill this out";
  else if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
  if (!form.cause.trim()) errors.cause = "Please fill this out";
  if (!form.fundraisingLink.trim()) errors.fundraisingLink = "Please fill this out";
  else if (!isValidUrl(form.fundraisingLink))
    errors.fundraisingLink = "Please enter a valid link (e.g. https://islamicrelief.ca/...)";
  return errors;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await signup(form);
      navigate("/dashboard");
    } catch (err) {
      if (err.field) {
        setErrors((e) => ({ ...e, [err.field]: err.message }));
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      {formError && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Name"
          value={form.name}
          onChange={(v) => update("name", v)}
          error={errors.name}
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => update("email", v)}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => update("password", v)}
          error={errors.password}
        />
        <Field
          label="Year of Study"
          value={form.year}
          onChange={(v) => update("year", v)}
          placeholder="e.g. 2nd Year"
        />
        <Field label="Program" value={form.program} onChange={(v) => update("program", v)} />
        <Field
          label="Cause"
          value={form.cause}
          onChange={(v) => update("cause", v)}
          placeholder="What are you fundraising for?"
          error={errors.cause}
        />
        <Field
          label="Fundraising link"
          value={form.fundraisingLink}
          onChange={(v) => update("fundraisingLink", v)}
          placeholder="https://islamicrelief.ca/your-campaign"
          error={errors.fundraisingLink}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isAnonymous}
            onChange={(e) => update("isAnonymous", e.target.checked)}
          />
          Hide my name on my public profile (show "Anonymous" instead)
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, error }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`w-full rounded border px-3 py-2 focus:outline-none ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-gray-300 focus:border-brand-500"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
