const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  testMatch: "**/*.spec.cjs",
});
