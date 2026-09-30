/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEEDFE', 100: '#D5D3FC', 200: '#ABA8F9',
          300: '#817CF6', 400: '#5751F3', 500: '#534AB7',
          600: '#3C3489', 700: '#2A255E', 800: '#1A1638', 900: '#0D0B1C',
        },
      },
    },
  },
  plugins: [],
}
