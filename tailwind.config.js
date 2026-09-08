/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FDE8F8",
          100: "#F7D0F1",
          200: "#F0A8E7",
          300: "#E27AF6",
          400: "#B75DFF",
          500: "#5B1FA3",
          600: "#431B83",
          700: "#2A0F52",
          800: "#18072D",
          900: "#0D0318"
        },
        accent: "#FF7A00",
        pink: "#FF3A7A"
      },
      boxShadow: {
        soft: "0 10px 35px rgba(91, 31, 163, .12)",
        glow: "0 12px 45px rgba(91, 31, 163, .18)"
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-7px)" } },
        shimmer: { "0%": { backgroundPosition: "-500px 0" }, "100%": { backgroundPosition: "500px 0" } }
      },
      animation: {
        float: "float 3.8s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite"
      }
    }
  },
  plugins: []
};
