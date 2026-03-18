import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f5efe4",
        ink: "#162025",
        accent: "#e76f51",
        mint: "#6ab187",
        sand: "#d8c3a5"
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 18px 45px rgba(22, 32, 37, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
