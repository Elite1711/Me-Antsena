/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Café au lait (clair) → café noir (sombre) : une seule rampe brune,
        // les surfaces de page/carte changent séparément via les classes dark:.
        brand: {
          50: "#FBF6EF",
          100: "#F0E4D4",
          200: "#E2CBAE",
          300: "#C9A47A",
          400: "#A9714A",
          500: "#7A4B28",
          600: "#5C3A21",
          700: "#3E2A1C",
          800: "#2A1B12",
          900: "#1A110B"
        },
        accent: "#A9714A",
        pink: "#C9A47A"
      },
      boxShadow: {
        soft: "0 10px 35px rgba(90, 58, 33, .12)",
        glow: "0 12px 45px rgba(90, 58, 33, .18)"
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
