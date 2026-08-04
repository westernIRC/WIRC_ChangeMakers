/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6fd",
          100: "#d7ebfb",
          200: "#b4d9f6",
          300: "#83c0ef",
          400: "#3b93de",
          500: "#0778d4",
          600: "#0a63ac",
          700: "#0b4f87",
          800: "#0c3f6b",
          900: "#0b3255",
          950: "#072138",
        },
        ink: {
          // Warm-tinted neutrals. Pure grey next to the brand blue reads slightly green.
          50: "#f8f9fb",
          100: "#f1f3f7",
          200: "#e4e7ee",
          300: "#cfd4e0",
          400: "#9aa2b5",
          500: "#6b7488",
          600: "#4d5567",
          700: "#3a4152",
          800: "#252b38",
          900: "#161b26",
        },
      },
      fontFamily: {
        // Additive only. Nothing outside the homepage uses `font-display`, so adding this
        // changes no existing page - it just makes the serif available.
        display: ["Newsreader", "Iowan Old Style", "Georgia", "Times New Roman", "serif"],
        sans: [
          "Inter var",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(16 24 40 / 0.10), 0 2px 6px -2px rgb(16 24 40 / 0.06)",
        lift: "0 12px 32px -8px rgb(16 24 40 / 0.18)",
        glow: "0 0 0 1px rgb(255 255 255 / 0.12), 0 18px 48px -12px rgb(0 0 0 / 0.55)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // The reveal card's landing beat: overshoots slightly, then settles.
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(.6) rotate(-6deg)" },
          "60%": { opacity: "1", transform: "scale(1.08) rotate(2deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0)" },
        },
        // Names blur past during the shuffle, so each swap reads as motion not a flicker.
        "reel-spin": {
          "0%": { opacity: "0", transform: "translateY(70%)", filter: "blur(4px)" },
          "35%": { opacity: "1", filter: "blur(0)" },
          "100%": { opacity: "0", transform: "translateY(-70%)", filter: "blur(4px)" },
        },
        "confetti-fall": {
          "0%": { opacity: "1", transform: "translate3d(0,-10vh,0) rotate(0)" },
          "100%": { opacity: "0", transform: "translate3d(var(--drift,0), 105vh, 0) rotate(var(--spin,720deg))" },
        },
        "ring-pulse": {
          "0%": { opacity: ".55", transform: "scale(.85)" },
          "70%": { opacity: "0", transform: "scale(1.5)" },
          "100%": { opacity: "0", transform: "scale(1.5)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "bar-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in .4s ease-out both",
        "fade-up": "fade-up .5s cubic-bezier(.21,1.02,.73,1) both",
        "scale-in": "scale-in .35s cubic-bezier(.21,1.02,.73,1) both",
        "pop-in": "pop-in .7s cubic-bezier(.34,1.56,.64,1) both",
        "reel-spin": "reel-spin var(--reel-duration,140ms) linear both",
        "confetti-fall": "confetti-fall var(--fall,2.8s) cubic-bezier(.3,.1,.6,1) forwards",
        "ring-pulse": "ring-pulse 2.4s cubic-bezier(0,.55,.45,1) infinite",
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 1.8s infinite",
        "gradient-pan": "gradient-pan 12s ease infinite",
        "bar-grow": "bar-grow .8s cubic-bezier(.21,1.02,.73,1) both",
      },
    },
  },
  plugins: [],
};
