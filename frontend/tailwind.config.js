/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FFF9E9',
        cream: '#FFFDF6',
        ink: '#292820',
        mustard: { DEFAULT: '#E7B84B', dark: '#C99A2E', deep: '#7A5A0C' },
        sage: { DEFAULT: '#A8B89A', deep: '#4F6143' },
        terracotta: { DEFAULT: '#D98B73', deep: '#9A4A33' },
        lavender: { DEFAULT: '#C9BCE8', deep: '#5E4D91' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(41,40,32,.05), 0 6px 18px -8px rgba(41,40,32,.10)',
        lift: '0 2px 4px rgba(41,40,32,.06), 0 16px 32px -14px rgba(41,40,32,.18)',
      },
    },
  },
  plugins: [],
}
