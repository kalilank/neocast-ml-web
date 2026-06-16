/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        magnetik: ['Magnetik', 'sans-serif'],
        inter: ['Inter', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        space: {
          900: '#02070C',
          800: '#1a3a5c',
        },
        accent: {
          blue: '#2B9FFF',
          red: '#F45C82',
          teal: '#5DCAA5',
        }
      }
    },
  },
  plugins: [],
}
