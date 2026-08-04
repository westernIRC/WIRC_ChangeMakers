// Per-House colour identity.
//
// Houses have no colour column in the database, and admins can rename them at any time, so
// nothing here can rely on an ID. Named portfolios get a hand-picked hue; anything else
// (a renamed or newly created House) falls back to a hash of the name, which is stable and
// gives distinct-looking Houses without a migration.
//
// Colours are returned as raw hex rather than Tailwind class names on purpose: Tailwind's
// purge only sees class strings that exist literally in the source, so `bg-${colour}-500`
// would silently produce no CSS in a production build.

const PALETTE = {
  presidents: { accent: "#4f46e5", from: "#6366f1", to: "#4338ca", emoji: "👑" },
  finance: { accent: "#059669", from: "#10b981", to: "#047857", emoji: "📈" },
  events: { accent: "#c026d3", from: "#d946ef", to: "#a21caf", emoji: "🎪" },
  internals: { accent: "#0284c7", from: "#38bdf8", to: "#0369a1", emoji: "⚙️" },
  charity: { accent: "#e11d48", from: "#fb7185", to: "#be123c", emoji: "🤲" },
  marketing: { accent: "#d97706", from: "#fbbf24", to: "#b45309", emoji: "📣" },
  advocacy: { accent: "#7c3aed", from: "#a78bfa", to: "#6d28d9", emoji: "⚖️" },
  externals: { accent: "#0d9488", from: "#2dd4bf", to: "#0f766e", emoji: "🌍" },
};

// Ordered so the hash fallback still spreads across the full range of hues.
const FALLBACKS = Object.values(PALETTE);

const NEUTRAL = { accent: "#4d5567", from: "#9aa2b5", to: "#3a4152", emoji: "🏠" };

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // force 32-bit so long names don't lose precision
  }
  return Math.abs(h);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^team\s+/, "")
    .replace(/\s+portfolio$/, "")
    .trim();
}

/**
 * Resolve a House's colours. Accepts either a House object or a bare name string.
 * Always returns a full theme - never null - so callers can use it unconditionally.
 */
export function houseTheme(house) {
  if (!house) return NEUTRAL;

  const key = normalize(typeof house === "string" ? house : house.portfolioName || house.name);
  if (!key) return NEUTRAL;
  if (PALETTE[key]) return PALETTE[key];

  return FALLBACKS[hash(key) % FALLBACKS.length];
}

/** `linear-gradient(...)` string for inline `style` use. */
export function houseGradient(house, angle = "135deg") {
  const t = houseTheme(house);
  return `linear-gradient(${angle}, ${t.from}, ${t.to})`;
}

/** Translucent tint of a House's accent, for soft backgrounds and borders. */
export function houseTint(house, alpha = 0.12) {
  const { accent } = houseTheme(house);
  const n = parseInt(accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Every named portfolio, for the homepage's House list. */
export const KNOWN_PORTFOLIOS = Object.keys(PALETTE).map(
  (k) => k.charAt(0).toUpperCase() + k.slice(1)
);
