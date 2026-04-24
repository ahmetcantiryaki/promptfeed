import type { Config } from "tailwindcss";

// Tokens lifted from referance-mockup.html :root
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        label: "var(--label)",
        accent: "var(--accent)",
        "accent-fg": "var(--accent-fg)",
        hover: "var(--hover)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        card: "10px",
        btn: "6px",
      },
      boxShadow: {
        surface: "var(--shadow)",
      },
      fontFamily: {
        sans: [
          "var(--font-jetbrains-mono)",
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "1.4" }],
      },
      letterSpacing: {
        widest2: "0.08em",
      },
    },
  },
  plugins: [],
};

export default config;
