/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        burgundy: '#7A1F2A',
        gold: '#C8A34D',
        accent: '#2563EB',
        canvas: '#F8FAFC',
        ink: '#2C2C2C',
        mute: '#666666',
        line: '#E5E7EB',
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
};
