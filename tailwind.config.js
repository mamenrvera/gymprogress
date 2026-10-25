/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'rgb(var(--c-app) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--c-accent-strong) / <alpha-value>)',
        ink: {
          950: '#07090d',
          900: '#0b0e14',
          850: '#0f131b',
          800: '#141923',
          750: '#1a202d',
          700: '#222938',
          600: '#2e3749',
          500: '#465268',
          400: '#6b778d',
          300: '#98a3b6',
          200: '#c3cbd8',
          100: '#e6eaf0',
        },
        lime: {
          300: '#d9f99d',
          400: '#bef264',
          500: '#a3e635',
          600: '#84cc16',
        },
        protein: '#38bdf8',
        fat: '#fbbf24',
        carbs: '#c084fc',
        danger: '#fb7185',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'Inter Variable', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -12px rgba(190, 242, 100, 0.35)',
        card: '0 18px 40px -24px rgba(0, 0, 0, 0.75)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
