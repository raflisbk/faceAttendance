import type { Config } from "tailwindcss";
import { blackboardPlugin } from "./lib/tailwind-plugin";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chalk: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        blackboard: {
          DEFAULT: "#1a1a1a",
          light: "#2d2d2d",
          dark: "#0f0f0f",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "chalk-write": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        "dust-fall": {
          "0%": { transform: "translateY(-10px)", opacity: "1" },
          "100%": { transform: "translateY(10px)", opacity: "0" },
        },
        "glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "chalk-write": "chalk-write 2s ease-out",
        "dust-fall": "dust-fall 1s ease-out infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
      fontFamily: {
        chalk: ["Kalam", "cursive"],
        mono: ["Fira Code", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "blackboard-texture": `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.05) 0%, transparent 50%)
        `,
        "chalk-dust": `
          radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 20%),
          radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 30%),
          radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 20%)
        `,
      },
      boxShadow: {
        "chalk": "0 0 10px rgba(255, 255, 255, 0.2), inset 0 0 10px rgba(255, 255, 255, 0.1)",
        "blackboard": "inset 0 0 20px rgba(0, 0, 0, 0.5)",
        "eraser": "0 4px 20px rgba(0, 0, 0, 0.3)",
      },
      textShadow: {
        "chalk": "0 0 5px rgba(255, 255, 255, 0.5)",
        "glow": "0 0 10px currentColor",
      },
    },
  },
  plugins: [
    blackboardPlugin,
  ],
} satisfies Config;

export default config;