/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#12101F",
        "background-elevated": "#1B1730",
        surface: "#1E1A34",
        "surface-alt": "#282247",
        border: "#332D54",
        primary: "#8B5CF6",
        "primary-muted": "#6D28D9",
        accent: "#EC4899",
        text: "#F5F3FF",
        muted: "#9C93C0",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#FB4570",
        live: "#FB4570",
      },
    },
  },
  plugins: [],
};
