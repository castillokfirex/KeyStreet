#!/usr/bin/env node
/**
 * Genera las capturas del README en docs/screenshots/ con Playwright.
 * Requiere la app corriendo (por defecto https://localhost, o QA_BASE_URL).
 *
 *   QA_BASE_URL=http://localhost:5174 node scripts/take-screenshots.mjs
 *
 * Se ejecuta desde la raíz del repo; usa el Playwright de frontend/node_modules.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("frontend", "package.json"));
const { chromium } = require("@playwright/test");

const BASE = process.env.QA_BASE_URL ?? "https://localhost";
const OUT = path.resolve("docs", "screenshots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--ignore-certificate-errors"],
});

async function settle(page) {
  await page.evaluate(async () => {
    for (const y of [500, 1000, 1500, 2000, 0]) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 350));
    }
  });
  await page.waitForTimeout(900);
}

// ---- Escritorio 1440 ----
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
const page = await desktop.newPage();

await page.goto(`${BASE}/`);
await page.waitForSelector('[data-testid^="product-card-"]');
await settle(page);
await page.screenshot({ path: path.join(OUT, "01-inicio.png") });

await page.goto(`${BASE}/catalogo`);
await page.waitForSelector('[data-testid^="product-card-"]');
await settle(page);
await page.evaluate(() => window.scrollTo(0, 360));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "02-catalogo.png") });

await page.goto(`${BASE}/producto/adidas-stan-smith`);
await page.waitForSelector("h1");
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, "03-detalle.png") });

await page.goto(`${BASE}/catalogo`);
await page.waitForSelector('[data-testid^="product-card-"]');
await page.getByTestId("kast-fab").click();
await page.waitForTimeout(900);
await page.getByLabel("Escribe tu pregunta para Kast").fill("¿El Adidas Samba OG tiene horma estrecha?");
await page.getByRole("button", { name: /Enviar pregunta a Kast/i }).click();
await page.getByTestId("citation-list").first().waitFor({ timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, "04-asistente-kast.png") });
await desktop.close();

// ---- Móvil 390 ----
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
const m = await mobile.newPage();
await m.goto(`${BASE}/catalogo`);
await m.waitForSelector('[data-testid^="product-card-"]');
await settle(m);
await m.evaluate(() => window.scrollTo(0, 120));
await m.waitForTimeout(500);
await m.screenshot({ path: path.join(OUT, "05-catalogo-movil.png") });
await mobile.close();

await browser.close();
console.log("Capturas en", OUT);
