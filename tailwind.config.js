/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Ice blue and electric blue, paired with a deep navy dark theme.
        brand: {
          50: "#F2F9FF",
          100: "#E3F2FF",
          200: "#C5E4FF",
          300: "#8CCBFF",
          400: "#48AFFF",
          500: "#087FF5",
          600: "#0767D2",
          700: "#0B50A4",
          800: "#0B3976",
          900: "#092951"
        },
        night: {
          canvas: "#03132E",
          surface: "#06204A",
          raised: "#092B60"
        },
        sage: {
          50: "#F0FAFF",
          100: "#DFF5FF",
          200: "#B9EBFF",
          300: "#7AD9FF",
          400: "#43C6FF",
          500: "#1CAEF0",
          600: "#0C8FD3",
          700: "#0872AA",
          800: "#095984",
          900: "#0A3D5D"
        },
        gold: {
          50: "#F0FAFF",
          100: "#DFF5FF",
          200: "#B9EBFF",
          300: "#7AD9FF",
          400: "#43C6FF",
          500: "#168CFF",
          600: "#0870DF",
          700: "#0755AE",
          800: "#0A3B73",
          900: "#092A50"
        },
        emerald: {
          50: "#F0FAFF",
          100: "#DFF5FF",
          200: "#B9EBFF",
          300: "#7AD9FF",
          400: "#43C6FF",
          500: "#1CAEF0",
          600: "#0C8FD3",
          700: "#0872AA",
          800: "#095984",
          900: "#0A3D5D"
        },
        orange: {
          50: "#F0FAFF",
          100: "#DFF5FF",
          200: "#B9EBFF",
          300: "#7AD9FF",
          400: "#43C6FF",
          500: "#168CFF",
          600: "#0870DF",
          700: "#0755AE",
          800: "#0A3B73",
          900: "#092A50"
        },
        accent: "#168CFF",
        pink: "#22B8F0"
      },
      boxShadow: {
        soft: "0 12px 36px rgba(8, 74, 145, .10)",
        glow: "0 14px 45px rgba(22, 140, 255, .24)"
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(30px) scale(.97)" }, "100%": { opacity: "1", transform: "translateY(0) scale(1)" } },
        gradientPan: { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        shimmer: { "0%": { backgroundPosition: "-500px 0" }, "100%": { backgroundPosition: "500px 0" } }
      },
      animation: {
        float: "float 2.8s ease-in-out infinite",
        "fade-up": "fadeUp .85s cubic-bezier(.2,.7,.2,1) both",
        "gradient-pan": "gradientPan 18s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite"
      }
    }
  },
  plugins: []
};
