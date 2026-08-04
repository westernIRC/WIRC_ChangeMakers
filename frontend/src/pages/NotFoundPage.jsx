import { Button } from "../components/ui.jsx";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-16">
      {/* Left-aligned, and the numeral is a serif figure rather than a clipped grey gradient. */}
      <p className="animate-fade-in text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
        404
      </p>
      <h1 className="mt-3 animate-fade-up font-display text-5xl font-medium tracking-[-0.015em] text-ink-900">
        Page not found
      </h1>
      <p
        className="mt-4 animate-fade-up text-base leading-relaxed text-ink-600"
        style={{ animationDelay: "80ms" }}
      >
        That link doesn't lead anywhere. It may have moved, or the address might have a typo.
      </p>
      <div
        className="mt-8 flex animate-fade-up flex-wrap gap-3 border-t border-ink-200 pt-7"
        style={{ animationDelay: "160ms" }}
      >
        <Button to="/">Back to home</Button>
        <Button to="/leaderboard" variant="secondary">
          Leaderboard
        </Button>
      </div>
    </div>
  );
}
