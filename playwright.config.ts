import { defineConfig } from "@playwright/test";
const production = process.env.APP_MODE === "production";
const url = `http://127.0.0.1:${production ? 4173 : 5173}`;
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: url,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: production
      ? "npm start"
      : "npm run dev -- --port 5173 --strictPort",
    url,
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
