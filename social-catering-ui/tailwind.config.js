/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)'
      },
      minHeight: {
        'touch': '44px'
      },
      minWidth: {
        'touch': '44px'
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }]
      },
      fontFamily: {
        'manrope': ['Manrope', '-apple-system', 'Roboto', 'Helvetica', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        'button-action': '#3A869D',
        'font-primary': '#292826',
        'font-secondary': '#2F2C26',
        'primary-color': 'rgba(41, 40, 38, 0.5)',
        'neutral-white': '#FFF',
        'neutral-dark-gray': {
          100: '#F3F3F3',
          200: '#EAEAEA',
          300: '#DADADA',
        },
        'secondary-color': '#FEFDF9',
        'primary-green': {
          50: '#E7F4E6',
          100: '#C9E8C5',
          600: '#39982D',
        },
        'secondary-red': {
          50: '#FFEAEC',
          100: '#FFCACD',
          700: '#DC1515',
        },
        'secondary-yellow': {
          50: '#FFF3E0',
          100: '#FFE0B2',
          800: '#EF6C00',
        },
        'secondary-blue': {
          50: '#E4F2FF',
          100: '#BFDEFF',
          600: '#4784FF',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
