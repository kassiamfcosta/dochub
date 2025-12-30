/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF4EA',
          100: '#FFE8D5',
          200: '#FFD1AC',
          300: '#FFB476',
          400: '#FF9540',
          500: '#EF7722',
          600: '#D9651A',
          700: '#B94F12',
          800: '#8F3D0E',
          900: '#6B2D0A',
          DEFAULT: '#EF7722',
        },
        secondary: {
          DEFAULT: '#FAA533',
          50: '#FFF6E6',
          100: '#FEECC8',
          200: '#FDDA91',
          300: '#FBC65A',
          400: '#F7B337',
          500: '#FAA533',
          600: '#E2912D',
          700: '#C67826',
          800: '#9B5C1E',
          900: '#734315',
        },
        accent: {
          DEFAULT: '#0BA6DF',
          50: '#E6F7FD',
          100: '#C8EEFB',
          200: '#91DDF7',
          300: '#5ACBF2',
          400: '#2FBBEC',
          500: '#0BA6DF',
          600: '#098EC0',
          700: '#08739B',
          800: '#065873',
          900: '#053F52',
        },
        brandGray: {
          DEFAULT: '#EBEBEB',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'large': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

