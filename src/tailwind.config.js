/** @type {import('tailwindcss').Config} */
module.exports = {
  //content: ["./src/**/*.{html,js}"],
  content: ["./*.{html,js}"],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: ["night"],
  },
  plugins: [
    require("daisyui")
  ],
}

