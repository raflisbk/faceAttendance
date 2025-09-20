import type { Config } from "tailwindcss";

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
        // Enterprise theme colors
        whiteboard: {
          DEFAULT: "hsl(var(--whiteboard))",
          dark: "hsl(var(--whiteboard-dark))",
        },
        marker: {
          blue: "hsl(var(--marker-blue))",
          red: "hsl(var(--marker-red))",
          green: "hsl(var(--marker-green))",
          orange: "hsl(var(--marker-orange))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
        kalam: ["Kalam", "cursive"],
        caveat: ["Caveat", "cursive"],
        architects: ["Architects Daughter", "cursive"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        large: "var(--shadow-large)",
      },
      animation: {
        "fade-in": "fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slide-up 1s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scale-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        "chalk-write": "chalk-write 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(40px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.8) rotate(-2deg)", filter: "blur(2px)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)", filter: "blur(0)" },
        },
        "chalk-write": {
          "0%": { opacity: "0", transform: "translateX(-20px) rotate(-5deg)", filter: "blur(2px)" },
          "50%": { opacity: "0.7", transform: "translateX(0) rotate(0deg)", filter: "blur(1px)" },
          "100%": { opacity: "1", transform: "translateX(0) rotate(0deg)", filter: "blur(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { textShadow: "0 0 5px rgba(100, 255, 180, 0.5), 0 0 10px rgba(100, 255, 180, 0.3)" },
          "50%": { textShadow: "0 0 10px rgba(100, 255, 180, 0.8), 0 0 20px rgba(100, 255, 180, 0.5)" },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-sm': '16px 16px',
        'grid-md': '24px 24px',
        'grid-lg': '32px 32px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom plugin for enterprise utilities
    function({ addUtilities, theme }: any) {
      const newUtilities = {
        '.shadow-soft': {
          'box-shadow': 'var(--shadow-soft)',
        },
        '.shadow-medium': {
          'box-shadow': 'var(--shadow-medium)',
        },
        '.shadow-large': {
          'box-shadow': 'var(--shadow-large)',
        },
        '.bg-whiteboard': {
          'background-color': 'hsl(var(--whiteboard))',
        },
        '.text-marker-blue': {
          'color': 'hsl(var(--marker-blue))',
        },
        '.text-marker-red': {
          'color': 'hsl(var(--marker-red))',
        },
        '.text-marker-green': {
          'color': 'hsl(var(--marker-green))',
        },
        '.text-marker-orange': {
          'color': 'hsl(var(--marker-orange))',
        },
        '.bg-marker-blue': {
          'background-color': 'hsl(var(--marker-blue))',
        },
        '.bg-marker-red': {
          'background-color': 'hsl(var(--marker-red))',
        },
        '.bg-marker-green': {
          'background-color': 'hsl(var(--marker-green))',
        },
        '.bg-marker-orange': {
          'background-color': 'hsl(var(--marker-orange))',
        },
        '.border-3': {
          'border-width': '3px',
        },
        '.border-4': {
          'border-width': '4px',
        },
        '.blackboard-bg': {
          'background': 'radial-gradient(circle at 20% 80%, rgba(100, 255, 180, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(140, 200, 255, 0.03) 0%, transparent 50%), linear-gradient(135deg, rgb(20, 25, 35) 0%, rgb(28, 35, 47) 100%)',
        },
        '.chalk-text': {
          'font-family': '"Kalam", "Caveat", "Architects Daughter", cursive',
          'color': 'rgb(248, 252, 254)',
          'text-shadow': '0 0 10px rgba(100, 255, 180, 0.3)',
        },
        '.chalk-glow': {
          'filter': 'drop-shadow(0 0 8px rgba(100, 255, 180, 0.6))',
          'transition': 'filter 0.3s ease',
        },
        '.glass-effect': {
          'background': 'rgba(40, 48, 62, 0.1)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(248, 252, 254, 0.1)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;

export default config;