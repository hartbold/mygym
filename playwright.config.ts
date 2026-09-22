import { defineConfig, devices } from "@playwright/test";

// Només Chromium: és l'únic motor amb suport fiable de service workers a
// Playwright (WebKit té bugs oberts amb setOffline + SW — playwright#42775).
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:4173",
    serviceWorkers: "allow",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium-mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "pnpm preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
