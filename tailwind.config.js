/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'legal-blue': '#1e40af',
        'legal-gold': '#d97706',
      },
    },
  },
  plugins: [],
}
