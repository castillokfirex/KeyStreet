import { defineConfig, devices } from "@playwright/test";

const CHROMIUM_ARGS = [
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "--ignore-certificate-errors",
];

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "https://localhost",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    launchOptions: {
      args: CHROMIUM_ARGS,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "Pixel 7",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
