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
        sports: {
          dark: '#0a0a0f',
          darker: '#050508',
          card: '#12121a',
          border: '#1e1e2e',
        },
        neon: {
          green: '#00ff88',
          'green-dim': 'rgba(0, 255, 136, 0.1)',
          blue: '#00d4ff',
          purple: '#a855f7',
        },
        gold: {
          DEFAULT: '#ffd700',
          light: '#ffec8b',
          dark: '#b8860b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-lg': '0 0 40px rgba(0, 255, 136, 0.4)',
        'gold': '0 0 20px rgba(255, 215, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
