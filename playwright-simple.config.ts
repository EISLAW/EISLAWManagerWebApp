import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./frontend/tests",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  reporter: [["list"]],
})
