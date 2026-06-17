/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        workspace: '#ffffff',
        sidebar: '#f0f9ff', // light blue
        accent: '#0ea5e9',  // sky-500
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
