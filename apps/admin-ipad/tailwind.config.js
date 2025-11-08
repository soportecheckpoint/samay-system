/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/tablet-shared-ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Flexo', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
