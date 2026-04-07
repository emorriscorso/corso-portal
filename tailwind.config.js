/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        corso: {
          dark: '#211F20',    // Negro cálido
          cream: '#EDE9E0',   // Crema
          darkHover: '#2A2826', // Ligeramente más claro
          subtle: '#5A5A5A',  // Gris para texto secundario
        },
      },
      fontFamily: {
        cormorant: ['Lato', 'sans-serif'],
        inter: ['Lato', 'sans-serif'],
      },
      letterSpacing: {
        wide: '0.15em',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
