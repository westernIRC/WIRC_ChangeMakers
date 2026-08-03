import { useAuth } from "../context/AuthContext.jsx";
import { Button, Card } from "../components/ui.jsx";
import { houseTheme, houseGradient, KNOWN_PORTFOLIOS } from "../utils/houseTheme";

const STEPS = [
  {
    icon: "🎯",
    title: "Pick your cause",
    body: "Sign up with the campaign you care about and the link people can donate through.",
  },
  {
    icon: "🏠",
    title: "Get sorted into a House",
    body: "Everyone joins one of eight Houses the moment they sign up. You climb together.",
  },
  {
    icon: "🔥",
    title: "Build your streak",
    body: "Log a donation once a week, every week. Consistency counts more than any single total.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-[0.13] blur-3xl"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, #0778d4, #0d9488, #7c3aed, #0778d4)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
            </span>
            Western Islamic Relief Canada
          </span>

          <h1 className="mt-6 animate-fade-up text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-6xl">
            Give weekly.
            <br />
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500 bg-clip-text text-transparent">
              Rise together.
            </span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl animate-fade-up text-balance text-lg text-ink-500"
            style={{ animationDelay: "80ms" }}
          >
            Fundraise for your own cause, build a weekly giving streak, and compete as a House.
            The leaderboard rewards showing up — not the size of your wallet.
          </p>

          <div
            className="mt-8 flex animate-fade-up flex-col justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "160ms" }}
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
            <Button to="/leaderboard" variant="secondary" size="lg">
              View the leaderboard
            </Button>
          </div>

          {/* House colour strip. Static on purpose: no request, no loading state, and it
              still previews what you're joining. */}
          <div
            className="mt-14 flex animate-fade-up flex-wrap justify-center gap-2"
            style={{ animationDelay: "240ms" }}
          >
            {KNOWN_PORTFOLIOS.map((p, i) => {
              const theme = houseTheme(p);
              return (
                <span
                  key={p}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                  style={{
                    backgroundImage: houseGradient(p),
                    animationDelay: `${240 + i * 40}ms`,
                  }}
                >
                  <span aria-hidden="true">{theme.emoji}</span>
                  {p}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- how it works */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card
              key={step.title}
              interactive
              className="animate-fade-up p-6"
              style={{ animationDelay: `${320 + i * 90}ms` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-xl">
                {step.icon}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">
                Step {i + 1}
              </p>
              <h2 className="mt-1 font-semibold text-ink-900">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.body}</p>
            </Card>
          ))}
        </div>

        {!user && (
          <div
            className="mt-6 animate-fade-up overflow-hidden rounded-2xl px-6 py-10 text-center shadow-lift sm:px-10"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #0b4f87 0%, #0a63ac 45%, #0d9488 130%)",
              animationDelay: "600ms",
            }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Your House is waiting.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              Sign up takes a minute. You'll find out which of the eight you're on right away.
            </p>
            <div className="mt-6 flex justify-center">
              <Button to="/signup" variant="inverse" size="lg">
                Create your account
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
