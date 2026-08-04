import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import HouseReveal from "../components/HouseReveal.jsx";
import { AuthLayout, Alert, Button, Field, Checkbox, TextLink } from "../components/ui.jsx";

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
  // Set once signup succeeds; switches the page over to the House reveal instead of
  // navigating straight to the dashboard.
  const [assignedHouseId, setAssignedHouseId] = useState(undefined);

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
      const newUser = await signup(form);
      setAssignedHouseId(newUser?.houseId ?? null);
    } catch (err) {
      if (err.field) {
        setErrors((e) => ({ ...e, [err.field]: err.message }));
      } else {
        setFormError(err.message);
      }
      setSubmitting(false);
    }
    // Deliberately no `finally`: on success the reveal takes over the screen, and clearing
    // the submitting flag would flash the form's idle state behind it.
  }

  if (assignedHouseId !== undefined) {
    return <HouseReveal houseId={assignedHouseId} onDone={() => navigate("/dashboard")} />;
  }

  return (
    <AuthLayout
      wide
      title="Join Changemakers"
      subtitle="Pick your cause, get sorted into a House, and start your streak."
      footer={
        <>
          Already have an account? <TextLink to="/login">Log in</TextLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <Field
          label="Name"
          value={form.name}
          onChange={(v) => update("name", v)}
          error={errors.name}
          autoComplete="name"
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => update("email", v)}
          error={errors.email}
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => update("password", v)}
          error={errors.password}
          hint="At least 8 characters."
          autoComplete="new-password"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Year of study"
            value={form.year}
            onChange={(v) => update("year", v)}
            placeholder="e.g. 2nd Year"
          />
          <Field
            label="Program"
            value={form.program}
            onChange={(v) => update("program", v)}
            placeholder="e.g. Health Sci"
          />
        </div>

        <div className="border-t border-ink-200 pt-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Your cause
          </p>
          <div className="space-y-4">
            <Field
              label="What are you fundraising for?"
              value={form.cause}
              onChange={(v) => update("cause", v)}
              placeholder="e.g. Emergency relief in Gaza"
              error={errors.cause}
            />
            <Field
              label="Fundraising link"
              value={form.fundraisingLink}
              onChange={(v) => update("fundraisingLink", v)}
              placeholder="https://islamicrelief.ca/your-campaign"
              error={errors.fundraisingLink}
            />
          </div>
        </div>

        <Checkbox
          label={'Hide my name on my public profile (show "Anonymous" instead)'}
          checked={form.isAnonymous}
          onChange={(v) => update("isAnonymous", v)}
        />

        <Button type="submit" full size="lg" loading={submitting}>
          {submitting ? "Creating your account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
