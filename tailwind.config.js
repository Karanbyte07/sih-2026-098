/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: '#0B1829',
        panel: '#0F2035',
        card: '#132538',
        'card-elevated': '#162E46',
        accent: '#38BDF8',
        'accent-dim': '#0EA5E9',
        'accent-muted': 'rgba(56,189,248,0.12)',
        teal: '#2DD4BF',
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted': '#475569',
        'status-green': '#22C55E',
        'status-amber': '#F59E0B',
        'status-red': '#EF4444',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
        strong: 'rgba(255,255,255,0.12)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4)',
        accent: '0 4px 16px rgba(56,189,248,0.2)',
        panel: '0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
