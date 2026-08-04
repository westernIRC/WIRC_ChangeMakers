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
        <h2 className="font-display text-xl font-medium leading-snug text-ink-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-ink-600">{subtitle}</p>}
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

// Hairline on three sides, a solid 2px marker on the left.
const ALERT_TONES = {
  error: "bg-red-50 text-red-800 border-red-200 border-l-red-600",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200 border-l-emerald-600",
  info: "bg-brand-50 text-brand-800 border-brand-200 border-l-brand-600",
  neutral: "bg-ink-100 text-ink-700 border-ink-200 border-l-ink-500",
};

export function Alert({ tone = "error", children, className }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        // Left rule rather than a full rounded box: it reads as a margin note, and it lines
        // up with the hairlines everywhere else.
        "animate-fade-in border-y border-r border-l-2 px-3.5 py-3 text-sm",
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
    neutral: "bg-ink-100 text-ink-600",
    brand: "bg-brand-50 text-brand-700",
    flame: "bg-brand-50 text-brand-700",
    success: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      style={style}
      className={cx(
        // Small-caps chip rather than a rounded pill, matching the page's section markers.
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
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

// A figure under a rule, not a boxed card. Same information, and a row of these reads as one
// table of numbers instead of three floating tiles.
export function Stat({ label, value, hint, accent, className }) {
  return (
    <div className={cx("border-t-2 border-ink-900 pt-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className="mt-2 font-display text-3xl font-medium tabular-nums leading-none text-ink-900"
        style={{ color: accent }}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

// No emoji-in-a-circle, and left-aligned rather than centred - a centred column of text with a
// decorative glyph on top is the single most generic empty state there is. The `icon` prop is
// gone; callers were passing 🌱 / 👥 / 🏁, which the rest of the design no longer uses.
export function EmptyState({ title, children, action }) {
  return (
    <div className="px-6 py-9">
      <p className="font-display text-xl font-medium text-ink-900">{title}</p>
      {children && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-600">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
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

// The homepage masthead in page form: small-caps marker, serif headline, and a rule closing
// the block off from the content below it.
export function PageHeader({ eyebrow, title, subtitle, action, className }) {
  return (
    <div
      className={cx(
        "mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-ink-200 pb-6",
        className
      )}
    >
      <div className="animate-fade-up">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2.5 font-display text-4xl font-medium tracking-[-0.015em] text-ink-900 sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * Underlined tab row, the same treatment as the header's nav. Still scrolls horizontally
 * rather than wrapping on narrow screens.
 */
export function SegmentedControl({ options, value, onChange, className }) {
  return (
    <div
      className={cx("no-scrollbar flex gap-7 overflow-x-auto border-b border-ink-200", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cx(
              // -mb-px pulls the tab's own rule onto the container's, so the active one reads
              // as a single continuous line rather than two stacked borders.
              "-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-medium transition",
              active
                ? "border-brand-600 text-ink-900"
                : "border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shared shell for login / signup / forgot / reset so they line up pixel for pixel.
 * Left-aligned rather than centred: a centred heading over a centred card is exactly the
 * composition the homepage moved away from.
 */
export function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className={cx("w-full animate-fade-up", wide && "sm:max-w-lg")}>
        <div className="mb-7 border-b border-ink-200 pb-6">
          <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-ink-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base leading-relaxed text-ink-600">{subtitle}</p>
          )}
        </div>
        {/* No card box. The rule above already separates the heading from the fields, and a
            bordered panel inside a narrow column just draws a second frame around it. */}
        <div>{children}</div>
        {footer && (
          <div className="mt-7 border-t border-ink-200 pt-5 text-sm text-ink-600">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function TextLink({ to, href, className, children, ...rest }) {
  // Underlined by default with the rule set below the baseline, the way body copy links are
  // set in print. Reveal-on-hover underlines make links invisible until you find them.
  const classes = cx(
    "font-medium text-brand-700 underline decoration-brand-300 decoration-1 underline-offset-[3px] transition hover:decoration-brand-700",
    className
  );
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

/**
 * Streak chip. Stays neutral at zero so an empty streak doesn't look like an achievement.
 * The flame emoji is gone; the number carries it, and nothing else in the design uses emoji.
 */
export function StreakBadge({ weeks = 0, className }) {
  const lit = weeks > 0;
  return (
    <Badge tone={lit ? "brand" : "neutral"} className={cx("tabular-nums", className)}>
      {weeks} week{weeks === 1 ? "" : "s"}
    </Badge>
  );
}
