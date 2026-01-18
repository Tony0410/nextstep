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
        // Calm, healing palette
        primary: {
          50: '#f0f9f4',
          100: '#dcf1e4',
          200: '#bbe3cc',
          300: '#8dcda8',
          400: '#5bb17f',
          500: '#3a9563',
          600: '#2a784e',
          700: '#235f40',
          800: '#1f4c35',
          900: '#1b3f2d',
          950: '#0d2319',
        },
        secondary: {
          50: '#f5f7fa',
          100: '#ebeef3',
          200: '#d2dae5',
          300: '#aab9ce',
          400: '#7c93b3',
          500: '#5c769a',
          600: '#485e80',
          700: '#3b4d68',
          800: '#344257',
          900: '#2f3a4a',
          950: '#1f2631',
        },
        accent: {
          50: '#fef6ee',
          100: '#fdebd7',
          200: '#fad3ae',
          300: '#f6b37b',
          400: '#f18946',
          500: '#ed6b22',
          600: '#de5118',
          700: '#b83c16',
          800: '#93311a',
          900: '#772b18',
          950: '#40130b',
        },
        background: '#fafbfc',
        surface: '#ffffff',
        muted: '#f1f5f9',
        border: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Large text mode sizes
        'lg-base': '1.125rem',
        'lg-lg': '1.25rem',
        'lg-xl': '1.5rem',
        'lg-2xl': '1.875rem',
        'lg-3xl': '2.25rem',
      },
      spacing: {
        // Touch-friendly spacing
        'touch': '44px',
        'touch-lg': '56px',
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
export default config
