import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm Sanctuary - Primary: Soft sage green (healing, calm)
        primary: {
          50: '#f4f7f4',
          100: '#e3ebe3',
          200: '#c5d9c5',
          300: '#9bbf9b',
          400: '#729f72',
          500: '#528252',
          600: '#3f663f',
          700: '#345234',
          800: '#2b412b',
          900: '#243624',
          950: '#121f12',
        },
        // Warm neutrals - cream, stone, warm gray
        cream: {
          50: '#fdfcfa',
          100: '#faf7f2',
          200: '#f5efe6',
          300: '#ede3d5',
          400: '#e0d0bc',
          500: '#d4bfa3',
          600: '#c4a882',
          700: '#a88b65',
          800: '#8a7255',
          900: '#705d47',
          950: '#3d3226',
        },
        // Secondary: Warm stone gray (sophisticated, grounded)
        secondary: {
          50: '#f8f7f6',
          100: '#f0eeeb',
          200: '#e0dcd5',
          300: '#ccc6bb',
          400: '#b5ad9f',
          500: '#a09484',
          600: '#857a6d',
          700: '#6d6359',
          800: '#5a524a',
          900: '#4a443f',
          950: '#262320',
        },
        // Accent: Terracotta (warmth, energy, gentle urgency)
        accent: {
          50: '#fdf8f6',
          100: '#faeee9',
          200: '#f5dcd2',
          300: '#ecc0b0',
          400: '#e09b82',
          500: '#d67b58',
          600: '#c6603e',
          700: '#a54c30',
          800: '#88402b',
          900: '#703728',
          950: '#3d1a11',
        },
        // Alert red (emergency - softened)
        alert: {
          50: '#fdf5f4',
          100: '#fce8e6',
          200: '#f9d5d2',
          300: '#f4b7b1',
          400: '#ec8c85',
          500: '#e0635a',
          600: '#c9453d',
          700: '#a83832',
          800: '#8b322e',
          900: '#742f2c',
          950: '#3e1514',
        },
        // Semantic aliases
        background: '#faf7f2',
        surface: '#ffffff',
        muted: '#f0eeeb',
        border: '#e0dcd5',
      },
      fontFamily: {
        // Playfair Display for elegant headings
        display: ['Playfair Display', 'Georgia', 'serif'],
        // Source Sans 3 for warm, readable body text
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        // Large text mode sizes
        'lg-base': '1.125rem',
        'lg-lg': '1.25rem',
        'lg-xl': '1.5rem',
        'lg-2xl': '1.875rem',
        'lg-3xl': '2.25rem',
      },
      spacing: {
        // Touch-friendly spacing
        'touch': '48px',
        'touch-lg': '60px',
      },
      borderRadius: {
        'card': '20px',
        'card-lg': '28px',
        'button': '14px',
        'pill': '9999px',
      },
      boxShadow: {
        // Soft, warm shadows
        'card': '0 2px 8px -2px rgba(93, 82, 70, 0.06), 0 4px 16px -4px rgba(93, 82, 70, 0.04)',
        'card-hover': '0 8px 24px -4px rgba(93, 82, 70, 0.08), 0 4px 12px -2px rgba(93, 82, 70, 0.05)',
        'button': '0 1px 3px rgba(93, 82, 70, 0.08)',
        'button-hover': '0 4px 12px -2px rgba(93, 82, 70, 0.15)',
        'soft': '0 2px 16px rgba(93, 82, 70, 0.06)',
        'elevated': '0 8px 32px -4px rgba(93, 82, 70, 0.1)',
      },
      animation: {
        // Gentle, breathing animations
        'breathe': 'breathe 4s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        'sanctuary': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
export default config
