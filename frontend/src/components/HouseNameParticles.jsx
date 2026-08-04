import { useEffect, useRef } from "react";

// A ring of particles that diffuses outward, piles up against a square boundary, and resolves
// into a House name set inside that square.
//
// The drift is the classic "circle velocity expose" sketch: every particle random-walks its own
// x and y velocity, and the offset applied to particle i is the running sum of every velocity
// before it. Summing along the index is what makes it read as connected filaments rather than
// television static - neighbours inherit their neighbour's drift. Positions are clamped to the
// frame, so the cloud stacks against the edges and draws the square by itself.
//
// The letterforms come from sampling, not from paths. We draw the name to an offscreen canvas,
// read the pixels back, and keep every coordinate whose alpha clears a threshold. Those become
// spring targets alongside the frame's perimeter, so the final state is the square and the word
// together. It costs one getImageData and handles any name an admin types in, which a
// hand-authored SVG path could not.
//
// The canvas is decorative: it is aria-hidden, and the caller renders the name as real text.

const DISPLAY_FONT = '"Newsreader", "Iowan Old Style", Georgia, "Times New Roman", serif';

// Drift never fully clears the canvas, so old positions smoke up behind the cloud. It still
// needs *some* decay or the whole frame saturates to a solid block within a few seconds.
const DRIFT_FADE = 0.011;
const SETTLE_FADE = 0.1;

const DRIFT_NOISE = 0.009; // per-frame jitter added to each particle's x and y velocity
const SPRING = 0.055;
const DAMPING = 0.82;

const FRAME_INSET = 0.06; // square edge, as a fraction of the canvas, kept off the boundary
const RING_RADIUS = 0.13; // starting circle, as a fraction of the square's side
const FRAME_SPACING = 3; // px between perimeter targets
const FRAME_BUDGET = 0.45; // hard ceiling on the share of particles the square may take

const MIN_PARTICLES = 600;
const MAX_PARTICLES = 3200;
const PARTICLE_DENSITY = 90; // one particle per N square px of the frame

function rgba(hex, alpha) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// The square the whole composition is built around: centred, and a true square rather than the
// canvas aspect, so "circle inside a square" holds at every viewport.
function frameRect(width, height) {
  const size = Math.max(40, Math.min(width, height) * (1 - FRAME_INSET * 2));
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

// Walk the four edges together so the corners always land on a target.
function framePoints({ x, y, size }) {
  const steps = Math.max(2, Math.round(size / FRAME_SPACING));
  const step = size / steps;
  const points = [];
  for (let i = 0; i < steps; i += 1) {
    const d = i * step;
    points.push(x + d, y);
    points.push(x + size, y + d);
    points.push(x + size - d, y + size);
    points.push(x, y + size - d);
  }
  return points;
}

// measureText scales linearly with font size, so one measurement at 100px gives us the ratio for
// every size and we avoid a fitting loop.
function fitSize(ctx, lines, maxWidth, maxHeight) {
  ctx.font = `500 100px ${DISPLAY_FONT}`;
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 1);
  return Math.max(13, Math.min(190, (maxWidth / widest) * 100, maxHeight / (lines.length * 1.06)));
}

// House names are short ("Team Advocacy"), but an admin can rename one to anything. Try the whole
// name on one line, then split it across two, and keep whichever sets larger.
function layoutName(ctx, text, maxWidth, maxHeight) {
  const words = text.split(/\s+/).filter(Boolean);
  const candidates = [[text]];
  if (words.length > 1) {
    const split = Math.ceil(words.length / 2);
    candidates.push([words.slice(0, split).join(" "), words.slice(split).join(" ")]);
  }
  return candidates
    .map((lines) => ({ lines, size: fitSize(ctx, lines, maxWidth, maxHeight) }))
    .reduce((best, c) => (c.size > best.size ? c : best));
}

// Sample the name into points, laid out inside the square with room to breathe off the frame.
function sampleNamePoints(text, width, height, rect) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));

  // willReadFrequently keeps this on the CPU backend; without it Chrome warns and the readback
  // forces a GPU sync.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const { lines, size } = layoutName(ctx, text, rect.size * 0.76, rect.size * 0.44);
  ctx.font = `500 ${size}px ${DISPLAY_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  const lineHeight = size * 1.06;
  const cx = rect.x + rect.size / 2;
  const top = rect.y + rect.size / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, cx, top + i * lineHeight));

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const step = size > 110 ? 3 : 2;
  const points = [];
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      // Threshold rather than > 0: antialiased edge pixels would fur the letterforms.
      if (data[(y * canvas.width + x) * 4 + 3] > 140) points.push(x, y);
    }
  }
  return points;
}

export default function HouseNameParticles({ name, accent, reduced = false, className }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  // Everything the loop mutates lives in refs. Putting any of it in state would re-render the
  // component sixty times a second.
  const stateRef = useRef({ name: null, accent: null, reduced: false });
  stateRef.current.name = name;
  stateRef.current.accent = accent;
  stateRef.current.reduced = reduced;

  // The animated path reads new props off the ref on its next frame. The reduced-motion path has
  // no loop, so it needs an explicit repaint handle.
  const repaintRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    const ctx = canvas.getContext("2d");
    // No 2D context (very old browser, or canvas disabled). The caller's text is still in the
    // DOM, so bailing degrades to plain type rather than an empty box.
    if (!ctx) return undefined;

    let frame = null;
    let disposed = false;
    let width = 0;
    let height = 0;
    let rect = null;
    let particles = null;
    let targets = null;
    let settling = false;
    let settleStart = 0;
    let sampledFor = null;

    function build() {
      const box = wrap.getBoundingClientRect();
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      rect = frameRect(width, height);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const count = Math.max(
        MIN_PARTICLES,
        Math.min(MAX_PARTICLES, Math.round((rect.size * rect.size) / PARTICLE_DENSITY))
      );

      // Start evenly spaced on a circle at the centre. The ring has to be visibly ordered for
      // the diffusion to read as spreading rather than as initial noise.
      particles = new Float32Array(count * 5); // x, y, vx, vy, seed
      const radius = rect.size * RING_RADIUS;
      const cx = rect.x + rect.size / 2;
      const cy = rect.y + rect.size / 2;
      for (let i = 0; i < count; i += 1) {
        const o = i * 5;
        const angle = (i / count) * Math.PI * 2;
        particles[o] = cx + Math.cos(angle) * radius;
        particles[o + 1] = cy + Math.sin(angle) * radius;
        particles[o + 2] = 0;
        particles[o + 3] = 0;
        particles[o + 4] = Math.random();
      }

      targets = null;
      sampledFor = null;
      settling = false;
    }

    function shuffled(n) {
      const order = new Uint32Array(n);
      for (let i = 0; i < n; i += 1) order[i] = i;
      for (let i = n - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      return order;
    }

    // The frame and the name are budgeted separately on purpose. Pooling them and spreading every
    // particle across the result made the square's density depend on how many pixels the House
    // name happened to occupy - a long name starved the frame down to a dot every 27px, which
    // doesn't read as a square at all. The frame instead takes exactly what a solid outline needs
    // (one particle per perimeter target), capped so it can never eat more than FRAME_BUDGET of
    // the field, and the name gets everything left over.
    function assignTargets(text) {
      const count = particles.length / 5;
      const framePts = framePoints(rect);
      const textPts = sampleNamePoints(text, width, height, rect);

      // Record the attempt even if it fails, or every frame would re-run getImageData.
      sampledFor = text;
      if (textPts.length < 12 && framePts.length < 12) return;

      const frameN = framePts.length / 2;
      const textN = textPts.length / 2;
      const onFrame = Math.min(frameN, Math.floor(count * FRAME_BUDGET));
      const onText = textN > 0 ? count - onFrame : 0;

      const frameOrder = shuffled(Math.max(frameN, 1));
      const textOrder = shuffled(Math.max(textN, 1));

      // Which particle goes to which group doesn't need interleaving: particles are laid out
      // around the starting ring in index order and stagger on a random per-particle seed, so
      // both groups already assemble together.
      targets = new Float32Array(count * 2);
      for (let i = 0; i < count; i += 1) {
        const toFrame = onText === 0 || i < onFrame;
        const src = toFrame ? framePts : textPts;
        const order = toFrame ? frameOrder : textOrder;
        const slot = toFrame ? i : i - onFrame;
        const p = order[slot % order.length] * 2;
        targets[i * 2] = src[p];
        targets[i * 2 + 1] = src[p + 1];
      }

      settling = true;
      settleStart = performance.now();
    }

    function step() {
      const { name: currentName, accent: currentAccent } = stateRef.current;
      const count = particles.length / 5;
      const colour = currentAccent || "#94a3b8";

      if (currentName && currentName !== sampledFor) assignTargets(currentName);

      // Erase a slice of accumulated alpha instead of painting a background rectangle, so the
      // trail decays over whatever the page has behind the canvas.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${settling ? SETTLE_FADE : DRIFT_FADE})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      if (settling) {
        // Ramp the ink up as they arrive so the composition gains weight instead of appearing
        // all at once.
        const t = Math.min((performance.now() - settleStart) / 900, 1);
        ctx.fillStyle = rgba(colour, 0.1 + 0.28 * t);

        for (let i = 0; i < count; i += 1) {
          const o = i * 5;
          // Stagger by the particle's seed so the square and the word assemble rather than snap.
          const k = t <= particles[o + 4] * 0.45 ? 0 : SPRING;

          particles[o + 2] = (particles[o + 2] + (targets[i * 2] - particles[o]) * k) * DAMPING;
          particles[o + 3] =
            (particles[o + 3] + (targets[i * 2 + 1] - particles[o + 1]) * k) * DAMPING;
          particles[o] += particles[o + 2];
          particles[o + 1] += particles[o + 3];

          ctx.fillRect(particles[o], particles[o + 1], 1.35, 1.35);
        }
      } else {
        ctx.fillStyle = rgba(colour, 0.05);
        const left = rect.x;
        const right = rect.x + rect.size;
        const top = rect.y;
        const bottom = rect.y + rect.size;
        let sx = 0;
        let sy = 0;

        for (let i = 0; i < count; i += 1) {
          const o = i * 5;
          particles[o + 2] += (1 - 2 * Math.random()) * DRIFT_NOISE;
          particles[o + 3] += (1 - 2 * Math.random()) * DRIFT_NOISE;
          // The running sums along i are the whole trick: particle i inherits every drift before
          // it, so the cloud stays a connected filament while it spreads.
          sx += particles[o + 2];
          sy += particles[o + 3];
          // Clamping to the square is what draws it - particles stack against the edges.
          particles[o] = Math.max(left, Math.min(right, particles[o] + sx));
          particles[o + 1] = Math.max(top, Math.min(bottom, particles[o + 1] + sy));
          ctx.fillRect(particles[o], particles[o + 1], 1.2, 1.2);
        }
      }

      if (!disposed) frame = requestAnimationFrame(step);
    }

    // Draw the settled composition in a single pass, no animation and no loop at all.
    function paintStatic() {
      ctx.clearRect(0, 0, width, height);
      const text = stateRef.current.name;
      if (!text) return;

      const points = framePoints(rect).concat(sampleNamePoints(text, width, height, rect));
      ctx.fillStyle = rgba(stateRef.current.accent || "#94a3b8", 0.85);
      for (let i = 0; i < points.length; i += 2) ctx.fillRect(points[i], points[i + 1], 1.35, 1.35);
    }

    repaintRef.current = () => {
      if (!disposed && particles) paintStatic();
    };

    function start() {
      build();
      if (stateRef.current.reduced) paintStatic();
      else frame = requestAnimationFrame(step);
    }

    // Newsreader arrives from Google Fonts with display=swap. Sampling before it lands would
    // spell the House name in the Georgia fallback and never correct itself.
    let cancelled = false;
    const ready = document.fonts?.load(`500 100px "Newsreader"`) ?? Promise.resolve();
    ready.catch(() => {}).then(() => {
      if (!cancelled && !disposed) start();
    });

    const observer = new ResizeObserver(() => {
      if (disposed || !particles) return;
      build();
      if (stateRef.current.reduced) paintStatic();
    });
    observer.observe(wrap);

    return () => {
      disposed = true;
      cancelled = true;
      repaintRef.current = null;
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (reduced) repaintRef.current?.();
  }, [reduced, name, accent]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    </div>
  );
}
