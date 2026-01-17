/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        nook: {
          50: '#f0fff4',
          100: '#f0f9f4',
          200: '#d1efe0',
          300: '#a3dfc1',
          400: '#75cfa2',
          500: '#47bf83',
          600: '#17B169',
          700: '#149b5c',
          800: '#11864f',
          900: '#17B169',
        },
        brand: {
          green: '#17B169',
          red: '#FF3131',
        },
      },
    },
  },
  plugins: [],
}