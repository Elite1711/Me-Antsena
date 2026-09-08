/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF1F1",
          100: "#FBE0F9",
          200: "#E9B3FB",
          300: "#D58AF3",
          400: "#A94DEB",
          500: "#6F00FF",
          600: "#5F00DB",
          700: "#4F00B8",
          800: "#3B0270",
          900: "#270149"
        },
        accent: "#E9B3FB",
        pink: "#E9B3FB"
      },
      boxShadow: {
        soft: "0 10px 35px rgba(59, 2, 112, .10)",
        glow: "0 12px 45px rgba(111, 0, 255, .18)"
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
