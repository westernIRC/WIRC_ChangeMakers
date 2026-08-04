import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { houseTheme, houseTint } from "../utils/houseTheme";
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

// Where HouseNameParticles draws the square, as a fraction of the field. Must track FRAME_INSET
// in that component - the rules below extend the drawn edges off-screen, so if the two drift
// apart the rules stop meeting the frame and the whole effect falls over.
const FRAME_EDGE = ["6%", "94%"];

// Static film grain. The accent wash is a very wide, very low-alpha gradient, which is exactly
// the case 8-bit colour banding shows up in; a couple of levels of noise hides the steps.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

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

  // Every accent-coloured layer of the backdrop is held at opacity 0 until the House is known.
  // Gradient colours can't be transitioned, so painting the neutral fallback first would make
  // the whole screen snap hue the moment the fetch lands. Fading up from black instead turns
  // that into the House colour bleeding into the room, and costs nothing - the fetch resolves
  // in a few hundred ms, long before the drift is over.
  const toned = Boolean(house);
  const tint = (alpha) => houseTint(house, alpha);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="House assignment"
      className="fixed inset-0 z-50 flex animate-fade-in flex-col items-center justify-center overflow-hidden bg-[#05070d] px-4"
    >
      <Backdrop tint={tint} toned={toned} landed={landed} />
      {/* The particles carry the name visually; this is what a screen reader gets. */}
      <div aria-live="polite" className="sr-only">
        {landed ? `You've been sorted into ${house.name}, the ${house.portfolioName} portfolio.` : ""}
      </div>

      {/* Held square and at a fixed size so the frame reads as a square at every viewport, and
          so the field doesn't reflow when the labels below it appear. */}
      <div className="relative flex h-[min(84vw,50vh,28rem)] w-[min(84vw,50vh,28rem)] shrink-0 items-center justify-center">
        {/* Halo and rules are children of the square, so they're positioned off the frame's own
            geometry and stay aligned at every viewport without measuring anything. */}
        <Halo tint={tint} toned={toned} landed={landed} />
        <FrameRules tint={tint} toned={toned} />

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

// The room the field sits in. Four stacked layers, all of them cheap: no blurs, no animation
// loops, nothing that competes with the canvas for frame time.
//
// Order is load-bearing. The grid sits under the accent wash so the colour washes over it, and
// the vignette sits over both so it can pull the wash's outer edge back down into black - a wash
// that reached the corners at full strength would flatten the whole screen into one tint.
function Backdrop({ tint, toned, landed }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Hairline grid, masked into a mid-field band: absent at dead centre so it never shows
          through the particles, absent at the rim so it doesn't tile visibly into the corners. */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: toned ? 1 : 0,
          backgroundImage: `linear-gradient(${tint(0.055)} 1px, transparent 1px),
                            linear-gradient(90deg, ${tint(0.055)} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(105% 85% at 50% 40%, transparent 8%, #000 45%, #000 72%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(105% 85% at 50% 40%, transparent 8%, #000 45%, #000 72%, transparent 100%)",
        }}
      />

      {/* Two off-centre blooms. Deliberately not one centred glow - the field itself is already
          dead centre, so an aligned radial would just double it and read as a vignette. These
          come in off the top-left and bottom-right corners and lift once the name lands. */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: toned ? (landed ? 1 : 0.55) : 0,
          backgroundImage: `radial-gradient(90rem 60rem at 18% -12%, ${tint(0.1)}, ${tint(0)} 60%),
                            radial-gradient(70rem 50rem at 94% 110%, ${tint(0.075)}, ${tint(0)} 62%)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(115% 95% at 50% 40%, transparent 45%, rgba(2, 4, 8, 0.9) 100%)",
        }}
      />

      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

// Glow around the square. The core is held transparent out past the frame line so the light
// falls outside the field rather than behind it - the particles are 1.2px dots at partial alpha
// and lose legibility fast against anything lifted.
function Halo({ tint, toned, landed }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[45%] transition-opacity duration-1000"
      style={{
        opacity: toned ? (landed ? 1 : 0.6) : 0,
        backgroundImage: `radial-gradient(closest-side, ${tint(0)} 38%, ${tint(0.16)} 62%, ${tint(0)} 88%)`,
      }}
    />
  );
}

// The frame's four edges, continued off the screen. This is the bit that stops the reveal being
// a glowing box on a dark page: the square stops reading as an object floating in space and
// starts reading as a crop of something larger, which is also the register-mark language the
// rest of the site uses.
//
// Each edge is two segments rather than one line through the middle, so nothing is drawn across
// the field itself - the dotted frame stays dotted. Segments are anchored to the opposite edge
// (right-[94%] puts a segment's end exactly on the left frame line) and run a full viewport
// outward, where the dialog's overflow-hidden clips them.
//
// Nothing runs downward. The caption and CTA sit directly under the square, and a pair of
// hairlines at 44% of the field's width lands inside that column on a phone - they'd cross the
// copy. So the frame bleeds up and sideways and stays open at the bottom, which also points the
// eye at the button.
function FrameRules({ tint, toned }) {
  const line = (dir) => `linear-gradient(${dir}, ${tint(0.22)}, ${tint(0)} 85%)`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: toned ? 1 : 0 }}
    >
      {FRAME_EDGE.map((pos) => (
        <Fragment key={pos}>
          <div
            className="absolute right-[94%] h-px w-screen"
            style={{ top: pos, backgroundImage: line("to left") }}
          />
          <div
            className="absolute left-[94%] h-px w-screen"
            style={{ top: pos, backgroundImage: line("to right") }}
          />
          <div
            className="absolute bottom-[94%] h-screen w-px"
            style={{ left: pos, backgroundImage: line("to top") }}
          />
        </Fragment>
      ))}
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
