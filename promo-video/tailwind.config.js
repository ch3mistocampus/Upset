/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#B0443F",
        "corner-red": "#943538",
        "corner-blue": "#1E3A5F",
        dark: "#0D0D0D",
        "dark-surface": "#1A1A1A",
      },
      fontFamily: {
        display: ["BebasNeue", "Impact", "sans-serif"],
        body: ["system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
