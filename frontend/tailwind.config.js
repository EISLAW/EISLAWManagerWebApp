/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        petrol: "#0B3B5A",
        petrolHover: "#124C75",
        petrolActive: "#092B40",
        copper: "#D07655",
        success: "#33B27F",
        warning: "#F5A623",
        bg: "#F3F4F6",
        cardGrey: "#F7F8FA",
        offblack: "#1F2733"
      },
      borderRadius: {
        '2xl': '1rem'
      }
    },
  },
  plugins: [],
}
