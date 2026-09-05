/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          sage: {
            light: '#F0F6F2',
            DEFAULT: '#D5E5DA',
            medium: '#9EC2A8',
            dark: '#4D7A5C',
          },
          butter: {
            light: '#FFFDF5',
            DEFAULT: '#FEF6D8',
            medium: '#FDE087',
            dark: '#B45309',
          },
          lavender: {
            light: '#F8F4FD',
            DEFAULT: '#EDE2FA',
            medium: '#D4B8F5',
            dark: '#7E3AF2',
          },
          rose: {
            light: '#FDF5F7',
            DEFAULT: '#FCE7EE',
            medium: '#F8B4CB',
            dark: '#C026D3',
          },
          peach: {
            light: '#FFF5F0',
            DEFAULT: '#FEE5D8',
            medium: '#FDBA99',
            dark: '#DD6B20',
          },
          sky: {
            light: '#F2F7FD',
            DEFAULT: '#DBEAFE',
            medium: '#93C5FD',
            dark: '#2563EB',
          },
          cream: {
            50: '#FDFBF7',
            100: '#F9F6F0',
            200: '#F2ECE1',
            300: '#E8DED1',
            DEFAULT: '#F9F6F0',
          },
          sand: '#ECE5DB',
          charcoal: '#23272F',
          muted: '#6B7280',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(140, 150, 165, 0.12), 0 2px 6px -1px rgba(140, 150, 165, 0.06)',
        'soft-lg': '0 10px 30px -4px rgba(140, 150, 165, 0.15), 0 4px 10px -2px rgba(140, 150, 165, 0.08)',
        'pastel': '0 8px 24px -4px rgba(220, 200, 230, 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
};
