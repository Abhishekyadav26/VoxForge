import type { Config } from "tailwindcss";

/*
 * The ink-orbit dark theme, applied app-wide: the slate scale is remapped to
 * the ink palette (page/paper/card/ink/soft/muted/faint/line) so every page —
 * home sections, studio, agents — inherits the hero/features look without
 * touching their markup. Emerald stays as the accent (presence-dot green).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f5f5f5", // near-white (rare)
          100: "#eeeeee", // ink — primary text
          200: "#d4d4d4",
          300: "#c9c9c9", // soft — secondary text
          400: "#8d8d8d", // muted — tertiary text
          500: "#5d5d5d", // faint — captions/labels
          600: "#4a4a4a",
          700: "#3a3a3a", // bracket — stronger borders
          800: "#2a2a2a", // line-strong — cards/borders
          900: "#181818", // card — panel background
          950: "#0b0b0b", // page — app background
        },
      },
      fontFamily: {
        sans: ['"Manrope"', '"Inter"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", '"SF Mono"', "Menlo", "Consolas", "monospace"],
        serif: ['"Newsreader"', '"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', "Georgia", '"Times New Roman"', "serif"],
      },
    },
  },
  plugins: [],
};
export default config;