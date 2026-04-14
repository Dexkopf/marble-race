import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Bebas Neue'", "cursive"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        track: {
          bg: "#0a0a0f",
          panel: "#111118",
          border: "#1e1e2e",
          glow: "#7c3aed",
        },
        marble: {
          gold: "#f59e0b",
          silver: "#94a3b8",
          bronze: "#a16207",
        },
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124,58,237,0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(124,58,237,0.8)" },
        },
        "rank-in": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.4s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
        "pop-in": "pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "rank-in": "rank-in 0.3s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
