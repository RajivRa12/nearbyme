/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B50E8',
          50:  '#F0EFFD',
          100: '#DDD9FB',
          200: '#BBB4F7',
          300: '#998EF3',
          400: '#7769EF',
          500: '#5B50E8',
          600: '#3D30D6',
          700: '#2E22B5',
          800: '#201891',
          900: '#150F6A',
          foreground: '#ffffff',
        },
        ink: {
          DEFAULT: '#0F0F14',
          secondary: '#3D3D4E',
          muted: '#7E7E96',
          subtle: '#B0B0C3',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#F7F7FB',
          overlay: '#F0F0F6',
          border: '#E8E8F0',
        },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7', dark: '#15803D' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#B45309' },
        danger:  { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#B91C1C' },
        gold:    { DEFAULT: '#F59E0B', light: '#FFF8E7' },
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
