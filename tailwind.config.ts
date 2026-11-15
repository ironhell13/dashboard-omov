import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      colors: {
        bg: "var(--bg)",
        "bg-subtle": "var(--bg-subtle)",
        "bg-tint": "var(--bg-tint)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
        },
        "accent-light": "var(--accent-light)",
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
        },
        status: {
          success: {
            text: "#17714A",
            bg: "#E3F6EC",
          },
          warning: {
            text: "#8A5300",
            bg: "#FFF3DC",
          },
          danger: {
            text: "#B02A2A",
            bg: "#FDE8E8",
          },
        },
      },
      borderRadius: {
        card: "12px",
        btn: "10px",
        input: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(15, 42, 67, 0.06)",
        card: "0 1px 3px rgba(15, 42, 67, 0.08)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
