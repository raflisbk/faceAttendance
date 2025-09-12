import plugin from "tailwindcss/plugin";

export const blackboardPlugin = plugin(function({ addUtilities }) {
  const newUtilities = {
    ".text-shadow-chalk": {
      textShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
    },
    ".text-shadow-glow": {
      textShadow: "0 0 10px currentColor",
    },
    ".blackboard-bg": {
      backgroundColor: "#1a1a1a",
      backgroundImage: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.05) 0%, transparent 50%)
      `,
    },
    ".chalk-text": {
      color: "#f5f5f5",
      textShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
      fontFamily: "Kalam, cursive",
    },
    ".eraser-effect": {
      position: "relative",
      "&::before": {
        content: '""',
        position: "absolute",
        top: "-2px",
        left: "-2px",
        right: "-2px",
        bottom: "-2px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "4px",
        opacity: "0",
        transition: "opacity 0.3s ease",
      },
      "&:hover::before": {
        opacity: "1",
      },
    },
    ".animate-spin": {
      animation: "spin 1s linear infinite",
    },
    ".animate-pulse": {
      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    },
    ".animate-bounce": {
      animation: "bounce 1s infinite",
    },
    ".animate-fade-in": {
      animation: "fadeIn 0.5s ease-in-out",
    },
  };
  
  addUtilities(newUtilities);
}, {
  theme: {
    extend: {
      keyframes: {
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        pulse: {
          "50%": { opacity: "0.5" },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-25%)",
            animationTimingFunction: "cubic-bezier(0.8,0,1,1)",
          },
          "50%": {
            transform: "none",
            animationTimingFunction: "cubic-bezier(0,0,0.2,1)",
          },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
});