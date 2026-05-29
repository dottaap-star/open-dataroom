import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,    // crisp at 2400×1260 native, downsampled to 1200×630
});
const page = await ctx.newPage();
await page.goto(`file://${path.resolve(".screenshots/og-template.html")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);  // give web fonts a beat to swap in
await page.screenshot({
  path: "examples/acme-capital/public/assets/branding/og.png",
  clip: { x: 0, y: 0, width: 1200, height: 630 },
});
await browser.close();
console.log("og.png written");
