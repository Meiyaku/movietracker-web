/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'auth-bg-light': '#475D92',
        'auth-bg-dark': '#1E2037',
        'auth-btn-light': '#7D5260',
        'auth-btn-dark': '#9B6B7D',
        'watched-fill': '#A1DD70',
        'watched-border': '#799351',
        'want-fill': '#EE4E4E',
        'want-border': '#DF2E38',
        'star': '#FFD700',
      },
    },
  },
  plugins: [],
}
