import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(12, 18, 32, 0.04)",
        md: "0 1px 2px rgba(12, 18, 32, 0.04), 0 4px 16px rgba(12, 18, 32, 0.05)",
        lg: "0 12px 40px rgba(12, 18, 32, 0.12), 0 4px 16px rgba(12, 18, 32, 0.06)",
        xl: "0 20px 60px rgba(12, 18, 32, 0.14), 0 6px 24px rgba(12, 18, 32, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
