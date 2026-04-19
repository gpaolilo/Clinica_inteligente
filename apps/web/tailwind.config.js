/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Urbanist', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        neon: '#D4FF59',       // Neon Lime da referência
        dark: '#1A1A1A',       // Texto quase preto/slate profudo
        surface: '#FFFFFF',    // Branco puro dos cartões
        background: '#F8F9FA'  // Fundo cinza ultralight
      }
    },
  },
  plugins: [],
}
