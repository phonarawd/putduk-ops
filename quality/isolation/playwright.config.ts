import { defineConfig } from "@playwright/test";

const origin = process.env.PUTDUK_OPS_PW_ORIGIN || "http://127.0.0.1:4177";

export default defineConfig({
  testDir: ".",
  testMatch: "admin-screens.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: origin,
    viewport: { width: 1280, height: 800 },
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
