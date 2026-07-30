/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta da marca 3LG
        marca: {
          navy: "#071E3A",
          azul: "#2B83B7",
          laranja: "#F28A2B",
          ambar: "#FBA02C",
        },
      },
    },
  },
  plugins: [],
};
