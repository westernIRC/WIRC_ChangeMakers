import { Button } from "../components/ui.jsx";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="animate-fade-in bg-gradient-to-b from-ink-300 to-ink-200 bg-clip-text text-7xl font-extrabold text-transparent">
        404
      </p>
      <h1 className="mt-2 animate-fade-up text-2xl font-bold tracking-tight text-ink-900">
        Page not found
      </h1>
      <p
        className="mt-2 animate-fade-up text-sm text-ink-500"
        style={{ animationDelay: "80ms" }}
      >
        That link doesn't lead anywhere. It may have moved, or the address might have a typo.
      </p>
      <div className="mt-7 flex animate-fade-up gap-3" style={{ animationDelay: "160ms" }}>
        <Button to="/">Back to home</Button>
        <Button to="/leaderboard" variant="secondary">
          Leaderboard
        </Button>
      </div>
    </div>
  );
}
