import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'], 
        serif: ['var(--font-serif)', 'serif'],    
        mono: ['var(--font-mono)', 'monospace'],  
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // (Assuming you have this for the animate-in classes!)
};
export default config;