/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
        shpDisplay: ['"Playfair Display"', 'Georgia', 'serif'],
        shpSans: ['Inter', '"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      colors: {
        shp: {
          burgundy: '#7B1113',
          navy: '#0F2747',
          gold: '#D4AF37',
          cream: '#F7F3EB',
        },
      },
    },
  },
  plugins: [],
};
