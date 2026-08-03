import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { houseTheme, houseGradient, KNOWN_PORTFOLIOS } from "../utils/houseTheme";
import { Button, Spinner } from "./ui";

// Full-screen "you've been sorted" moment shown once, right after signup.
//
// The shuffle isn't just decoration: signup assigns a House server-side but only returns the
// ID, so we have to fetch the House to learn its name. The reel runs while that request is in
// flight, which turns unavoidable latency into the best part of the animation. The reveal
// waits for whichever finishes last - the request or the minimum spin - so a fast connection
// still gets the full build-up and a slow one never reveals an empty card.

const MIN_SPIN_MS = 2200;
const FIRST_INTERVAL = 70;
const LAST_INTERVAL = 300;
const CONFETTI_COUNT = 70;

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
  const [tick, setTick] = useState(0);
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

  // --- the reel -----------------------------------------------------------------------
  // Decelerating setTimeout chain rather than a fixed setInterval, so the names visibly slow
  // down into the reveal instead of stopping dead.
  const startedAt = useRef(Date.now());
  useEffect(() => {
    if (revealed || reduced) return undefined;

    let timer;
    const step = () => {
      const elapsed = Date.now() - startedAt.current;
      const progress = Math.min(elapsed / MIN_SPIN_MS, 1);
      const eased = progress * progress; // slow at first, then a sharp ramp at the end
      const delay = FIRST_INTERVAL + (LAST_INTERVAL - FIRST_INTERVAL) * eased;

      setTick((t) => t + 1);
      timer = setTimeout(step, delay);
    };

    timer = setTimeout(step, FIRST_INTERVAL);
    return () => clearTimeout(timer);
  }, [revealed, reduced]);

  // --- decide when to land ------------------------------------------------------------
  useEffect(() => {
    if (revealed) return undefined;
    if (!house && !failed) return undefined;

    if (reduced) {
      setRevealed(true);
      return undefined;
    }

    const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - startedAt.current));
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
  const reelName = KNOWN_PORTFOLIOS[tick % KNOWN_PORTFOLIOS.length];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="House assignment"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-4 animate-fade-in"
      style={{
        background:
          "radial-gradient(90rem 60rem at 50% -20%, #15325a 0%, #0b1a2e 45%, #060d18 100%)",
      }}
    >
      {revealed && !failed && <Confetti theme={theme} />}

      {/* Soft colour bloom behind the card, tinted to the House once it lands. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl transition-all duration-1000"
        style={{
          background: revealed ? theme.accent : "#1e3a5f",
          opacity: revealed ? 0.3 : 0.16,
          transform: revealed ? "scale(1)" : "scale(.7)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        {revealed ? (
          failed ? (
            <FallbackCard onDone={onDone} ctaRef={ctaRef} />
          ) : (
            <RevealedCard house={house} theme={theme} onDone={onDone} ctaRef={ctaRef} />
          )
        ) : (
          <SpinningCard name={reelName} tick={tick} />
        )}
      </div>

      {!revealed && (
        <button
          type="button"
          onClick={onDone}
          className="absolute bottom-8 z-10 text-xs font-medium text-white/45 transition hover:text-white/80"
        >
          Skip
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- states */

function SpinningCard({ name, tick }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/50">
        <Spinner className="h-4 w-4 text-white/60" />
        Sorting you into a House
      </div>

      <div className="relative mt-8 flex h-32 w-full items-center justify-center overflow-hidden">
        {/* key forces a remount each tick so the slide-through animation replays */}
        <span
          key={tick}
          className="animate-reel-spin bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
        >
          {name}
        </span>
        {/* Fades the reel out at the top and bottom edges. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #0a1626 0%, transparent 32%, transparent 68%, #0a1626 100%)",
          }}
        />
      </div>

      <p className="mt-6 max-w-xs text-sm text-white/40">
        Every member is placed on a team. You'll fundraise together and climb the leaderboard
        together.
      </p>
    </div>
  );
}

function RevealedCard({ house, theme, onDone, ctaRef }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p
        className="animate-fade-in text-sm font-medium uppercase tracking-[0.2em] text-white/50"
        style={{ animationDelay: "120ms" }}
      >
        Welcome to
      </p>

      <div className="relative mt-5">
        {/* Two offset pulses read as a single expanding ripple. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ring-pulse rounded-3xl"
          style={{ background: theme.accent }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ring-pulse rounded-3xl"
          style={{ background: theme.accent, animationDelay: "1.2s" }}
        />

        <div
          className="relative animate-pop-in rounded-3xl px-9 py-8 shadow-glow"
          style={{ backgroundImage: houseGradient(house) }}
        >
          <div className="animate-float text-5xl drop-shadow-sm">{theme.emoji}</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl">
            {house.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-white/75">
            {house.portfolioName} portfolio
          </p>
        </div>
      </div>

      <p
        className="mt-7 max-w-xs animate-fade-up text-sm text-white/60"
        style={{ animationDelay: "700ms" }}
      >
        Log a donation every week to build your streak. Your consistency is what moves{" "}
        {house.name} up the leaderboard.
      </p>

      <div className="mt-7 animate-fade-up" style={{ animationDelay: "900ms" }}>
        <Button ref={ctaRef} onClick={onDone} variant="inverse" size="lg">
          Enter your dashboard →
        </Button>
      </div>
    </div>
  );
}

// Shown when the House lookup fails. The account exists either way, so this must never block
// the user - it just drops the celebration and gets them to the dashboard.
function FallbackCard({ onDone, ctaRef }) {
  return (
    <div className="flex flex-col items-center text-center animate-scale-in">
      <div className="text-5xl">🎉</div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">You're in!</h1>
      <p className="mt-2 max-w-xs text-sm text-white/60">
        Your account is ready. We couldn't load your House just now — it'll be on your dashboard.
      </p>
      <div className="mt-7">
        <Button ref={ctaRef} onClick={onDone} variant="inverse" size="lg">
          Go to your dashboard →
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- confetti */

// Hand-rolled rather than pulling in a canvas library: it's ~70 absolutely positioned divs
// driven entirely by CSS, which keeps the dependency count at zero and stays on the compositor.
function Confetti({ theme }) {
  const pieces = useMemo(() => {
    const colors = [theme.from, theme.to, theme.accent, "#ffffff", "#fcd34d"];
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 900,
      duration: 2400 + Math.random() * 2200,
      drift: `${(Math.random() - 0.5) * 40}vw`,
      spin: `${540 + Math.random() * 900}deg`,
      size: 6 + Math.random() * 7,
      color: colors[i % colors.length],
      round: Math.random() > 0.65,
    }));
  }, [theme]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            animationDelay: `${p.delay}ms`,
            "--fall": `${p.duration}ms`,
            "--drift": p.drift,
            "--spin": p.spin,
          }}
        />
      ))}
    </div>
  );
}
