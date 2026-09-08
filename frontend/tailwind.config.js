/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#1B2B29',
        canvas: '#F6F8F7',
        surface: '#FFFFFF',
        line: '#DCE3E0',
        muted: '#5B6E69',
        clinical: {
          50: '#EEF5F3',
          100: '#D7E7E2',
          300: '#8FBAAF',
          500: '#2F6F62',
          600: '#255A50',
          700: '#1C453D',
        },
        alert: '#B3261E',
        warn: '#A6752C',
      },
    },
  },
  plugins: [],
};
