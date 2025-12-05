export default {
  testDir: ".",
  testMatch: "*.spec.mjs",
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  reporter: [["list"]],
};
