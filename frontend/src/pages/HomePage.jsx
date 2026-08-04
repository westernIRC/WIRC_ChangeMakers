import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "../components/ui.jsx";
import { houseTheme, KNOWN_PORTFOLIOS } from "../utils/houseTheme";

// Same three steps as before, verbatim. They're laid out as a numbered column beside the
// headline rather than as three cards across - the steps are a sequence, and a card grid
// reads as three unrelated features.
const STEPS = [
  {
    title: "Pick your cause",
    body: "Sign up with the campaign you care about and the link people can donate through.",
  },
  {
    title: "Get sorted into a House",
    body: "Everyone joins one of eight Houses the moment they sign up. You climb together.",
  },
  {
    title: "Build your streak",
    body: "Log a donation once a week, every week. Consistency counts more than any single total.",
  },
];

/** Small caps label with wide tracking. Used as the section marker throughout. */
function Label({ children, className = "" }) {
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 ${className}`}
    >
      {children}
    </span>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════════════ masthead */}
      {/* A rule across the top with the org name set into it, the way a paper puts its
          name above the fold. Replaces the centred pill-with-a-pulsing-dot. */}
      <div className="border-b border-ink-200">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5">
          <Label>Western Islamic Relief Canada</Label>
          <span aria-hidden="true" className="h-px flex-1 bg-ink-200" />
          <span className="hidden text-xs font-medium uppercase tracking-[0.14em] text-ink-500 sm:inline">
            {KNOWN_PORTFOLIOS.length} Houses · One week at a time
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ hero */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-x-14 gap-y-12 py-14 lg:grid-cols-12 lg:py-20">
          {/* ── headline column ── */}
          <div className="lg:col-span-7">
            <h1 className="animate-fade-up font-display text-[2.75rem] font-medium leading-[0.95] tracking-[-0.02em] text-ink-900 sm:text-7xl">
              Give weekly.
              <br />
              {/* Italic serif on the turn, in the IRC blue. Does the job the clipped
                  rainbow gradient was doing, without the gradient. */}
              <em className="font-normal italic text-brand-600">Rise together.</em>
            </h1>

            <p
              className="mt-7 max-w-xl animate-fade-up text-lg leading-relaxed text-ink-600"
              style={{ animationDelay: "90ms" }}
            >
              Fundraise for your own cause, build a weekly giving streak, and compete as a House.
              The leaderboard rewards showing up — not the size of your wallet.
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-wrap items-center gap-x-8 gap-y-4"
              style={{ animationDelay: "180ms" }}
            >
              {user ? (
                <Button to="/dashboard" size="lg">
                  Go to your dashboard →
                </Button>
              ) : (
                <Button to="/signup" size="lg">
                  Get started — it's free
                </Button>
              )}
              {/* One button, one link. Two buttons of equal weight make the reader stop and
                  choose; there's a clear primary action here. */}
              <Link
                to="/leaderboard"
                className="group inline-flex items-center gap-2 border-b border-ink-300 pb-0.5 text-base font-medium text-ink-800 transition hover:border-brand-600 hover:text-brand-700"
              >
                View the leaderboard
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* ── steps column ── */}
          <div
            className="animate-fade-up lg:col-span-5 lg:border-l lg:border-ink-200 lg:pl-14"
            style={{ animationDelay: "260ms" }}
          >
            <Label className="!text-ink-500">How it works</Label>
            <ol className="mt-5">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-t border-ink-200 py-5 first:border-t-0 first:pt-0"
                >
                  <span
                    aria-hidden="true"
                    className="font-display text-2xl font-normal leading-none text-brand-500"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-medium leading-snug text-ink-900">
                      {step.title}
                    </h2>
                    <p className="mt-1.5 text-base leading-relaxed text-ink-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ houses */}
      {/* The eight Houses as an index - numeral, rule, name, colour - rather than eight
          gradient pills. Same information, and it's the page's one big visual moment. */}
      <section className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="font-display text-3xl font-medium tracking-[-0.01em] text-ink-900 sm:text-4xl">
              The eight Houses
            </h2>
            <p className="text-base text-ink-600">
              You're assigned one when you sign up. You climb with them.
            </p>
          </div>

          <ul className="mt-9 grid gap-x-14 sm:grid-cols-2">
            {KNOWN_PORTFOLIOS.map((name, i) => {
              const theme = houseTheme(name);
              return (
                <li
                  key={name}
                  className="group animate-fade-up border-t border-ink-200"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className="flex items-center gap-4 py-4">
                    <span
                      aria-hidden="true"
                      className="font-display text-sm tabular-nums text-ink-500"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-2xl font-medium text-ink-900">{name}</span>
                    {/* The House's colour as a rule that fills the gap, not a filled pill.
                        Decorative - the name beside it already identifies the House. */}
                    <span
                      aria-hidden="true"
                      className="ml-auto h-1 w-12 rounded-full transition-all duration-300 group-hover:w-20"
                      style={{ background: theme.accent }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ cta */}
      {!user && (
        <section className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-7 bg-brand-700 px-8 py-11 sm:px-12">
            <div className="max-w-lg">
              <h2 className="font-display text-3xl font-medium leading-tight text-white sm:text-4xl">
                Your House is waiting.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-brand-100">
                Sign up takes a minute. You'll find out which of the eight you're on right away.
              </p>
            </div>
            <Button to="/signup" variant="inverse" size="lg">
              Create your account
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
