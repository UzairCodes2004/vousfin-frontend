/** @type {import('tailwindcss').Config} */

/*
 * VousFin design tokens — "Nocturne Ledger"
 *
 * A private bank vault at midnight: deep moss-black canvas under an aurora
 * atmosphere, obsidian-gloss cards lit from above, ONE luminous jade accent
 * (green is money), champagne gold reserved for foil details and highlights.
 * Display type is Fraunces (serif); UI is Schibsted Grotesk; figures are
 * Spline Sans Mono.
 *
 * IMPORTANT: legacy token NAMES (navy, charcoal, cyan, emerald, glass…) are
 * kept so all existing code compiles — only their VALUES changed. Every usage
 * is semantic (text-primary on bg-navy, hairline borders, etc), so the whole
 * app retunes from this file + index.css.
 */

const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`

const ACCENT = {
  DEFAULT: withAlpha('--c-accent'),
  2: withAlpha('--c-accent2'),
  soft: 'rgb(var(--c-accent) / 0.12)',
}
const GOLD = {
  DEFAULT: withAlpha('--c-highlight'),
  2: withAlpha('--c-highlight'),
}

export default {
  content: ['./index.html', './public/**/*.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Surfaces (names fixed, values from CSS variables) ── */
        navy: {
          DEFAULT: withAlpha('--c-bg'), // page canvas
          2: withAlpha('--c-bg2'),      // card surface
        },
        charcoal: {
          DEFAULT: withAlpha('--c-bg3'), // elevated: sidebar, modals, sheets
        },

        /* ── Accent (legacy: cyan; semantic: accent) ── */
        cyan: ACCENT,
        accent: ACCENT,
        gold: GOLD,
        amber: {
          DEFAULT: withAlpha('--c-highlight'), // attention = theme highlight
          2: withAlpha('--c-highlight'),
        },

        /* ── Money semantics ── */
        emerald: {
          DEFAULT: withAlpha('--c-positive'),
          2: withAlpha('--c-accent2'),
          3: withAlpha('--chart-profit'),
        },
        positive: { DEFAULT: withAlpha('--c-positive'), muted: 'rgb(var(--c-positive) / 0.10)' },
        negative: { DEFAULT: withAlpha('--c-negative'), muted: 'rgb(var(--c-negative) / 0.10)' },

        /* ── Text hierarchy ── */
        text: {
          primary: withAlpha('--c-text'),
          secondary: withAlpha('--c-text2'),
          muted: withAlpha('--c-text3'),
        },

        /* ── Legacy ramp (mapped to accent family) ── */
        brand: {
          50: withAlpha('--c-accent'), 100: withAlpha('--c-accent'), 200: withAlpha('--c-accent'),
          300: withAlpha('--c-accent'), 400: withAlpha('--c-accent2'), 500: withAlpha('--c-accent2'),
          600: withAlpha('--c-accent'), 700: withAlpha('--c-accent2'), 800: withAlpha('--c-accent2'),
          900: withAlpha('--c-accent2'), 950: withAlpha('--c-bg'),
        },
        surface: {
          DEFAULT: withAlpha('--c-bg2'),
          muted: withAlpha('--c-bg'),
          border: 'var(--c-border)',
        },
      },

      fontFamily: {
        sans: ['Schibsted Grotesk', 'IBM Plex Sans', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        mono: ['Spline Sans Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },

      /* ── Elevation — deep night shadows + jade/gold bloom ── */
      boxShadow: {
        card: 'inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 10px 30px -14px rgba(0, 0, 0, 0.55)',
        elevated: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 24px 60px -24px rgba(0, 0, 0, 0.75)',
        'glow-cyan': '0 0 0 1px rgb(var(--c-accent) / 0.18), 0 8px 28px -10px rgb(var(--c-accent) / 0.35)',
        'glow-em': '0 0 0 1px rgb(var(--c-accent) / 0.18), 0 8px 28px -10px rgb(var(--c-accent) / 0.35)',
      },

      /* Hairlines — theme variables */
      borderColor: {
        glass: 'var(--c-border)',
        'glass-2': 'var(--c-border2)',
      },
      backgroundColor: {
        'glass-panel': 'var(--glass-panel)',
        'glass-hover': 'var(--glass-hover)',
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
      },
    },
  },
  plugins: [],
}
