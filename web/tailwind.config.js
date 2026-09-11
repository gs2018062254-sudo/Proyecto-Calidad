/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#04060d",
          900: "#070B14",
          800: "#0b1222",
          700: "#111a2e",
          600: "#1b2643",
          500: "#283558",
        },
        neon: {
          emerald: "#00FFB3",
          cyan: "#00D1FF",
          pink: "#FF3B6B",
          orange: "#FF9A3C",
          yellow: "#FFD23F",
          green: "#3DDC97",
          blue: "#5B8DEF",
          violet: "#B28BFF",
        },
        glass: {
          surface: "rgba(20,30,48,0.65)",
          surface2: "rgba(15,22,38,0.55)",
          border: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
      },
      fontFamily: {
        display: [
          "'Space Grotesk'",
          "'Inter'",
          "system-ui",
          "sans-serif",
        ],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,255,179,0.25), 0 8px 32px -8px rgba(0,255,179,0.35)",
        "neon-sm": "0 0 0 1px rgba(0,255,179,0.18), 0 4px 16px -4px rgba(0,255,179,0.25)",
        glass: "0 20px 40px -20px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.03) inset",
        "glass-sm": "0 8px 24px -12px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset",
      },
      backgroundImage: {
        "grid-slate":
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(60% 50% at 80% -10%, rgba(0,255,179,0.25) 0%, transparent 60%), radial-gradient(40% 40% at 10% 110%, rgba(0,209,255,0.22) 0%, transparent 60%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-slow": "pulse 4s ease-in-out infinite",
        "border-dance": "borderDance 3.5s linear infinite",
        fadeup: "fadeUp .5s cubic-bezier(.2,.8,.2,1) both",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        borderDance: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
