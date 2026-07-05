/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6fd",
          100: "#d7ebfb",
          400: "#3b93de",
          500: "#0778d4",
          600: "#0a63ac",
          700: "#0b4f87",
        },
      },
    },
  },
  plugins: [],
};
