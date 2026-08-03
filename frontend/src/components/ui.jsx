// Shared presentational primitives. Every page was hand-rolling the same Tailwind strings,
// which is how the old UI drifted - three different button paddings, two different card
// borders. Anything visual that appears more than once should live here.

import { forwardRef } from "react";
import { Link } from "react-router-dom";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ buttons */

const BUTTON_VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:hover:bg-brand-600",
  secondary:
    "bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 active:bg-ink-100 disabled:hover:bg-white",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:hover:bg-transparent",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:hover:bg-red-600",
  inverse: "bg-white text-brand-700 shadow-sm hover:bg-brand-50 disabled:hover:bg-white",
};

const BUTTON_SIZES = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-5 py-3 text-base rounded-xl gap-2",
};

// forwardRef so callers can focus a button directly - the House reveal moves focus to its
// CTA once the animation lands.
export const Button = forwardRef(function Button(
  {
    as,
    to,
    variant = "primary",
    size = "md",
    full = false,
    loading = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  const Component = as || (to ? Link : "button");
  const classes = cx(
    "inline-flex items-center justify-center font-semibold transition duration-150",
    "disabled:cursor-not-allowed disabled:opacity-55",
    BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
    BUTTON_SIZES[size] || BUTTON_SIZES.md,
    full && "w-full",
    className
  );

  return (
    <Component
      ref={ref}
      to={to}
      className={classes}
      disabled={Component === "button" ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </Component>
  );
});

/* -------------------------------------------------------------------- cards */

export function Card({ as: Component = "div", interactive = false, className, children, ...rest }) {
  return (
    <Component className={cx(interactive ? "card-interactive" : "card", className)} {...rest}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- inputs */

export function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
  id,
  ...rest
}) {
  const inputId = id || `f-${label?.toLowerCase().replace(/\W+/g, "-")}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cx("input", error && "input-error")}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, checked, onChange, ...rest }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/40"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ signals */

const ALERT_TONES = {
  error: "bg-red-50 text-red-800 border-red-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-brand-50 text-brand-800 border-brand-200",
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
};

export function Alert({ tone = "error", children, className }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "animate-fade-in rounded-xl border px-3.5 py-3 text-sm",
        ALERT_TONES[tone] || ALERT_TONES.neutral,
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", className, children, style }) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-50 text-brand-700",
    flame: "bg-orange-50 text-orange-700",
    success: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      style={style}
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        !style && (tones[tone] || tones.neutral),
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Stat({ label, value, hint, accent, className }) {
  return (
    <div className={cx("card p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-ink-900" style={{ color: accent }}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon = "✨", title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-2xl">
        {icon}
      </div>
      <p className="font-semibold text-ink-800">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Placeholder rows that match the shape of the table they stand in for. */
export function SkeletonRows({ rows = 4, className }) {
  return (
    <div className={cx("space-y-2.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-11" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- navigation */

export function PageHeader({ eyebrow, title, subtitle, action, className }) {
  return (
    <div className={cx("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="animate-fade-up">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Pill filter row. Scrolls horizontally rather than wrapping on narrow screens. */
export function SegmentedControl({ options, value, onChange, className }) {
  return (
    <div className={cx("no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-900"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Shared shell for login / signup / forgot / reset so they line up pixel for pixel. */
export function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className={cx("w-full animate-fade-up", wide && "sm:max-w-lg")}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
        </div>
        <Card className="p-6 sm:p-7">{children}</Card>
        {footer && <div className="mt-5 text-center text-sm text-ink-500">{footer}</div>}
      </div>
    </div>
  );
}

export function TextLink({ to, href, className, children, ...rest }) {
  const classes = cx("font-medium text-brand-600 transition hover:text-brand-700 hover:underline", className);
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes} {...rest}>
      {children}
    </Link>
  );
}

/** Flame chip. Goes grey at zero so an empty streak doesn't look like an achievement. */
export function StreakBadge({ weeks = 0, className }) {
  const lit = weeks > 0;
  return (
    <Badge tone={lit ? "flame" : "neutral"} className={className}>
      <span className={lit ? "" : "grayscale"}>🔥</span>
      {weeks} week{weeks === 1 ? "" : "s"}
    </Badge>
  );
}
