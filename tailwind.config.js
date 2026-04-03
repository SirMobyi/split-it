/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0B0915",
        surface: "#16142A",
        "surface-2": "#1E1B3A",
        "surface-3": "#2D2A4A",
        border: "#2A264F",
        "border-light": "#3D3770",
        "text-primary": "#FFFFFF",
        "text-secondary": "#94A3B8",
        "text-tertiary": "#64748B",
        accent: "#7C3AED",
        "accent-light": "#A78BFA",
        "accent-dim": "#4C1D95",
        danger: "#F87171",
        "danger-light": "#FCA5A5",
        "danger-dim": "#7F1D1D",
        warning: "#FBBF24",
        info: "#60A5FA",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "System"],
        medium: ["Inter_500Medium", "System"],
        semibold: ["Inter_600SemiBold", "System"],
        bold: ["Inter_700Bold", "System"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        xxl: "32px",
        card: "16px",
      },
    },
  },
  plugins: [],
};
