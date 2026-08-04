import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { houseTheme } from "../utils/houseTheme";
import HouseNameParticles from "./HouseNameParticles.jsx";
import { Button, Spinner } from "./ui";

// Full-screen "you've been sorted" moment shown once, right after signup.
//
// The drift isn't just decoration: signup assigns a House server-side but only returns the ID,
// so we have to fetch the House to learn its name. The particle field spreads while that request
// is in flight, which turns unavoidable latency into the best part of the animation. The name
// only resolves once whichever finishes last - the request or the minimum drift - is done, so a
// fast connection still gets the full build-up and a slow one never resolves into an empty name.

// Long enough for the ring to reach the square's edges and for the smoke to build. This is a
// once-per-account moment, so it can take its time in a way a repeated animation could not.
const MIN_DRIFT_MS = 6000;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function HouseReveal({ houseId, onDone }) {
  const reduced = useMemo(prefersReducedMotion, []);
  const [house, setHouse] = useState(null);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const ctaRef = useRef(null);

  // --- fetch the assigned House -------------------------------------------------------
  useEffect(() => {
    let alive = true;
    if (!houseId) {
      setFailed(true);
      return undefined;
    }
    api
      .get(`/houses/${houseId}`)
      .then((data) => alive && setHouse(data.house))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [houseId]);

  // --- decide when to land ------------------------------------------------------------
  const startedAt = useRef(Date.now());
  useEffect(() => {
    if (revealed) return undefined;
    if (!house && !failed) return undefined;

    if (reduced) {
      setRevealed(true);
      return undefined;
    }

    const remaining = Math.max(0, MIN_DRIFT_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setRevealed(true), remaining);
    return () => clearTimeout(timer);
  }, [house, failed, revealed, reduced]);

  // Move focus to the CTA so the reveal is dismissible from the keyboard.
  useEffect(() => {
    if (revealed) ctaRef.current?.focus();
  }, [revealed]);

  // Escape skips the whole thing.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const theme = houseTheme(house);
  const landed = revealed && !failed && Boolean(house);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="House assignment"
      className="fixed inset-0 z-50 flex animate-fade-in flex-col items-center justify-center overflow-hidden bg-[#080d16] px-4"
    >
      {/* The particles carry the name visually; this is what a screen reader gets. */}
      <div aria-live="polite" className="sr-only">
        {landed ? `You've been sorted into ${house.name}, the ${house.portfolioName} portfolio.` : ""}
      </div>

      {/* Held square and at a fixed size so the frame reads as a square at every viewport, and
          so the field doesn't reflow when the labels below it appear. */}
      <div className="relative flex h-[min(84vw,50vh,28rem)] w-[min(84vw,50vh,28rem)] shrink-0 items-center justify-center">
        <HouseNameParticles
          name={landed ? house.name : null}
          accent={theme.accent}
          reduced={reduced}
          className="absolute inset-0"
        />

        {failed && revealed && <FallbackCard onDone={onDone} ctaRef={ctaRef} />}
      </div>

      {/* Both states occupy the same slot under the field, so nothing shifts on the swap. */}
      <div className="relative z-10 mt-6 flex min-h-[9rem] w-full max-w-md flex-col items-center text-center">
        {landed ? (
          <>
            <p
              className="animate-fade-in text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: theme.accent, animationDelay: "500ms" }}
            >
              {house.portfolioName} portfolio
            </p>
            <p
              className="mt-4 max-w-xs animate-fade-up text-sm leading-relaxed text-white/55"
              style={{ animationDelay: "800ms" }}
            >
              Log a donation every week to build your streak. Your consistency is what moves{" "}
              {house.name} up the leaderboard.
            </p>
            <div className="mt-7 animate-fade-up" style={{ animationDelay: "1000ms" }}>
              <Button ref={ctaRef} onClick={onDone} variant="inverse" size="lg">
                Enter your dashboard →
              </Button>
            </div>
          </>
        ) : (
          !failed && (
            <>
              <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                <Spinner className="h-3.5 w-3.5 text-white/60" />
                Sorting you into a House
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/35">
                Every member is placed on a team. You'll fundraise together and climb the
                leaderboard together.
              </p>
              <button
                type="button"
                onClick={onDone}
                className="mt-7 rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition hover:text-white/80"
              >
                Skip
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}

// Shown when the House lookup fails. The account exists either way, so this must never block
// the user - it just drops the celebration and gets them to the dashboard.
function FallbackCard({ onDone, ctaRef }) {
  return (
    <div className="relative z-10 flex animate-fade-in flex-col items-center px-4 text-center">
      <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-white">
        You're in!
      </h1>
      <p className="mt-3 max-w-xs text-sm text-white/60">
        Your account is ready. We couldn't load your House just now, but it'll be on your dashboard.
      </p>
      <div className="mt-7">
        <Button ref={ctaRef} onClick={onDone} variant="inverse" size="lg">
          Go to your dashboard →
        </Button>
      </div>
    </div>
  );
}
