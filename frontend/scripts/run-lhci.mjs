import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const env = { ...process.env };
if (!env.CHROME_PATH) {
  env.CHROME_PATH = chromium.executablePath();
}

const isWin = process.platform === "win32";
const res = spawnSync(
  isWin ? "npx.cmd" : "npx",
  ["lhci", "autorun"],
  {
    stdio: "inherit",
    env,
    shell: isWin,
  },
);

process.exit(res.status ?? 1);
